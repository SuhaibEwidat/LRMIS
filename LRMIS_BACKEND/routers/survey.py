import json
from pathlib import Path
from uuid import uuid4
from typing import Optional, Dict, Any

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from services.Module3 import assignment
from services.Module3 import survey


router = APIRouter(
    prefix="/applications",
    tags=["Model 3 - Survey"]
)


# =========================
# Uploads Folder
# =========================
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# =========================
# Request Schemas
# =========================
class SurveyMilestoneRequest(BaseModel):
    milestone_type: str
    by: str
    meta: Optional[Dict[str, Any]] = None


class ScheduleVisitRequest(BaseModel):
    scheduled_visit_date: str
    by: str


class FieldNoteRequest(BaseModel):
    note: str


def model_to_dict(model):
    try:
        return model.model_dump(exclude_unset=True)
    except AttributeError:
        return model.dict(exclude_unset=True)


# =========================
# Auto Assign Surveyor
# =========================
@router.post("/{application_id}/auto-assign-surveyor")
def auto_assign_surveyor(application_id: str):
    return assignment.auto_assign_surveyor_service(application_id)


# =========================
# Schedule Visit
# =========================
@router.post("/{application_id}/schedule-visit")
def schedule_visit(application_id: str, request: ScheduleVisitRequest):
    data = model_to_dict(request)

    return survey.schedule_visit_service(
        application_id=application_id,
        scheduled_visit_date=data["scheduled_visit_date"],
        by=data["by"]
    )


# =========================
# Add Survey Milestone
# =========================
@router.patch("/{application_id}/survey-milestone")
def add_survey_milestone(application_id: str, request: SurveyMilestoneRequest):
    data = model_to_dict(request)

    return survey.add_survey_milestone_service(
        application_id=application_id,
        milestone_type=data["milestone_type"],
        by=data["by"],
        meta=data.get("meta")
    )


# =========================
# Add Field Note
# =========================
@router.post("/{application_id}/field-note")
def add_field_note(application_id: str, request: FieldNoteRequest):
    data = model_to_dict(request)

    return survey.add_field_note_service(
        application_id=application_id,
        note=data["note"]
    )


# =========================
# Upload Survey Report File
# =========================
@router.post("/{application_id}/survey-report")
async def upload_survey_report(
    application_id: str,
    report_title: str = Form(...),
    summary: str = Form(...),
    uploaded_by: str = Form(...),
    field_notes: str = Form("[]"),
    task_id: str = Form(...),
    survey_task_ref: str = Form(...),
    file: UploadFile = File(...)
):
    if not application_id:
        raise HTTPException(status_code=400, detail="application_id is required")

    if not task_id:
        raise HTTPException(status_code=400, detail="task_id is required")

    if not survey_task_ref:
        raise HTTPException(status_code=400, detail="survey_task_ref is required")

    if not report_title.strip():
        raise HTTPException(status_code=400, detail="report_title is required")

    if not summary.strip():
        raise HTTPException(status_code=400, detail="summary is required")

    if not uploaded_by.strip():
        raise HTTPException(status_code=400, detail="uploaded_by is required")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="report file is required")

    allowed_extensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]

    original_filename = file.filename
    file_extension = Path(original_filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, Word, JPG, JPEG, and PNG files are allowed"
        )

    stored_filename = f"{application_id}_{task_id}_{uuid4().hex}{file_extension}"
    file_path = UPLOAD_DIR / stored_filename

    file_content = await file.read()

    if not file_content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    with open(file_path, "wb") as buffer:
        buffer.write(file_content)

    try:
        parsed_field_notes = json.loads(field_notes)
    except Exception:
        parsed_field_notes = []

    report_data = {
        "task_id": task_id,
        "survey_task_ref": survey_task_ref,
        "report_title": report_title.strip(),
        "summary": summary.strip(),
        "created_by": uploaded_by,
        "field_notes": parsed_field_notes,
        "attachments": [
            {
                "file_name": original_filename,
                "stored_file_name": stored_filename,
                "file_url": f"/uploads/{stored_filename}",
                "file_path": str(file_path),
                "content_type": file.content_type,
                "size_bytes": len(file_content)
            }
        ]
    }

    return survey.upload_survey_report_service(
        application_id=application_id,
        report_data=report_data
    )