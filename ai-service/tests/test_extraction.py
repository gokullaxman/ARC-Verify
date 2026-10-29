import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from extraction_schemas import (
    FieldEvidenceItem,
    DocumentClassificationResult,
    DossierExtractionResult,
    CrossDocDiscrepancy,
    CrossDocumentAssistanceResponse,
    FindingExplanationResponse,
)


def test_field_evidence_item_valid():
    item = FieldEvidenceItem(
        value="ABC Institute of Technology",
        evidence="Printed at the header of page 1",
        status="extracted",
        confidence=0.98,
    )
    assert item.value == "ABC Institute of Technology"
    assert item.status == "extracted"
    assert item.confidence == 0.98


def test_field_evidence_item_missing():
    # Model distinguishes missing field from guessed field
    item = FieldEvidenceItem(
        value=None,
        evidence=None,
        status="not_found",
        confidence=0.0,
    )
    assert item.value is None
    assert item.status == "not_found"


def test_document_classification_result():
    res = DocumentClassificationResult(
        category="FIRE_SAFETY_NOC",
        confidence=0.95,
        review_status="CONFIRMED",
        rationale="Matches Department of Fire and Rescue Services format",
    )
    assert res.category == "FIRE_SAFETY_NOC"
    assert res.review_status == "CONFIRMED"


def test_dossier_extraction_result():
    doc = DossierExtractionResult(
        document_type="LAND_OWNERSHIP_CERTIFICATE",
        institution_name=FieldEvidenceItem(value="National Engineering College", status="extracted"),
        land_area=FieldEvidenceItem(value=5.25, status="extracted"),
        land_area_unit=FieldEvidenceItem(value="Acres", status="extracted"),
        survey_numbers=["248/1", "248/2"],
    )
    assert doc.document_type == "LAND_OWNERSHIP_CERTIFICATE"
    assert doc.institution_name.value == "National Engineering College"
    assert doc.land_area.value == 5.25
    assert len(doc.survey_numbers) == 2


def test_cross_document_discrepancy():
    disc = CrossDocDiscrepancy(
        field_key="institutionName",
        field_label="Institution Legal Name",
        declared_value="Apex Institute of Technology",
        extracted_value="Apex College of Engineering",
        match_status="FUZZY_WARNING",
        reviewer_note="Discrepancy in legal entity name suffix",
    )
    assert disc.match_status == "FUZZY_WARNING"

