from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class ContactInfo(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None


class Workload(BaseModel):
    active_tasks: int = 0
    max_tasks: int = 10


class StaffCreate(BaseModel):
    staff_code: str = Field(..., example="SURV-RM-01")
    name: str = Field(..., example="Survey Team A")
    role: Literal["surveyor", "registrar"] = Field(..., example="surveyor")
    department: Optional[str] = Field(default=None, example="Cadastral Survey")

    skills: List[str] = Field(default=[], example=["boundary_survey", "gps_mapping"])
    zone_ids: List[str] = Field(default=[], example=["ZONE-RM-01", "ZONE-RM-02"])

    contacts: Optional[ContactInfo] = None
    workload: Workload = Workload()

    active: bool = True


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    skills: Optional[List[str]] = None
    zone_ids: Optional[List[str]] = None
    contacts: Optional[ContactInfo] = None
    workload: Optional[Workload] = None
    active: Optional[bool] = None


class StaffResponse(BaseModel):
    id: str
    staff_code: str
    name: str
    role: str
    department: Optional[str] = None
    skills: List[str] = []
    zone_ids: List[str] = []
    contacts: Optional[ContactInfo] = None
    workload: Workload
    active: bool
    created_at: datetime