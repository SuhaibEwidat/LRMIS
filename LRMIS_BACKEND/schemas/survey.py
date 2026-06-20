from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, date


SurveyMilestoneType = Literal[
    "assigned",
    "visit_scheduled",
    "arrived_on_site",
    "survey_started",
    "survey_completed",
    "report_uploaded",
    "registrar_reviewed"
]


SurveyTaskStatus = Literal[
    "assigned",
    "visit_scheduled",
    "arrived_on_site",
    "survey_started",
    "survey_completed",
    "report_uploaded",
    "registrar_reviewed"
]


PriorityType = Literal["low", "normal", "high", "urgent"]


class Milestone(BaseModel):
    type: SurveyMilestoneType
    at: datetime
    by: str
    meta: Dict[str, Any] = Field(default_factory=dict)


class SurveyTaskCreate(BaseModel):
    application_id: str = Field(..., example="LRMIS-2026-0001")
    parcel_id: str = Field(..., example="675100000000000000000201")
    assigned_surveyor_id: str = Field(..., example="675100000000000000000301")
    priority: PriorityType = "normal"
    scheduled_visit_date: Optional[date] = None


class SurveyTaskResponse(BaseModel):
    id: str
    task_id: str
    application_id: str
    parcel_id: str
    assigned_surveyor_id: str
    status: SurveyTaskStatus
    priority: PriorityType
    scheduled_visit_date: Optional[date] = None
    milestones: List[Milestone] = Field(default_factory=list)
    field_notes: List[str] = Field(default_factory=list)
    report_uploaded: bool = False
    created_at: datetime
    updated_at: datetime


class SurveyMilestoneUpdate(BaseModel):
    milestone: SurveyMilestoneType = Field(..., example="visit_scheduled")
    by: str = Field(..., example="surveyor")
    scheduled_visit_date: Optional[date] = None
    field_note: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class SurveyReportCreate(BaseModel):
    report_title: str = Field(..., example="Boundary Verification Report")
    summary: str = Field(..., example="The parcel boundaries were verified successfully.")
    created_by: str = Field(..., example="675100000000000000000301")
    attachments: List[Dict[str, Any]] = Field(default_factory=list)


class SurveyReportResponse(BaseModel):
    id: str
    report_id: str
    application_id: str
    task_id: str
    parcel_id: str
    created_by: str
    report_title: str
    summary: str
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime


class RegistrarReviewRequest(BaseModel):
    decision: Literal["approved", "needs_correction", "rejected"] = Field(..., example="approved")
    reviewed_by: str = Field(..., example="REG-RM-01")
    notes: Optional[str] = Field(default=None, example="Survey report accepted.")