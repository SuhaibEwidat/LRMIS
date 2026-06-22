from fastapi import HTTPException

from repositories import staff as staff_repo
from repositories import survey_task as survey_task_repo


def create_staff_service(staff_data: dict):
    """
    Create a new staff member.
    Staff can be surveyor or registrar.
    """

    if not staff_data.get("staff_code"):
        raise HTTPException(status_code=400, detail="staff_code is required")

    if not staff_data.get("name"):
        raise HTTPException(status_code=400, detail="name is required")

    if not staff_data.get("role"):
        raise HTTPException(status_code=400, detail="role is required")

    if staff_data["role"] not in ["surveyor", "registrar"]:
        raise HTTPException(
            status_code=400,
            detail="role must be either surveyor or registrar"
        )

    existing_staff = staff_repo.get_staff_by_code(staff_data["staff_code"])

    if existing_staff:
        raise HTTPException(status_code=409, detail="Staff code already exists")

    if staff_data["role"] == "surveyor":
        staff_data.setdefault("skills", [])
        staff_data.setdefault("coverage", {"zone_ids": []})
        staff_data.setdefault(
            "workload",
            {
                "active_tasks": 0,
                "max_tasks": 10
            }
        )

    staff_data.setdefault("active", True)

    return staff_repo.create_staff(staff_data)


def get_staff_service(staff_id: str):
    """
    Get staff by id or staff_code.
    If staff is surveyor, return assigned survey tasks.
    """

    staff_data = staff_repo.get_staff_by_id(staff_id)

    if not staff_data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    if staff_data.get("role") == "surveyor":
        assigned_tasks = survey_task_repo.list_tasks_by_surveyor(staff_id)
        staff_data["assigned_tasks"] = assigned_tasks
    else:
        staff_data["assigned_tasks"] = []

    return staff_data


def list_staff_service(role: str = None, active: bool = None):
    """
    List staff members.
    Optional filters: role and active.
    """

    return staff_repo.list_staff(role=role, active=active)


def update_staff_service(staff_id: str, update_data: dict):
    """
    Update staff information.
    """

    staff_data = staff_repo.get_staff_by_id(staff_id)

    if not staff_data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return staff_repo.update_staff(staff_id, update_data)


def deactivate_staff_service(staff_id: str):
    """
    Deactivate staff instead of deleting.
    """

    staff_data = staff_repo.get_staff_by_id(staff_id)

    if not staff_data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return staff_repo.deactivate_staff(staff_id)