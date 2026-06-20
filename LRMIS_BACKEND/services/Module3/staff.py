from fastapi import HTTPException

from repositories import staff


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

    existing_staff = staff.get_staff_by_code(staff_data["staff_code"])
    if existing_staff:
        raise HTTPException(status_code=409, detail="Staff code already exists")

    if staff_data["role"] == "surveyor":
        staff_data.setdefault("skills", [])
        staff_data.setdefault("coverage", {"zone_ids": []})
        staff_data.setdefault("workload", {
            "active_tasks": 0,
            "max_tasks": 10
        })

    staff_data.setdefault("active", True)

    return staff.create_staff(staff_data)


def get_staff_service(staff_id: str):
    """
    Get staff by id or staff_code.
    """

    staff = staff.get_staff_by_id(staff_id)

    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return staff


def list_staff_service(role: str = None, active: bool = None):
    """
    List staff members.
    Optional filters: role and active.
    """

    return staff.list_staff(role=role, active=active)


def update_staff_service(staff_id: str, update_data: dict):
    """
    Update staff information.
    """

    staff = staff.get_staff_by_id(staff_id)

    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return staff.update_staff(staff_id, update_data)


def deactivate_staff_service(staff_id: str):
    """
    Deactivate staff instead of deleting.
    """

    staff = staff.get_staff_by_id(staff_id)

    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return staff.deactivate_staff(staff_id)