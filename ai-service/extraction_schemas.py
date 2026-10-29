from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class FieldEvidenceItem(BaseModel):
    """
    Represents an extracted field with explicit evidence and status.
    Distinguishes extracted values from missing fields (status="not_found").
    """
    value: Optional[Any] = Field(
        default=None,
        description="Extracted value (string, float, or int), or None if not found."
    )
    evidence: Optional[str] = Field(
        default=None,
        description="Direct quote, page reference, or heading in the document supporting this value."
    )
    status: Literal["extracted", "not_found", "inconclusive"] = Field(
        default="extracted",
        description="Whether the field was successfully extracted, genuinely missing, or inconclusive."
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Model confidence between 0.0 and 1.0."
    )


DocumentCategoryType = Literal[
    "APPLICATION_FORM",
    "LAND_OWNERSHIP_CERTIFICATE",
    "BUILDING_PLAN_APPROVAL",
    "FIRE_SAFETY_NOC",
    "BANK_FDR_CORPUS_RECEIPT",
    "TRUST_SOCIETY_DEED",
    "NON_JUDICIAL_AFFIDAVIT",
    "PREVIOUS_EOA_LETTER",
    "FACULTY_COMPLIANCE_ROSTER",
    "ACCREDITATION_CERTIFICATE",
    "OTHER_SUPPORTING",
    "UNKNOWN_UNCLASSIFIED"
]


class DocumentClassificationResult(BaseModel):
    """
    Classification of an uploaded document with confidence and review flag.
    """
    category: DocumentCategoryType = Field(
        ...,
        description="Identified regulatory or institutional document category."
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Classification confidence score."
    )
    review_status: Literal["CONFIRMED", "AMBIGUOUS_MANUAL_REVIEW"] = Field(
        default="CONFIRMED",
        description="Whether the classification is high-confidence or requires human triage."
    )
    rationale: str = Field(
        default="",
        description="Brief explanation of the keywords or structural features identifying this category."
    )


class DossierExtractionResult(BaseModel):
    """
    Structured extraction result for a regulatory annexure document.
    """
    document_type: str = Field(
        default="UNKNOWN",
        description="Document category identifier."
    )
    institution_name: FieldEvidenceItem = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    trust_name: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    reference_number: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    issue_date: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    expiry_date: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    land_area: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    land_area_unit: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    survey_numbers: Optional[List[str]] = Field(
        default_factory=list,
        description="List of survey numbers, khasra numbers, or plot identifiers found."
    )
    corpus_fund_inr: Optional[FieldEvidenceItem] = Field(
        default_factory=lambda: FieldEvidenceItem(status="not_found")
    )
    extra_fields: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any supplementary category-specific key-value pairs extracted."
    )


class CrossDocDiscrepancy(BaseModel):
    field_key: str
    field_label: str
    declared_value: str
    extracted_value: Optional[str] = None
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    match_status: Literal["MATCH", "FUZZY_WARNING", "MISMATCH_SUSPECTED", "DOCUMENT_FIELD_MISSING"]
    confidence: float = 0.95
    reviewer_note: str


class CrossDocumentAssistanceResponse(BaseModel):
    discrepancies: List[CrossDocDiscrepancy] = Field(default_factory=list)
    normalized_records: Dict[str, Any] = Field(default_factory=dict)
    summary: str = ""


class FindingExplanationRequest(BaseModel):
    rule_id: str
    rule_title: str
    outcome: str
    severity: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class FindingExplanationResponse(BaseModel):
    rule_id: str
    plain_language_explanation: str
    evidence_basis: str
    recommended_reviewer_action: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)

