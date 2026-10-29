import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gemini_service import GeminiService, _CONTENT_CACHE
from extraction_schemas import DocumentClassificationResult, DossierExtractionResult


def test_gemini_service_initialization():
    service = GeminiService()
    # Should load API key from .env and model
    assert service.model is not None
    assert service.api_key != ""
    assert service.is_available is True


def test_gemini_service_classification_caching():
    service = GeminiService()
    sample_text = "Government of Tamil Nadu, Fire and Rescue Services Department. No Objection Certificate (NOC)."
    filename = "fire_noc_2026.pdf"
    fake_sha = "aabbccddeeff11223344"

    res1 = service.classify_document(sample_text, filename, sha256_hash=fake_sha)
    assert res1.category == "FIRE_SAFETY_NOC"

    # Verify cached
    cache_key = f"{fake_sha}:classify:{service.model}"
    assert cache_key in _CONTENT_CACHE

    # Second call should fetch directly from cache
    res2 = service.classify_document("DIFFERENT TEXT", filename, sha256_hash=fake_sha)
    assert res2.category == "FIRE_SAFETY_NOC"


def test_gemini_service_structured_extraction():
    service = GeminiService()
    sample_text = (
        "Ref No: AICTE/APPROVAL/2026-27/0123\n"
        "To: National Institute of Advanced Technology\n"
        "Subject: Extension of Approval for Academic Year 2026-2027\n"
        "Date: 2026-05-15\n"
        "Total approved land area: 7.50 Acres across Survey No: 104/A, 104/B."
    )
    result = service.extract_structured_fields(
        text=sample_text,
        category="LAND_OWNERSHIP_CERTIFICATE",
        filename="land_record.pdf",
    )
    assert isinstance(result, DossierExtractionResult)
    assert result.institution_name is not None
    if result.institution_name.status == "extracted":
        assert "Institute" in str(result.institution_name.value)


def test_gemini_service_explain_finding():
    service = GeminiService()
    finding = {
        "rule_id": "COMP-02",
        "rule_title": "Land Area Adequacy Norm",
        "outcome": "FAIL",
        "message": "Declared land area 1.25 acres is below AICTE statutory minimum of 2.50 acres for Rural Category.",
        "details": {"required_acres": 2.5, "provided_acres": 1.25},
    }
    explanation = service.explain_finding(finding)
    assert explanation.rule_id == "COMP-02"
    assert len(explanation.plain_language_explanation) > 10
    assert len(explanation.recommended_reviewer_action) > 5

