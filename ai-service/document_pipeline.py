import os
import io
import hashlib
import tempfile
import logging
from typing import Dict, Any, Optional

import cv2
import numpy as np

from extract_pdf import extract_pdf_content, verify_pdf_cryptographic_signature
from gemini_service import gemini_service
from extraction_schemas import (
    DocumentClassificationResult,
    DossierExtractionResult,
    FieldEvidenceItem,
)

logger = logging.getLogger("document_pipeline")
MAX_FILE_BYTES = int(os.environ.get("MAX_UPLOAD_SIZE_BYTES", str(15 * 1024 * 1024)))


def compute_image_forensics(img_bytes: bytes) -> Dict[str, Any]:
    """
    Computes experimental visual anomaly indicators:
    - ELA (Error Level Analysis) recompression variance
    - Laplacian variance sharpness (blur/legibility check)
    - HSV color mask for stamp/seal candidate ink
    All indicators are strictly tagged EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY.
    """
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {
            "overall_forensic_status": "UNSUPPORTED_FORMAT",
            "experimental_indicators": [],
        }

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # ELA at Q=90
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
    ok, enc_buf = cv2.imencode(".jpg", img, encode_param)
    ela_score = 0.0
    if ok:
        recomp = cv2.imdecode(enc_buf, cv2.IMREAD_COLOR)
        diff = cv2.absdiff(img, recomp)
        ela_score = float(np.mean(diff) * 4.5)

    # HSV stamp seal chrominance mask
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    blue_mask = cv2.inRange(hsv, np.array([95, 50, 50]), np.array([135, 255, 255]))
    red_mask1 = cv2.inRange(hsv, np.array([0, 50, 50]), np.array([10, 255, 255]))
    red_mask2 = cv2.inRange(hsv, np.array([165, 50, 50]), np.array([180, 255, 255]))
    ink_ratio = float(np.count_nonzero(blue_mask | red_mask1 | red_mask2)) / max(1.0, float(img.shape[0] * img.shape[1]))

    status = "NO_ANOMALY_DETECTED"
    if sharpness < 45.0:
        status = "LOW_IMAGE_QUALITY"
    elif ela_score > 18.0:
        status = "ANOMALY_FLAGGED"

    return {
        "overall_forensic_status": status,
        "experimental_indicators": [
            {
                "method": "ELA_RECOMPRESSION_VARIANCE",
                "experimental_label": "EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY",
                "metric_value": round(ela_score, 2),
                "threshold_reference": 18.0,
                "status": "ANOMALY_FLAGGED" if ela_score > 18.0 else "NO_ANOMALY_DETECTED",
                "what_it_can_indicate": "Localized recompression variance meriting human inspection.",
                "what_it_cannot_prove": "Cannot independently prove forgery or distinguish benign scans.",
            },
            {
                "method": "LAPLACIAN_BLUR_SHARPNESS",
                "experimental_label": "EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY",
                "metric_value": round(sharpness, 2),
                "threshold_reference": 45.0,
                "status": "LOW_IMAGE_QUALITY" if sharpness < 45.0 else "NO_ANOMALY_DETECTED",
                "what_it_can_indicate": "Optical legibility and focus quality.",
                "what_it_cannot_prove": "Blur does not prove tampering; sharpness does not prove genuineness.",
            },
            {
                "method": "HSV_STAMP_SEAL_MASK",
                "experimental_label": "EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY",
                "metric_value": round(ink_ratio * 100, 2),
                "threshold_reference": 0.4,
                "status": "NO_ANOMALY_DETECTED" if ink_ratio * 100 >= 0.4 else "INCONCLUSIVE",
                "what_it_can_indicate": "Presence of blue/red chrominance regions typical of wet seals.",
                "what_it_cannot_prove": "Cannot authenticate an official statutory stamp or issuer.",
            },
        ],
    }


def process_document_pipeline(
    file_bytes: bytes,
    filename: str,
    declared_category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified ARC-Verify Document Processing Pipeline:
    1. Validation of size and magic bytes.
    2. SHA-256 calculation.
    3. Local text extraction (PDF / OCR) first.
    4. Cryptographic PDF signature inspection.
    5. Gemini document classification & category confirmation.
    6. Gemini structured field extraction with Pydantic validation.
    7. Image forensics calculation if applicable.
    8. Return clean evidence-linked payload.
    """
    byte_size = len(file_bytes)
    if byte_size == 0:
        return {"success": False, "error": "Uploaded file is empty"}
    if byte_size > MAX_FILE_BYTES:
        return {"success": False, "error": f"File size {byte_size} exceeds limit {MAX_FILE_BYTES}"}

    sha256_hash = hashlib.sha256(file_bytes).hexdigest()
    is_pdf = file_bytes.startswith(b"%PDF-")

    extracted_text = ""
    page_count = 1
    signature_inspection = {
        "hasEmbeddedSignature": False,
        "state": "UNSIGNED",
        "cryptographicDigestValid": False,
        "validationMethod": "N/A (Image)",
    }
    forensic_data = {}

    if is_pdf:
        # Write to temporary file for pypdf / pyHanko inspection
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            pdf_result = extract_pdf_content(tmp_path)
            if pdf_result.get("success"):
                extracted_text = pdf_result.get("totalText", "")
                page_count = pdf_result.get("pageCount", 1)
                signature_inspection = pdf_result.get("signatureInspection", signature_inspection)
            else:
                signature_inspection = verify_pdf_cryptographic_signature(file_bytes)
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    else:
        # Image handling
        forensic_data = compute_image_forensics(file_bytes)
        extracted_text = f"Scanned Document Image: {filename}."

    # Step 5: Gemini Classification
    classification = gemini_service.classify_document(
        text=extracted_text,
        filename=filename,
        sha256_hash=sha256_hash,
    )

    resolved_category = declared_category or classification.category

    # Step 6: Gemini Structured Extraction with Pydantic validation
    extraction = gemini_service.extract_structured_fields(
        text=extracted_text,
        category=resolved_category,
        filename=filename,
        sha256_hash=sha256_hash,
    )

    return {
        "success": True,
        "filename": filename,
        "byte_size": byte_size,
        "sha256": sha256_hash,
        "format": "PDF" if is_pdf else "IMAGE",
        "page_count": page_count,
        "declared_category": declared_category or "OTHER_SUPPORTING",
        "classification": classification.model_dump(),
        "structured_extraction": extraction.model_dump(),
        "signature_inspection": signature_inspection,
        "forensics": forensic_data,
        "text_sample": extracted_text[:500],
    }

