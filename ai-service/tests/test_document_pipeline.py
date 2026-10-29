import pytest
import sys
import os
import hashlib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from document_pipeline import process_document_pipeline
from preprocessing import preprocess_image_pipeline
import cv2
import numpy as np


def test_pipeline_with_sample_pdf():
    # Use existing sample_test.pdf in ai-service
    sample_pdf_path = os.path.join(os.path.dirname(__file__), "..", "sample_test.pdf")
    if os.path.exists(sample_pdf_path):
        with open(sample_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        result = process_document_pipeline(
            file_bytes=pdf_bytes,
            filename="sample_test.pdf",
            declared_category="APPLICATION_FORM",
        )
        assert result["success"] is True
        assert result["format"] == "PDF"
        assert result["sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
        assert "classification" in result
        assert "structured_extraction" in result


def test_pipeline_with_synthetic_image():
    # Create a synthetic image buffer with text
    img = np.ones((300, 500, 3), dtype=np.uint8) * 255
    cv2.putText(img, "FIRE SAFETY NOC", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    cv2.circle(img, (250, 200), 40, (255, 0, 0), -1)  # Blue seal candidate
    _, img_bytes = cv2.imencode(".jpg", img)
    raw = img_bytes.tobytes()

    result = process_document_pipeline(
        file_bytes=raw,
        filename="fire_cert.jpg",
        declared_category="FIRE_SAFETY_NOC",
    )
    assert result["success"] is True
    assert result["format"] == "IMAGE"
    assert "forensics" in result
    assert len(result["forensics"]["experimental_indicators"]) == 3


def test_real_preprocessing_pipeline():
    # Create a test synthetic image
    img = np.ones((200, 400, 3), dtype=np.uint8) * 240
    cv2.putText(img, "AICTE APPROVAL LETTER", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (10, 10, 10), 2)
    _, img_bytes = cv2.imencode(".png", img)
    raw = img_bytes.tobytes()

    metrics, processed = preprocess_image_pipeline(raw)
    assert metrics["status"] == "SUCCESS"
    assert metrics["grayscale"] is True
    assert metrics["denoised"] is True
    assert metrics["contrast_enhanced"] is True
    assert isinstance(metrics["deskew_angle_degrees"], float)
    assert metrics["image_width"] == 400
    assert metrics["image_height"] == 200

