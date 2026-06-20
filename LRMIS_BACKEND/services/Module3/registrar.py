from datetime import datetime
from email.mime import application
from fastapi import HTTPException

from repositories import survey_task,survey_report,application_repository,performance_log,staff



DECISION_TO_APPLICATION_STATUS = {
    "approved": "legal_review",
    "needs_correction": "on_hold",
    "rejected": "rejected"
}


def registrar_review_service(
    application_id: str,
    decision: str,
    reviewed_by: str,
    notes: str = None
):
    """
    Registrar reviews the survey report.

    allowed decisions:
    - approved
    - needs_correction
    - rejected
    """

    if decision not in DECISION_TO_APPLICATION_STATUS:
        raise HTTPException(
            status_code=400,
            detail="Decision must be approved, needs_correction, or rejected"
        )

    registrar = staff.get_staff_by_id(reviewed_by)

    if not registrar:
        raise HTTPException(status_code=404, detail="Registrar not found")

    if registrar.get("role") != "registrar":
        raise HTTPException(
            status_code=403,
            detail="Only registrar can review survey reports"
        )

    task = survey_task.get_task_by_application_id(application_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Survey task not found for this application"
        )

    if task.get("status") != "report_uploaded":
        raise HTTPException(
            status_code=400,
            detail="Registrar review is only allowed after report_uploaded"
        )

    report = survey_report.get_report_by_application_id(application_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Survey report not found"
        )

    next_status = DECISION_TO_APPLICATION_STATUS[decision]

    review_data = {
        "decision": decision,
        "notes": notes,
        "reviewed_by": reviewed_by,
        "reviewed_at": datetime.utcnow()
    }

    updated_report = survey_report.update_report_status(
        application_id=application_id,
        status=f"registrar_{decision}",
        review_data=review_data
    )

    updated_task = survey_task.mark_registrar_reviewed(
        application_id=application_id,
        registrar_id=reviewed_by,
        decision=decision
    )

    updated_application = application_repository.save_registrar_review(
        application_id=application_id,
        review_data=review_data,
        next_status=next_status
    )

    performance_log.add_event(
        application_id=application_id,
        event_type="registrar_reviewed",
        actor_type="registrar",
        actor_id=reviewed_by,
        meta={
            "decision": decision,
            "next_application_status": next_status,
            "notes": notes
        }
    )

    return {
        "message": "Registrar review completed successfully",
        "decision": decision,
        "next_application_status": next_status,
        "survey_report": updated_report,
        "survey_task": updated_task,
        "application": updated_application
    }