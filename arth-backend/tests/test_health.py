import json

from fastapi.testclient import TestClient

from app.main import app
from app import routes

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["app"] == "ARTH API"


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "arth-api"}


def test_analyze_rejects_non_medical_text():
    response = client.post(
        "/api/analyze",
        json={
            "report_text": "This is a synthetic software demo about gardening and weather.",
            "language": "en",
            "report_type": "lab_report",
        },
    )

    assert response.status_code == 422


def test_analyze_returns_structured_results(monkeypatch):
    mock_ai_response = {
        "language": "en",
        "summary": "The report contains a hemoglobin result.",
        "results": [
            {
                "test_name": "Hemoglobin",
                "value": "13.5",
                "unit": "g/dL",
                "reference_range": {
                    "low": 12.0,
                    "high": 16.0,
                    "source_text": "12-16 g/dL",
                },
                "status": "in_range",
                "explanation": "This value is within the supplied range.",
                "source_location": "Page 1",
                "validated": True,
                "needs_review": False,
            }
        ],
        "limitations": [],
    }

    monkeypatch.setattr(
        routes,
        "call_ai",
        lambda system_prompt, user_prompt: json.dumps(mock_ai_response),
    )

    response = client.post(
        "/api/analyze",
        json={
            "report_text": "Hemoglobin: 13.5 g/dL. Reference range: 12-16 g/dL.",
            "language": "en",
            "report_type": "lab_report",
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["report_id"]
    assert data["language"] == "en"
    assert data["results"][0]["test_name"] == "Hemoglobin"
    assert data["results"][0]["status"] == "in_range"

    # The backend currently requires clinician review.
    assert data["results"][0]["validated"] is False
    assert data["results"][0]["needs_review"] is True


def test_analyze_handles_invalid_ai_json(monkeypatch):
    monkeypatch.setattr(
        routes,
        "call_ai",
        lambda system_prompt, user_prompt: "This is not valid JSON",
    )

    response = client.post(
        "/api/analyze",
        json={
            "report_text": "Hemoglobin: 13.5 g/dL.",
            "language": "en",
            "report_type": "lab_report",
        },
    )

    assert response.status_code == 502
