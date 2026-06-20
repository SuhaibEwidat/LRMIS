from typing import Optional, Dict, Any, List
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.Module3 import assignment
from services.Module3 import survey


router = APIRouter(
    prefix="/applications",
    tags=["Model 3 - Survey"]
)


class SurveyMilestoneRequest(BaseModel):
    milestone_type: str
    by: str
    meta: Optional[Dict[str, Any]] = None


class ScheduleVisitRequest(BaseModel):
    scheduled_visit_date: str
    by: str


class FieldNoteRequest(BaseModel):
    note: str


class AttachmentRequest(BaseModel):
    file_name: str
    file_url: str


class SurveyReportRequest(BaseModel):
    report_title: str
    summary: str
    attachments: List[AttachmentRequest] = Field(default_factory=list)
    created_by: Optional[str] = None


def model_to_dict(model):
    try:
        return model.model_dump(exclude_unset=True)
    except AttributeError:
        return model.dict(exclude_unset=True)


@router.post("/{application_id}/auto-assign-surveyor")
def auto_assign_surveyor(application_id: str):
    return assignment.auto_assign_surveyor_service(application_id)


@router.post("/{application_id}/schedule-visit")
def schedule_visit(application_id: str, request: ScheduleVisitRequest):
    data = model_to_dict(request)

    return survey.schedule_visit_service(
        application_id=application_id,
        scheduled_visit_date=data["scheduled_visit_date"],
        by=data["by"]
    )


@router.patch("/{application_id}/survey-milestone")
def add_survey_milestone(application_id: str, request: SurveyMilestoneRequest):
    data = model_to_dict(request)

    return survey.add_survey_milestone_service(
        application_id=application_id,
        milestone_type=data["milestone_type"],
        by=data["by"],
        meta=data.get("meta")
    )


@router.post("/{application_id}/field-note")
def add_field_note(application_id: str, request: FieldNoteRequest):
    data = model_to_dict(request)

    return survey.add_field_note_service(
        application_id=application_id,
        note=data["note"]
    )


@router.post("/{application_id}/survey-report")
def upload_survey_report(application_id: str, request: SurveyReportRequest):
    data = model_to_dict(request)

    return survey.upload_survey_report_service(
        application_id=application_id,
        report_data=data
    )