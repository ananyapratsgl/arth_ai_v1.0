# ARTH Backend Starter

A beginner-friendly FastAPI foundation for ARTH, a prototype that helps people understand medical documents in plain language.

## Current status

Implemented:
- FastAPI app and interactive API docs
- `GET /` and `GET /health`
- Request/response schemas for report analysis and ASK ARTH
- CORS for a local Vite frontend (`localhost:5173`)
- Starter tests and secret-safe `.env.example`

Not implemented yet:
- Nebius Token Factory / Nemotron model calls
- PDF/image OCR and file upload
- Persistent report storage or user authentication
- Medical validation rules

The `/api/analyze` and `/api/ask` endpoints intentionally return HTTP 501 until the AI integration is implemented. Do not treat this starter as a medical service.

## Requirements

- Python 3.11+ recommended
- Git

## Run on macOS

```bash
cd arth-backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:
- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

Run tests in another terminal, from this folder:

```bash
source .venv/bin/activate
pytest
```

## Environment variables

Copy `.env.example` to `.env` when you are ready to configure Token Factory:

```bash
cp .env.example .env
```

Never commit `.env`. Confirm the current Nebius Token Factory endpoint, authentication method, and exact Nemotron model ID from the official documentation before filling in these variables. Keep all model calls on the backend, never in browser code.

## API contract for frontend development

### `POST /api/analyze`

Request:

```json
{
  "report_text": "Synthetic sample report text",
  "language": "en",
  "report_type": "lab_report"
}
```

Planned response shape:

```json
{
  "report_id": "demo-001",
  "language": "en",
  "summary": "Plain-language explanation",
  "results": [
    {
      "test_name": "Example analyte",
      "value": 12.4,
      "unit": "example unit",
      "reference_range": {"low": 10.0, "high": 15.0},
      "status": "in_range",
      "explanation": "Within the supplied reference range.",
      "source_location": "page 1",
      "validated": false,
      "needs_review": true
    }
  ],
  "limitations": ["Illustrative schema only"]
}
```

The sample is illustrative, not a medical interpretation. Until implemented, this endpoint returns `501 Not Implemented`.

### `POST /api/ask`

Request:

```json
{
  "question": "What does this term mean?",
  "report_context": "Synthetic report text only",
  "language": "en"
}
```

This endpoint is also intentionally unimplemented.

## Medical safety requirements for future implementation

- Do not invent missing values, units, or reference ranges.
- Mark uncertain extraction as requiring review.
- Compare numeric values only when units and the relevant reference range are known and compatible.
- Do not diagnose, prescribe, or advise users to start/stop medication.
- Clearly distinguish extracted report content from generated explanation.
- Use synthetic/de-identified documents during development.
- Add authentication and private storage before storing user reports.

## Suggested next tasks

1. Verify Token Factory access and the current Nemotron model ID.
2. Implement a backend-only model client using environment variables.
3. Add structured-output validation and tests for malformed/uncertain inputs.
4. Add OCR/file parsing.
5. Add secure persistence and authentication only after defining the prototype's data requirements.
