import os
import re
import json
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

from google import genai
from google.genai import types

from extraction_schemas import (
    FieldEvidenceItem,
    DocumentClassificationResult,
    DossierExtractionResult,
    CrossDocDiscrepancy,
    CrossDocumentAssistanceResponse,
    FindingExplanationResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
)

logger = logging.getLogger("gemini_service")
logging.basicConfig(level=logging.INFO)


def _load_env_file():
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v


_load_env_file()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
FALLBACK_MODELS = [DEFAULT_MODEL, "gemini-3.8-flash"]

# Content-based in-memory cache keyed by "sha256:task:model"
_CONTENT_CACHE: Dict[str, Any] = {}


class GeminiService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", GEMINI_API_KEY)
        self.model = model or DEFAULT_MODEL
        self._client: Optional[genai.Client] = None
        if self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai Client: {e}")

    @property
    def is_available(self) -> bool:
        return bool(self._client and self.api_key)

    def _call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        """
        Executes a Gemini generation call requesting structured JSON with bounded fallback models.
        """
        if not self.is_available:
            return None

        models_to_try = [self.model]
        for m in FALLBACK_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        for m in models_to_try:
            try:
                config = types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                )
                if system_instruction:
                    config.system_instruction = system_instruction

                response = self._client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=config,
                )
                if response and response.text:
                    text = response.text.strip()
                    # Strip any markdown code fences if present
                    if text.startswith("```"):
                        text = re.sub(r"^```(?:json)?\s*", "", text)
                        text = re.sub(r"\s*```$", "", text)
                    return json.loads(text)
            except Exception as err:
                logger.warning(f"Gemini call to model '{m}' failed: {err}")
                continue

        return None

    def classify_document(
        self,
        text: str,
        filename: str,
        sha256_hash: str = ""
    ) -> DocumentClassificationResult:
        """
        Task A: Document Classification.
        Determines category:
        APPLICATION_FORM, LAND_OWNERSHIP_CERTIFICATE, BUILDING_PLAN_APPROVAL,
        FIRE_SAFETY_NOC, BANK_FDR_CORPUS_RECEIPT, TRUST_SOCIETY_DEED,
        NON_JUDICIAL_AFFIDAVIT, PREVIOUS_EOA_LETTER, FACULTY_COMPLIANCE_ROSTER,
        ACCREDITATION_CERTIFICATE, OTHER_SUPPORTING, UNKNOWN_UNCLASSIFIED.
        """
        cache_key = f"{sha256_hash}:classify:{self.model}" if sha256_hash else ""
        if cache_key and cache_key in _CONTENT_CACHE:
            return DocumentClassificationResult(**_CONTENT_CACHE[cache_key])

        # Heuristic pre-check for fast classification or fallback
        lower_text = (text + " " + filename).lower()
        
        system_instruction = (
            "You are an AI document verification specialist for institutional accreditation and approvals (AICTE norms). "
            "Examine the document text and filename to classify it into exactly one of the allowed categories: "
            "APPLICATION_FORM, LAND_OWNERSHIP_CERTIFICATE, BUILDING_PLAN_APPROVAL, FIRE_SAFETY_NOC, "
            "BANK_FDR_CORPUS_RECEIPT, TRUST_SOCIETY_DEED, NON_JUDICIAL_AFFIDAVIT, PREVIOUS_EOA_LETTER, "
            "FACULTY_COMPLIANCE_ROSTER, ACCREDITATION_CERTIFICATE, OTHER_SUPPORTING, UNKNOWN_UNCLASSIFIED. "
            "Return valid JSON matching: {\"category\": \"...\", \"confidence\": float (0.0-1.0), "
            "\"review_status\": \"CONFIRMED\" or \"AMBIGUOUS_MANUAL_REVIEW\", \"rationale\": \"...\"}"
        )

        prompt = (
            f"Filename: {filename}\n\n"
            f"Document Text Sample (first 2500 characters):\n{text[:2500]}\n\n"
            "Classify this document according to statutory regulatory categories."
        )

        json_data = self._call_gemini_json(prompt, system_instruction)
        if json_data and "category" in json_data:
            try:
                result = DocumentClassificationResult(**json_data)
                if cache_key:
                    _CONTENT_CACHE[cache_key] = result.model_dump()
                return result
            except Exception as e:
                logger.warning(f"Failed to parse Gemini classification JSON: {e}")

        # Deterministic regex fallback if Gemini is offline or inconclusive
        cat = "OTHER_SUPPORTING"
        conf = 0.85
        rationale = "Categorized via deterministic keyword and pattern matching."

        if any(w in lower_text for w in ["fire", "fire safety", "noc", "fire and rescue"]):
            cat = "FIRE_SAFETY_NOC"
        elif any(w in lower_text for w in ["khasra", "khatauni", "patta", "land record", "deed of conveyance", "registry"]):
            cat = "LAND_OWNERSHIP_CERTIFICATE"
        elif any(w in lower_text for w in ["building plan", "sanction plan", "approval of building", "fsi", "built up area"]):
            cat = "BUILDING_PLAN_APPROVAL"
        elif any(w in lower_text for w in ["fixed deposit", "fdr", "corpus fund", "bank guarantee", "escrow"]):
            cat = "BANK_FDR_CORPUS_RECEIPT"
        elif any(w in lower_text for w in ["trust deed", "society registration", "memorandum of association"]):
            cat = "TRUST_SOCIETY_DEED"
        elif any(w in lower_text for w in ["affidavit", "non-judicial stamp", "oath", "notary"]):
            cat = "NON_JUDICIAL_AFFIDAVIT"
        elif any(w in lower_text for w in ["invoice", "receipt_bill", "catering", "resume"]):
            cat = "UNKNOWN_UNCLASSIFIED"
            conf = 0.3
            rationale = "Non-institutional invoice or unrelated document detected."
        elif "application" in lower_text or "application form" in lower_text:
            cat = "APPLICATION_FORM"

        review_status = "CONFIRMED" if conf >= 0.75 else "AMBIGUOUS_MANUAL_REVIEW"
        fallback_result = DocumentClassificationResult(
            category=cat,  # type: ignore
            confidence=conf,
            review_status=review_status,
            rationale=rationale,
        )
        if cache_key:
            _CONTENT_CACHE[cache_key] = fallback_result.model_dump()
        return fallback_result

    def extract_structured_fields(
        self,
        text: str,
        category: str,
        filename: str,
        sha256_hash: str = ""
    ) -> DossierExtractionResult:
        """
        Task B: Structured Information Extraction.
        Extracts relevant fields according to the document's category:
        institution_name, trust_name, reference_number, issue_date, expiry_date,
        land_area, corpus_fund_inr, survey_numbers.
        Distinguishes missing fields from extracted ones (value=None, status="not_found").
        """
        cache_key = f"{sha256_hash}:extract:{category}:{self.model}" if sha256_hash else ""
        if cache_key and cache_key in _CONTENT_CACHE:
            return DossierExtractionResult(**_CONTENT_CACHE[cache_key])

        system_instruction = (
            "You are an AI document extraction assistant for institutional regulatory scrutiny. "
            "Extract required structured fields from the provided text according to statutory norms. "
            "Crucial Rule: Do NOT invent or hallucinate values. If a field cannot be found in the text, "
            "you MUST set its 'value' to null, 'evidence' to null, and 'status' to 'not_found'. "
            "For extracted fields, set 'status' to 'extracted' and provide the direct quote/phrase as 'evidence'. "
            "Fields: institution_name, trust_name, reference_number, issue_date (YYYY-MM-DD if parseable), "
            "expiry_date (YYYY-MM-DD if parseable), land_area (float/string), land_area_unit (Acres/Hectares/Sq.Meters), "
            "survey_numbers (array of strings), corpus_fund_inr (numeric amount). "
            "Return valid JSON matching the DossierExtractionResult schema."
        )

        prompt = (
            f"Category: {category}\n"
            f"Filename: {filename}\n\n"
            f"Document Text:\n{text[:4000]}\n\n"
            "Extract the structured fields with supporting evidence."
        )

        json_data = self._call_gemini_json(prompt, system_instruction)
        if json_data:
            try:
                json_data["document_type"] = category
                result = DossierExtractionResult(**json_data)
                if cache_key:
                    _CONTENT_CACHE[cache_key] = result.model_dump()
                return result
            except Exception as e:
                logger.warning(f"Failed to parse Gemini extraction JSON: {e}")

        # Deterministic regex fallback
        inst_match = re.search(r"(?:Institute|College|Academy|University)\s+of\s+[\w\s]+", text, re.IGNORECASE)
        inst_name = inst_match.group(0).strip() if inst_match else None

        ref_match = re.search(r"(?:Ref(?:erence)?\s*(?:No\.?|Number)?|NOC\s*No\.?|F\.No\.?)\s*[:\-]?\s*([A-Za-z0-9/\-_]{4,30})", text, re.IGNORECASE)
        ref_num = ref_match.group(1).strip() if ref_match else None

        date_match = re.search(r"\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b", text)
        date_val = date_match.group(1).strip() if date_match else None

        area_match = re.search(r"(\d+(?:\.\d+)?)\s*(Acres?|Hectares?|Sq\.?\s*Meters?)", text, re.IGNORECASE)
        area_val = area_match.group(1) if area_match else None
        area_unit = area_match.group(2) if area_match else None

        survey_matches = re.findall(r"(?:Survey|Khasra|Plot)\s*(?:No\.?)?\s*[:\-]?\s*([0-9]+(?:/[0-9A-Za-z\-]+)?)", text, re.IGNORECASE)

        fallback_result = DossierExtractionResult(
            document_type=category,
            institution_name=FieldEvidenceItem(
                value=inst_name,
                evidence=inst_match.group(0) if inst_match else None,
                status="extracted" if inst_name else "not_found",
                confidence=0.88 if inst_name else 0.0,
            ),
            reference_number=FieldEvidenceItem(
                value=ref_num,
                evidence=ref_match.group(0) if ref_match else None,
                status="extracted" if ref_num else "not_found",
                confidence=0.85 if ref_num else 0.0,
            ),
            issue_date=FieldEvidenceItem(
                value=date_val,
                evidence=date_match.group(0) if date_match else None,
                status="extracted" if date_val else "not_found",
                confidence=0.8 if date_val else 0.0,
            ),
            land_area=FieldEvidenceItem(
                value=area_val,
                evidence=area_match.group(0) if area_match else None,
                status="extracted" if area_val else "not_found",
                confidence=0.85 if area_val else 0.0,
            ),
            land_area_unit=FieldEvidenceItem(
                value=area_unit,
                evidence=area_match.group(0) if area_match else None,
                status="extracted" if area_unit else "not_found",
                confidence=0.85 if area_unit else 0.0,
            ),
            survey_numbers=list(set(survey_matches)) if survey_matches else [],
        )
        if cache_key:
            _CONTENT_CACHE[cache_key] = fallback_result.model_dump()
        return fallback_result

    def analyze_cross_document(
        self,
        declared_data: Dict[str, Any],
        extracted_docs: List[Dict[str, Any]]
    ) -> CrossDocumentAssistanceResponse:
        """
        Task C: Cross-Document Comparison Assistance.
        Normalizes extracted text and identifies possible discrepancies between
        application form declarations and supporting annexures.
        """
        system_instruction = (
            "You are a regulatory concordance analyzer. Compare application declarations against "
            "extracted annexure documents. Identify any discrepancies in Institution Legal Name, "
            "Trust Name, Land Area, or Plot Survey Numbers. "
            "Differentiate minor formatting variants from substantial mismatches. "
            "Return valid JSON matching the CrossDocumentAssistanceResponse schema."
        )

        prompt = (
            f"Declared Application Data:\n{json.dumps(declared_data, indent=2)}\n\n"
            f"Extracted Documents:\n{json.dumps(extracted_docs, indent=2)}\n\n"
            "Analyze cross-document consistency and provide normalized comparison rows."
        )

        json_data = self._call_gemini_json(prompt, system_instruction)
        if json_data:
            try:
                return CrossDocumentAssistanceResponse(**json_data)
            except Exception as e:
                logger.warning(f"Failed to parse cross-document Gemini response: {e}")

        # Deterministic concordance fallback
        declared_inst = declared_data.get("declaredInstitutionName") or declared_data.get("institutionName", "")
        discrepancies: List[CrossDocDiscrepancy] = []

        for doc in extracted_docs:
            doc_id = doc.get("id", "")
            doc_name = doc.get("originalFilename") or doc.get("filename", "")
            fields = doc.get("extractedFields", {})

            ext_inst = fields.get("institution_name", {}).get("value")
            if ext_inst:
                ext_clean = re.sub(r"[^\w\s]", "", str(ext_inst)).strip().lower()
                decl_clean = re.sub(r"[^\w\s]", "", str(declared_inst)).strip().lower()
                if ext_clean == decl_clean:
                    match_st = "MATCH"
                    note = "Exact character-level concordance across official documents."
                elif ext_clean in decl_clean or decl_clean in ext_clean:
                    match_st = "FUZZY_WARNING"
                    note = "Sub-string phonetic or abbreviated naming variant detected."
                else:
                    match_st = "MISMATCH_SUSPECTED"
                    note = f"Extracted '{ext_inst}' conflicts with declared '{declared_inst}'."

                discrepancies.append(CrossDocDiscrepancy(
                    field_key="institutionName",
                    field_label="Institution Legal Name",
                    declared_value=str(declared_inst),
                    extracted_value=str(ext_inst),
                    document_id=doc_id,
                    document_name=doc_name,
                    match_status=match_st,  # type: ignore
                    reviewer_note=note,
                ))

        return CrossDocumentAssistanceResponse(
            discrepancies=discrepancies,
            summary=f"Evaluated {len(discrepancies)} cross-document identity checks deterministically.",
        )

    def explain_finding(self, finding: Dict[str, Any]) -> FindingExplanationResponse:
        """
        Task D: Reviewer Explanations in Plain Language.
        Generates grounded, non-hallucinatory explanations based strictly on recorded evidence.
        """
        rule_id = finding.get("rule_id") or finding.get("ruleId", "RULE-GENERAL")
        rule_title = finding.get("rule_title") or finding.get("ruleTitle", "")
        outcome = finding.get("outcome", "INCONCLUSIVE")
        msg = finding.get("message", "")
        details = finding.get("details", {})

        system_instruction = (
            "You are a regulatory compliance explanation assistant. Explain compliance findings "
            "to human scrutiny officers in clear, neutral, professional language. "
            "Base your explanation strictly on the recorded evidence. Do NOT invent legal penalties "
            "or claim external verification with authorities unless documented in the finding details. "
            "Return valid JSON matching: {\"rule_id\": \"...\", \"plain_language_explanation\": \"...\", "
            "\"evidence_basis\": \"...\", \"recommended_reviewer_action\": \"...\"}"
        )

        prompt = (
            f"Rule ID: {rule_id}\n"
            f"Rule Title: {rule_title}\n"
            f"Outcome: {outcome}\n"
            f"Message: {msg}\n"
            f"Details: {json.dumps(details, indent=2)}\n\n"
            "Provide a plain-language explanation and actionable recommendation for the reviewing officer."
        )

        json_data = self._call_gemini_json(prompt, system_instruction)
        if json_data:
            try:
                json_data["rule_id"] = rule_id
                return FindingExplanationResponse(**json_data)
            except Exception as e:
                logger.warning(f"Failed to parse explanation JSON: {e}")

        # Deterministic explanation fallback
        action = "Review the original annexure document against statutory guidelines."
        if outcome == "FAIL":
            action = "Issue a deficiency notice or request supplementary attested documentation."
        elif outcome == "WARNING":
            action = "Perform manual cross-verification of document stamps and dates."

        return FindingExplanationResponse(
            rule_id=rule_id,
            plain_language_explanation=f"{rule_title}: {msg}. Outcome is recorded as {outcome}.",
            evidence_basis=f"Derived from rule evaluation details: {json.dumps(details)}",
            recommended_reviewer_action=action,
        )

    def chat_completion(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> ChatResponse:
        """
        Interactive conversational assistance for AICTE APH 2024–27 regulatory scrutiny,
        institutional document validation, audit ledger inspection, and ARC-Verify navigation.
        """
        context = context or {}
        user_role = context.get("user_role", "SCRUTINY_OFFICER")
        case_id = context.get("case_id", "")
        case_title = context.get("case_title", "")
        case_status = context.get("case_status", "")
        current_page = context.get("current_page", "")

        system_instruction = (
            "You are the ARC-Verify AI Assistant, an intelligent co-pilot for AICTE Approval Scrutiny "
            "and Regulatory Verification (Smart India Hackathon 2026, Problem Statement 26261).\n"
            "Your role is to assist scrutiny officers, compliance auditors, applicants, and administrators "
            "with navigating the application, understanding AICTE Approval Process Handbook (APH 2024–27) standards, "
            "interpreting verification findings, verifying audit ledger integrity, and resolving document discrepancies.\n\n"
            "Core Regulatory Knowledge:\n"
            "1. Land Norms: AICTE APH Chapter I/II requirements for Mega/Metro (minimum 1.5–2.5 acres depending on program), "
            "   Urban (2.5–4.0 acres), and Rural/Other areas (typically 7.5–10 acres). Land must be contiguous with clear ownership deed, "
            "   non-agricultural conversion, and valid Khasra/survey records without encumbrance.\n"
            "2. Faculty-Student Ratio (FSR): 1:15 or 1:20 depending on discipline (e.g., Engineering & Technology UG typically 1:20 with cadred ratio 1:2:6). "
            "   Requires roster verification with attested qualifications, Aadhaar-seeded service records, and Form 16/EPF records.\n"
            "3. Fire Safety NOC: Mandatory statutory NOC from state/district fire authorities with current validity period, "
            "   covering building height, setbacks, escape stairways, and firefighting installations.\n"
            "4. Building Plan Approval: Approved by Municipal Corporation / DTCP / competent development authority with sanctioned built-up area.\n"
            "5. Tamper-Evident Ledger: ARC-Verify uses a cryptographically chained HMAC-SHA256 audit ledger ensuring immutable record keeping "
            "   of every verification action, document upload, and reviewer decision.\n"
            "6. Cross-Document Concordance: Name and trust identity concordance matching between Application Form, Registration Deeds, Land Deeds, and University NOCs.\n\n"
            "Response Guidelines:\n"
            "- Professional, concise, authoritative, and direct. Use structured bullet points when enumerating norms or checklists.\n"
            "- Base your responses strictly on statutory standards and system evidence. Never fabricate non-existent clauses or legal exemptions.\n"
            "- Remind users that final statutory decisions rest with human scrutiny officers in accordance with official Council regulations.\n"
            "- Provide clear, actionable recommendations."
        )

        prompt_parts = []
        if context:
            ctx_lines = [f"User Role: {user_role}"]
            if case_id:
                ctx_lines.append(f"Active Case: {case_id} ({case_title}) - Status: {case_status}")
            if current_page:
                ctx_lines.append(f"Current Page: {current_page}")
            prompt_parts.append("Context:\n" + "\n".join(ctx_lines))

        if history:
            prompt_parts.append("Recent Conversation:")
            for turn in history[-6:]:
                role_label = str(turn.get("role", "user")).capitalize()
                content = str(turn.get("content", ""))
                prompt_parts.append(f"{role_label}: {content}")

        prompt_parts.append(f"User: {message}")
        prompt_parts.append("ARC-Verify Assistant:")
        full_prompt = "\n\n".join(prompt_parts)

        # Try Gemini API first
        if self.is_available:
            models_to_try = [self.model]
            for m in FALLBACK_MODELS:
                if m not in models_to_try:
                    models_to_try.append(m)

            for m in models_to_try:
                try:
                    config = types.GenerateContentConfig(
                        temperature=0.2,
                        system_instruction=system_instruction,
                    )
                    response = self._client.models.generate_content(
                        model=m,
                        contents=full_prompt,
                        config=config,
                    )
                    if response and response.text:
                        reply_text = response.text.strip()
                        suggested_actions = self._generate_suggested_actions(message, reply_text)
                        sources = self._identify_sources(message, reply_text)
                        return ChatResponse(
                            reply=reply_text,
                            suggested_actions=suggested_actions,
                            sources=sources,
                        )
                except Exception as err:
                    logger.warning(f"Gemini chat failed on model '{m}': {err}")
                    continue

        # Fallback deterministic regulatory guidance
        return self._fallback_chat_reply(message, user_role, case_id)

    def _generate_suggested_actions(self, message: str, reply: str) -> List[str]:
        q = (message + " " + reply).lower()
        actions = []
        if "land" in q or "acre" in q or "survey" in q:
            actions.append("Review Land Title Deed Annexure")
            actions.append("Check Khasra / Survey Number Consistency")
        if "faculty" in q or "fsr" in q or "ratio" in q:
            actions.append("Inspect Faculty Roster & Cadre Distribution")
            actions.append("Verify EPF / Salary Bank Disbursal Records")
        if "fire" in q or "noc" in q:
            actions.append("Verify Fire NOC Issue Date & Expiry")
            actions.append("Inspect Building Plan Setback Dimensions")
        if "audit" in q or "ledger" in q or "hmac" in q or "chain" in q:
            actions.append("View Tamper-Evident Audit Ledger")
            actions.append("Run Cryptographic Hash Chain Verification")
        if "discrepanc" in q or "mismatch" in q or "concordance" in q:
            actions.append("Open Cross-Document Concordance Matrix")
            actions.append("Issue Official Deficiency Notice")

        if not actions:
            actions = [
                "Run Automated Dossier Scrutiny",
                "View Case Concordance Summary",
                "Download Verification Audit Report",
            ]
        return actions[:3]

    def _identify_sources(self, message: str, reply: str) -> List[str]:
        q = (message + " " + reply).lower()
        sources = ["AICTE Approval Process Handbook (APH 2024–27)"]
        if "land" in q or "built-up" in q or "infrastructure" in q:
            sources.append("AICTE APH Appendix 4 (Norms for Land & Built-up Area)")
        if "faculty" in q or "cadre" in q or "fsr" in q:
            sources.append("AICTE APH Appendix 7 (Faculty Requirements & Cadre Ratio)")
        if "audit" in q or "ledger" in q or "hmac" in q:
            sources.append("ARC-Verify Cryptographic Ledger Specification (HMAC-SHA256)")
        if "fire" in q or "noc" in q:
            sources.append("National Building Code of India (Part 4: Fire & Life Safety)")
        return list(dict.fromkeys(sources))

    def _fallback_chat_reply(self, message: str, role: str, case_id: str) -> ChatResponse:
        q = message.lower()

        if "land" in q or "acre" in q:
            reply = (
                "**AICTE APH 2024–27 Land Requirements Overview:**\n\n"
                "- **Mega / Metro Cities:** Minimum 1.5 to 2.5 acres (depending on program and vertical FSI concessions).\n"
                "- **Urban Areas:** Minimum 2.5 to 4.0 acres.\n"
                "- **Rural / Other Areas:** Minimum 7.5 to 10.0 acres.\n\n"
                "**Essential Verification Standards:**\n"
                "1. **Contiguity:** The land parcel must be contiguous. If divided by a public road, an approved overpass/underpass or municipal NOC is required.\n"
                "2. **Title & Ownership:** Registered Sale Deed, Gift Deed, or Government Lease (>30 years) in the name of the Applicant Society/Trust.\n"
                "3. **Non-Agricultural Conversion:** Mandatory CLU (Change of Land Use) or NA Order from the competent revenue authority.\n"
                "4. **Encumbrance Certificate:** Clear Non-Encumbrance Certificate for the past 15–30 years."
            )
            actions = ["Review Land Title Deed Annexure", "Check Khasra / Survey Number Consistency"]
            sources = ["AICTE Approval Process Handbook (APH 2024–27)", "AICTE APH Appendix 4"]
        elif "faculty" in q or "fsr" in q or "ratio" in q:
            reply = (
                "**AICTE Faculty-to-Student Ratio (FSR) & Cadre Norms:**\n\n"
                "- **Undergraduate Engineering & Technology:** Standard FSR is **1:20**.\n"
                "- **Postgraduate Programs (M.Tech/MBA/MCA):** Standard FSR is **1:15** or **1:20**.\n"
                "- **Cadre Distribution Ratio:** **1 : 2 : 6** (Professor : Associate Professor : Assistant Professor).\n\n"
                "**Verification Checklist:**\n"
                "1. Regular full-time appointment orders with selection committee minutes.\n"
                "2. Aadhaar-seeded biometric attendance & institutional ID registration.\n"
                "3. Verified EPF statement or monthly bank credit advice matching 7th CPC scales.\n"
                "4. Principal / Director must satisfy Professor cadre requirements with eligible Ph.D."
            )
            actions = ["Inspect Faculty Roster & Cadre Distribution", "Verify EPF / Salary Bank Disbursal Records"]
            sources = ["AICTE Approval Process Handbook (APH 2024–27)", "AICTE APH Appendix 7"]
        elif "fire" in q or "noc" in q:
            reply = (
                "**Fire Safety NOC Statutory Requirements:**\n\n"
                "- Must be issued by the competent State Fire Service Department or District Fire Officer.\n"
                "- The certificate must be **currently valid** on the date of submission and scrutiny inspection.\n"
                "- Must certify compliance with the **National Building Code (NBC) 2016 Part 4** regarding fire extinguishers, wet risers, automatic sprinklers, emergency exits, and staircase widths (minimum 2.0 m for educational occupancy).\n"
                "- Any conditional NOC requiring rectifications within a specified grace period must be flagged for manual scrutiny."
            )
            actions = ["Verify Fire NOC Issue Date & Expiry", "Inspect Building Plan Setback Dimensions"]
            sources = ["AICTE Approval Process Handbook (APH 2024–27)", "National Building Code of India"]
        elif "audit" in q or "ledger" in q or "chain" in q or "hmac" in q:
            reply = (
                "**ARC-Verify Tamper-Evident Audit Ledger Architecture:**\n\n"
                "- Every statutory event (document upload, OCR extraction, rule evaluation, officer decision, parameter override) is recorded in an append-only cryptographic ledger.\n"
                "- **Chained HMAC-SHA256:** Each entry contains a cryptographic hash binding its payload with the `prev_hash` of the preceding record and the server master secret.\n"
                "- **Verification Status:** You can inspect real-time ledger health on the `/audit` page. Any retrofitted or altered database entry immediately breaks the hash chain, triggering a tamper alert.\n"
                "- **Actor Accountability:** Events strictly record the authenticated session identity (`actorId`, `actorName`, `actorRole`) and prevent spoofed client headers."
            )
            actions = ["View Tamper-Evident Audit Ledger", "Run Cryptographic Hash Chain Verification"]
            sources = ["ARC-Verify Cryptographic Ledger Specification (HMAC-SHA256)"]
        elif "discrepanc" in q or "mismatch" in q or "concordance" in q:
            reply = (
                "**Cross-Document Concordance & Discrepancy Resolution:**\n\n"
                "1. **Identity & Name Normalization:** The system cross-compares declared names in the Application Form against Trust Deeds, Land Registrations, and Affiliation letters using Levenshtein edit distance and token matching.\n"
                "2. **Discrepancy Triage:**\n"
                "   - *Minor Typographical / Acronym Variations* (e.g., 'Inst. of Tech.' vs 'Institute of Technology'): Flagged as `FUZZY_WARNING`.\n"
                "   - *Distinct Legal Entity / Trustee Names*: Flagged as `MISMATCH_SUSPECTED`.\n"
                "3. **Resolution Action:** Scrutiny officers can request an official Affidavit or issue a Deficiency Notice requesting an gazetted amendment deed."
            )
            actions = ["Open Cross-Document Concordance Matrix", "Issue Official Deficiency Notice"]
            sources = ["AICTE Approval Process Handbook (APH 2024–27)"]
        else:
            reply = (
                f"Hello! I am your **ARC-Verify AI Assistant**, supporting role: **{role}**.\n\n"
                "I can assist you with:\n"
                "- **AICTE APH 2024–27 Norms:** Land acreage, instructional area, faculty ratios (FSR), administrative amenities.\n"
                "- **Statutory Document Scrutiny:** Land Title Deeds, Fire Safety NOCs, Building Plan Approvals, University Affiliation.\n"
                "- **Tamper-Evident Audit Trail:** Chained HMAC-SHA256 ledger verification and security compliance.\n"
                "- **Application Validation:** Resolving cross-document discrepancies and generating deficiency reports.\n\n"
                "How may I assist your scrutiny review today?"
            )
            actions = [
                "Run Automated Dossier Scrutiny",
                "View Case Concordance Summary",
                "View Tamper-Evident Audit Ledger",
            ]
            sources = ["AICTE Approval Process Handbook (APH 2024–27)"]

        return ChatResponse(reply=reply, suggested_actions=actions, sources=sources)



gemini_service = GeminiService()

