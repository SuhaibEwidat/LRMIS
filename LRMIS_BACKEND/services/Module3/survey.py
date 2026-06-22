from datetime import datetime
from fastapi import HTTPException

from repositories import (
    survey_task,
    survey_report,
    application_repository,
    performance_log
)


SURVEY_MILESTONE_ORDER = [
    "assigned",
    "visit_scheduled",
    "arrived_on_site",
    "survey_started",
    "survey_completed",
    "report_uploaded",
    "registrar_reviewed"
]


def validate_next_milestone(current_status: str, next_milestone: str):
    """
    Prevent jumping between survey milestones.
    Example:
    assigned -> visit_scheduled is allowed
    assigned -> survey_completed is not allowed
    """

    if current_status not in SURVEY_MILESTONE_ORDER:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid current survey status: {current_status}"
        )

    if next_milestone not in SURVEY_MILESTONE_ORDER:
        raise HTTPException(
            status_code=400,
            detail="Invalid survey milestone"
        )

    current_index = SURVEY_MILESTONE_ORDER.index(current_status)
    next_index = SURVEY_MILESTONE_ORDER.index(next_milestone)

    if next_index != current_index + 1:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid milestone transition from {current_status} to {next_milestone}"
        )


def add_survey_milestone_service(
    application_id: str,
    milestone_type: str,
    by: str,
    meta: dict = None
):
    """
    Add survey milestone after validation.

    This is used by:
    PATCH /applications/{application_id}/survey-milestone

    Supported flow:
    assigned -> visit_scheduled -> arrived_on_site -> survey_started -> survey_completed
    """

    task = survey_task.get_task_by_application_id(application_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Survey task not found for this application"
        )

    current_status = task.get("status")

    validate_next_milestone(current_status, milestone_type)

    meta = meta or {}

    # Special case:
    # When milestone is visit_scheduled, we also need to store scheduled_visit_date
    if milestone_type == "visit_scheduled":
        scheduled_visit_date = meta.get("scheduled_visit_date")

        if not scheduled_visit_date:
            raise HTTPException(
                status_code=400,
                detail="scheduled_visit_date is required for visit_scheduled milestone"
            )

        updated_task = survey_task.set_scheduled_visit(
            application_id=application_id,
            scheduled_visit_date=scheduled_visit_date,
            by=by
        )

    else:
        updated_task = survey_task.add_milestone(
            application_id=application_id,
            milestone_type=milestone_type,
            by=by,
            meta=meta
        )

    performance_log.add_event(
        application_id=application_id,
        event_type=milestone_type,
        actor_type="surveyor",
        actor_id=by,
        meta=meta
    )

    return {
        "message": "Survey milestone updated successfully",
        "survey_task": updated_task
    }


def schedule_visit_service(
    application_id: str,
    scheduled_visit_date: str,
    by: str
):
    """
    Schedule field visit.
    This moves task from assigned to visit_scheduled.

    This is used by:
    POST /applications/{application_id}/schedule-visit

    We keep it because it already exists in your router,
    but the frontend can also use PATCH /survey-milestone.
    """

    task = survey_task.get_task_by_application_id(application_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Survey task not found for this application"
        )

    current_status = task.get("status")

    validate_next_milestone(current_status, "visit_scheduled")

    updated_task = survey_task.set_scheduled_visit(
        application_id=application_id,
        scheduled_visit_date=scheduled_visit_date,
        by=by
    )

    performance_log.add_event(
        application_id=application_id,
        event_type="visit_scheduled",
        actor_type="surveyor",
        actor_id=by,
        meta={
            "scheduled_visit_date": scheduled_visit_date
        }
    )

    return {
        "message": "Visit scheduled successfully",
        "survey_task": updated_task
    }


def add_field_note_service(application_id: str, note: str):
    """
    Add field note to survey task.
    """

    task = survey_task.get_task_by_application_id(application_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Survey task not found for this application"
        )

    if not note or not note.strip():
        raise HTTPException(
            status_code=400,
            detail="Field note cannot be empty"
        )

    updated_task = survey_task.add_field_note(
        application_id=application_id,
        note=note.strip()
    )

    performance_log.add_event(
        application_id=application_id,
        event_type="field_note_added",
        actor_type="surveyor",
        actor_id=str(task.get("assigned_surveyor_id", "surveyor")),
        meta={
            "note": note.strip()
        }
    )

    return {
        "message": "Field note added successfully",
        "survey_task": updated_task
    }


def upload_survey_report_service(application_id: str, report_data: dict):
    """
    Upload/register survey report metadata.

    This is called after the router saves the real file in uploads folder.

    Only allowed after survey_completed.
    After upload:
    - create survey report metadata in survey_reports
    - mark task as report_uploaded
    - mark application as surveyed
    - add event to performance_logs
    """

    task = survey_task.get_task_by_application_id(application_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Survey task not found for this application"
        )

    if task.get("status") != "survey_completed":
        raise HTTPException(
            status_code=400,
            detail="Survey report can only be uploaded after survey_completed"
        )

    created_by = (
        report_data.get("created_by")
        or report_data.get("uploaded_by")
        or task.get("assigned_surveyor_id")
        or "surveyor"
    )

    report_data["application_id"] = application_id
    report_data["task_id"] = task.get("task_id")
    report_data["survey_task_ref"] = task.get("_id")
    report_data["created_by"] = str(created_by)
    report_data.setdefault("submitted_at", datetime.utcnow())
    report_data.setdefault("field_notes", [])
    report_data.setdefault("attachments", [])

    created_report = survey_report.create_survey_report(report_data)

    updated_task = survey_task.mark_report_uploaded(application_id)

    updated_application = application_repository.mark_application_surveyed(
        application_id
    )

    performance_log.add_event(
        application_id=application_id,
        event_type="report_uploaded",
        actor_type="surveyor",
        actor_id=str(created_by),
        meta={
            "report_id": created_report.get("_id"),
            "task_id": task.get("task_id"),
            "attachments": report_data.get("attachments", [])
        }
    )

    return {
        "message": "Survey report uploaded successfully",
        "survey_report": created_report,
        "survey_task": updated_task,
        "application": updated_application
    }