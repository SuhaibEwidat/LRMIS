from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.Module3 import staff


router = APIRouter(
    prefix="/staff",
    tags=["Model 3 - Staff"]
)


class StaffCreateRequest(BaseModel):
    staff_code: str
    name: str
    role: str  # surveyor or registrar
    department: Optional[str] = None

    skills: List[str] = Field(default_factory=list)
    zone_ids: List[str] = Field(default_factory=list)

    active_tasks: int = 0
    max_tasks: int = 10

    phone: Optional[str] = None
    email: Optional[str] = None
    active: bool = True


class StaffUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None

    skills: Optional[List[str]] = None
    zone_ids: Optional[List[str]] = None

    active_tasks: Optional[int] = None
    max_tasks: Optional[int] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    active: Optional[bool] = None


def model_to_dict(model):
    try:
        return model.model_dump(exclude_unset=True)
    except AttributeError:
        return model.dict(exclude_unset=True)


@router.post("/")
def create_staff(request: StaffCreateRequest):
    data = model_to_dict(request)

    staff_data = {
        "staff_code": data["staff_code"],
        "name": data["name"],
        "role": data["role"],
        "department": data.get("department"),
        "skills": data.get("skills", []),
        "coverage": {
            "zone_ids": data.get("zone_ids", [])
        },
        "workload": {
            "active_tasks": data.get("active_tasks", 0),
            "max_tasks": data.get("max_tasks", 10)
        },
        "contacts": {
            "phone": data.get("phone"),
            "email": data.get("email")
        },
        "active": data.get("active", True)
    }

    return staff.create_staff_service(staff_data)


@router.get("/")
def list_staff(role: Optional[str] = None, active: Optional[bool] = None):
    return staff.list_staff_service(role=role, active=active)


@router.get("/{staff_id}")
def get_staff(staff_id: str):
    return staff.get_staff_service(staff_id)


@router.patch("/{staff_id}")
def update_staff(staff_id: str, request: StaffUpdateRequest):
    data = model_to_dict(request)

    update_data: Dict[str, Any] = {}

    if "name" in data:
        update_data["name"] = data["name"]

    if "role" in data:
        update_data["role"] = data["role"]

    if "department" in data:
        update_data["department"] = data["department"]

    if "skills" in data:
        update_data["skills"] = data["skills"]

    if "zone_ids" in data:
        update_data["coverage.zone_ids"] = data["zone_ids"]

    if "active_tasks" in data:
        update_data["workload.active_tasks"] = data["active_tasks"]

    if "max_tasks" in data:
        update_data["workload.max_tasks"] = data["max_tasks"]

    if "phone" in data:
        update_data["contacts.phone"] = data["phone"]

    if "email" in data:
        update_data["contacts.email"] = data["email"]

    if "active" in data:
        update_data["active"] = data["active"]

    return staff.update_staff_service(staff_id, update_data)


@router.delete("/{staff_id}")
def deactivate_staff(staff_id: str):
    return staff.deactivate_staff_service(staff_id)