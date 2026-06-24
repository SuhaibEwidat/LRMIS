from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException

from repositories.application_repository import ApplicationRepository
from repositories import staff, survey_task, performance_log


app_repo = ApplicationRepository()


REQUIRED_SKILLS_BY_APPLICATION_TYPE = {
    "first_registration": ["gps_mapping"],
    "ownership_transfer": ["boundary_survey"],
    "parcel_subdivision": ["parcel_subdivision"],
    "parcel_merge": ["boundary_survey"],
    "boundary_correction": ["boundary_survey", "gps_mapping"],
    "certificate_request": []
}


def get_required_skills(application_type: str):
    return REQUIRED_SKILLS_BY_APPLICATION_TYPE.get(application_type, [])


def auto_assign_surveyor_service(application_id: str):
    """
    Automatically assign a surveyor to an application.

    Policy:
    - application must be in survey_required
    - surveyor must be active
    - surveyor must cover same zone
    - surveyor workload must be less than max_tasks
    - surveyor should match required skills
    """

    application = app_repo.get_application_by_id(application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    current_state = (
        application.get("workflow", {}).get("current_state")
        or application.get("status")
    )

    if current_state != "survey_required":
        raise HTTPException(
            status_code=400,
            detail="Application must be in survey_required state before auto assignment"
        )

    existing_task = survey_task.get_task_by_application_id(application_id)

    if existing_task:
        return {
            "message": "Survey task already exists for this application",
            "survey_task": existing_task
        }

    parcel_ref = application.get("parcel_ref") or {}
    zone_id = parcel_ref.get("zone_id")

    if not zone_id:
        raise HTTPException(
            status_code=400,
            detail="Application parcel zone_id is required for auto assignment"
        )

    application_type = application.get("application_type")
    required_skills = get_required_skills(application_type)

    available_surveyors = staff.find_available_surveyors(
        zone_id=zone_id,
        required_skills=required_skills
    )

    if not available_surveyors:
        raise HTTPException(
            status_code=404,
            detail="No available surveyor found for this zone, workload, and skills"
        )

    selected_surveyor = available_surveyors[0]

    assigned_surveyor_id = selected_surveyor.get("_id")
    assigned_surveyor_code = selected_surveyor.get("staff_code")

    now = datetime.utcnow()

    task_data = {
        "task_id": f"SURV-{now.year}-{uuid4().hex[:8].upper()}",
        "application_id": application_id,
        "parcel_id": parcel_ref.get("parcel_id"),
        "parcel_number": parcel_ref.get("parcel_number"),
        "zone_id": zone_id,
        "priority": application.get("priority", "normal"),

        "assigned_surveyor_id": assigned_surveyor_id,
        "assigned_surveyor_code": assigned_surveyor_code,

        "status": "assigned",
        "scheduled_visit_date": None,

        "milestones": [
            {
                "type": "assigned",
                "at": now,
                "by": "system",
                "meta": {
                    "reason": "auto assignment",
                    "policy": "zone + workload + skills",
                    "zone_id": zone_id,
                    "required_skills": required_skills
                }
            }
        ],

        "field_notes": [],
        "report_uploaded": False,
        "created_at": now,
        "updated_at": now
    }

    created_task = survey_task.create_survey_task(task_data)

    updated_surveyor = staff.increase_active_tasks(
        staff_id=assigned_surveyor_id,
        amount=1
    )

    app_repo.set_fields(
        application_id,
        {
            "assignment.assigned_surveyor_id": assigned_surveyor_id,
            "assignment.assigned_surveyor_code": assigned_surveyor_code,
            "assignment.assignment_policy": "zone+workload+skills",
            "assignment.assigned_at": now
        }
    )

    performance_log.add_event(
        application_id=application_id,
        event_type="survey_assigned",
        actor_type="system",
        actor_id="assignment_engine",
        meta={
            "assigned_surveyor_id": assigned_surveyor_id,
            "assigned_surveyor_code": assigned_surveyor_code,
            "zone_id": zone_id,
            "required_skills": required_skills
        }
    )

    return {
        "message": "Surveyor assigned successfully",
        "assigned_surveyor": updated_surveyor,
        "survey_task": created_task
    }