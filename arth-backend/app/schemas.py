from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


Status = Literal["low", "in_range", "high", "critical", "unknown"]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    report_text: str = Field(
        min_length=1,
        max_length=100_000,
        description="Text extracted from a report. Do not send real patient data during development.",
    )
    language: str = Field(default="en", min_length=2, max_length=12)
    report_type: Literal["lab_report", "prescription", "other"] = "lab_report"


class ReferenceRange(BaseModel):
    low: float | None = None
    high: float | None = None
    source_text: str | None = None


class ResultItem(BaseModel):
    test_name: str
    value: str | float | None = None
    unit: str | None = None
    reference_range: ReferenceRange | None = None
    status: Status = "unknown"
    explanation: str
    source_location: str | None = None
    validated: bool = False
    needs_review: bool = True


class AnalyzeResponse(BaseModel):
    report_id: str
    language: str
    summary: str
    results: list[ResultItem]
    limitations: list[str] = Field(default_factory=list)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4_000)
    report_context: str = Field(min_length=1, max_length=100_000)
    language: str = Field(default="en", min_length=2, max_length=12)


class AskResponse(BaseModel):
    answer: str
    language: str
    evidence_note: str
    needs_clinician_review: bool = True
