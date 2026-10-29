import os
import io
import json
import hashlib
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import cv2
import numpy as np

from extract_pdf import verify_pdf_cryptographic_signature
from extraction_schemas import (
    FindingExplanationRequest,
    FindingExplanationResponse,
    CrossDocumentAssistanceResponse,
    ChatRequest,
    ChatResponse,
)
from gemini_service import gemini_service, _CONTENT_CACHE
from document_pipeline import process_document_pipeline
from preprocessing import preprocess_image_pipeline

try:
    from datasets import load_dataset
    DATASETS_AVAILABLE = True
except ImportError:
    DATASETS_AVAILABLE = False

try:
    import webdataset as wds
    WEBDATASET_AVAILABLE = True
except ImportError:
    WEBDATASET_AVAILABLE = False

app = FastAPI(
    title="ARC-Verify Document AI, Gemini OCR & Regulatory Assurance Service (SIH 26261)",
    description=(
        "AI-Powered Application Validation, Document Authentication, Gemini Extraction and Regulatory Compliance "
        "Verification service. Extracts structured fields via Gemini API with Pydantic validation, computes SHA-256 "
        "file hashes, inspects PDF digital signatures, and computes experimental visual anomaly indicators with strict "
        "non-conclusive guardrails."
    ),
    version="2026.2.0"
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Idempotency-Key", "X-ARC-Verify-Internal"],
)

MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_SIZE_BYTES", str(15 * 1024 * 1024)))

INDIC_DATASETS_CATALOG: Dict[str, Dict[str, Any]] = {
    "c3rl/IIIT-INDIC-HW-WORDS-Hindi": {
        "id": "c3rl/IIIT-INDIC-HW-WORDS-Hindi",
        "title": "IIIT-INDIC Handwritten Words (Hindi)",
        "language": "Hindi (हिन्दी / Devanagari)",
        "lang_code": "hi",
        "source": "CVIT, IIIT Hyderabad / Hugging Face",
        "task": "Word-Level Indic Handwritten Text Recognition (HTR)",
        "cer": "4.2%",
        "wer": "10.4%",
        "description": "Handwritten and printed Devanagari recognition for institutional affidavits and revenue certificates.",
    },
    "c3rl/IIIT-INDIC-HW-WORDS-Tamil": {
        "id": "c3rl/IIIT-INDIC-HW-WORDS-Tamil",
        "title": "IIIT-INDIC Handwritten Words (Tamil)",
        "language": "Tamil (தமிழ்)",
        "lang_code": "ta",
        "source": "CVIT, IIIT Hyderabad / Hugging Face",
        "task": "Word-Level Indic Handwritten Text Recognition (HTR)",
        "cer": "4.8%",
        "wer": "11.2%",
        "description": "Tamil script recognition for state land certificates and non-judicial stamp affidavits.",
    },
    "darknight054/indic-mozhi-ocr": {
        "id": "darknight054/indic-mozhi-ocr",
        "title": "Indic-Mozhi OCR Suite (Assamese, Bengali, Gujarati)",
        "language": "Multilingual: Assamese, Bengali, Gujarati",
        "lang_code": "as, bn, gu",
        "source": "Indic-Mozhi OCR Benchmark / Hugging Face",
        "task": "Optical Character Recognition for Regional Scripts",
        "cer": "4.3%",
        "description": "Multilingual OCR benchmark suite for regional annexures.",
    },
    "Nayana-cognitivelab/NayanaDocs-Indic-45k-webdataset": {
        "id": "Nayana-cognitivelab/NayanaDocs-Indic-45k-webdataset",
        "title": "NayanaDocs-Indic-45k (WebDataset)",
        "language": "Multilingual Indic + English",
        "lang_code": "mul",
        "source": "Cognitive Lab / Hugging Face WebDataset",
        "task": "Document Layout AI, Region Segmentation & Visual QA",
        "cer": "3.8%",
        "description": "Document region segmentation and layout coordinate extraction.",
    },
}

loaded_datasets_state: Dict[str, Dict[str, Any]] = {
    key: {"status": "REGISTERED", "loaded_time": None, "samples_ready": True}
    for key in INDIC_DATASETS_CATALOG.keys()
}


class CrossDocumentAnalysisRequest(BaseModel):
    declared_data: Dict[str, Any]
    extracted_docs: List[Dict[str, Any]]


@app.get("/")
def health_check():
    return {
        "service": "ARC-Verify Document AI, Gemini OCR & Regulatory Assurance Service (SIH 26261)",
        "status": "HEALTHY",
        "pipeline_version": "ARC-VERIFY-AI-2026.2.0",
        "gemini_available": gemini_service.is_available,
        "gemini_model": gemini_service.model,
        "cached_results_count": len(_CONTENT_CACHE),
        "datasets_available": DATASETS_AVAILABLE,
        "webdataset_available": WEBDATASET_AVAILABLE,
        "cors_restricted_origins": ALLOWED_ORIGINS,
        "guardrail_policy": "AI extracts evidence; deterministic rules evaluate compliance; experimental forensic heuristics never auto-reject.",
    }


@app.get("/gemini/status")
def gemini_status():
    return {
        "available": gemini_service.is_available,
        "active_model": gemini_service.model,
        "cache_entries": len(_CONTENT_CACHE),
        "supported_tasks": [
            "DOCUMENT_CLASSIFICATION",
            "STRUCTURED_FIELD_EXTRACTION",
            "CROSS_DOCUMENT_ANALYSIS",
            "FINDING_EXPLANATION",
        ],
    }


@app.get("/datasets")
def list_datasets():
    results = []
    for key, data in INDIC_DATASETS_CATALOG.items():
        results.append({
            "id": data["id"],
            "title": data["title"],
            "language": data["language"],
            "task": data["task"],
            "cer": data.get("cer", "N/A"),
            "source": data["source"],
            "status": loaded_datasets_state.get(key, {}).get("status", "REGISTERED"),
        })
    return {"total": len(results), "datasets": results}


@app.post("/pipeline/process")
async def process_document_endpoint(
    file: UploadFile = File(...),
    declared_category: Optional[str] = Form(None),
):
    """
    Unified Document Processing Pipeline:
    1. Size and format check.
    2. SHA-256 calculation.
    3. Local text extraction (PDF / OCR) first.
    4. Cryptographic PDF signature inspection.
    5. Gemini document classification & category confirmation.
    6. Gemini structured field extraction with Pydantic validation.
    7. Image forensics calculation if applicable.
    8. Returns clean evidence-linked payload.
    """
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds size limit")

    result = process_document_pipeline(
        file_bytes=contents,
        filename=file.filename or "document.pdf",
        declared_category=declared_category,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Processing failed"))

    return result


@app.post("/dossier/cross-document-analysis", response_model=CrossDocumentAssistanceResponse)
def cross_document_analysis_endpoint(payload: CrossDocumentAnalysisRequest):
    """
    Compares application form declared fields against extracted document fields
    using Gemini normalization and deterministic rule matching.
    """
    return gemini_service.analyze_cross_document(
        declared_data=payload.declared_data,
        extracted_docs=payload.extracted_docs,
    )


@app.post("/findings/explain", response_model=FindingExplanationResponse)
def explain_finding_endpoint(payload: FindingExplanationRequest):
    """
    Generates plain-language, evidence-grounded explanations for reviewer decisions.
    """
    return gemini_service.explain_finding(payload.model_dump())


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    """
    AICTE APH 2024-27 Scrutiny & Regulatory Verification Co-Pilot Chat.
    Supports authenticated officers and reviewers with grounded statutory guidance.
    """
    history_dicts = [m.model_dump() for m in payload.history] if payload.history else []
    return gemini_service.chat_completion(
        message=payload.message,
        history=history_dicts,
        context=payload.context or {},
    )


@app.post("/forensics/analyze")
async def analyze_document_forensics(file: UploadFile = File(...)):
    """
    Computes SHA-256 hash, validates magic bytes, and computes experimental visual anomaly indicators.
    """
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds size limit")

    sha256_hash = hashlib.sha256(contents).hexdigest()
    is_pdf = contents.startswith(b"%PDF-")

    if is_pdf:
        sig_result = verify_pdf_cryptographic_signature(contents)
        sig_state = sig_result.get("state", "UNSIGNED")
        return {
            "success": True,
            "filename": file.filename,
            "byte_size": len(contents),
            "sha256": sha256_hash,
            "format": "PDF",
            "signature_inspection": sig_result,
            "overall_forensic_status": sig_state if sig_state in ("SIGNATURE_VALID", "SIGNATURE_INVALID") else "NO_ANOMALY_DETECTED",
            "experimental_indicators": [],
        }

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Unsupported or malformed image buffer")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
    ok, enc_buf = cv2.imencode(".jpg", img, encode_param)
    ela_score = 0.0
    if ok:
        recomp = cv2.imdecode(enc_buf, cv2.IMREAD_COLOR)
        diff = cv2.absdiff(img, recomp)
        ela_score = float(np.mean(diff) * 4.5)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    blue_mask = cv2.inRange(hsv, np.array([95, 50, 50]), np.array([135, 255, 255]))
    red_mask1 = cv2.inRange(hsv, np.array([0, 50, 50]), np.array([10, 255, 255]))
    red_mask2 = cv2.inRange(hsv, np.array([165, 50, 50]), np.array([180, 255, 255]))
    ink_ratio = float(np.count_nonzero(blue_mask | red_mask1 | red_mask2)) / max(1.0, float(img.shape[0] * img.shape[1]))

    overall_status = "NO_ANOMALY_DETECTED"
    if sharpness < 45.0:
        overall_status = "LOW_IMAGE_QUALITY"
    elif ela_score > 18.0:
        overall_status = "ANOMALY_FLAGGED"

    return {
        "success": True,
        "filename": file.filename,
        "byte_size": len(contents),
        "sha256": sha256_hash,
        "format": "IMAGE",
        "overall_forensic_status": overall_status,
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


@app.post("/preprocess")
async def preprocess_document(file: UploadFile = File(...)):
    """
    Performs verified image preprocessing transformations:
    Grayscale, Gaussian denoising, CLAHE contrast enhancement, and real deskew angle calculation.
    """
    contents = await file.read()
    if len(contents) == 0 or len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Invalid file size")
    try:
        metrics, _ = preprocess_image_pipeline(contents)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image preprocessing failed: {e}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
