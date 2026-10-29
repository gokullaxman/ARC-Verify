import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from extraction_schemas import ChatRequest, ChatMessage

client = TestClient(app)


def test_chat_endpoint_basic():
    payload = {
        "message": "What are the land requirements for Metro cities?",
        "history": [],
        "context": {
            "user_role": "SCRUTINY_OFFICER",
            "current_page": "/cases",
        }
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert "suggested_actions" in data
    assert isinstance(data["suggested_actions"], list)
    assert "sources" in data
    assert isinstance(data["sources"], list)
    assert any("AICTE" in s for s in data["sources"])


def test_chat_endpoint_with_history():
    payload = {
        "message": "What about Fire Safety NOC?",
        "history": [
            {"role": "user", "content": "Hello, I am reviewing a college application."},
            {"role": "assistant", "content": "I can help with institutional scrutiny."},
        ],
        "context": {
            "user_role": "SCRUTINY_OFFICER",
            "case_id": "CASE-TEST-001",
            "case_title": "Apex Engineering Institute",
        }
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["suggested_actions"]) > 0


def test_chat_endpoint_validation_error():
    # Missing required message
    response = client.post("/chat", json={})
    assert response.status_code == 422
