from pydantic import BaseModel
from typing import Optional, List


class ApplicantRef(BaseModel):
    applicant_id: str
    applicant_type: str
    submitted_by_representative: bool = False


class ParcelRef(BaseModel):
    parcel_id: str
    parcel_number: str
    block_number: str
    basin_number: str
    zone_id: str


class ApplicationCreate(BaseModel):
    application_type: str
    priority: Optional[str] = "normal"

    applicant_ref: ApplicantRef
    parcel_ref: ParcelRef

    description: Optional[str] = None
    tags: Optional[List[str]] = []