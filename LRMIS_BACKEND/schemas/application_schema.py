from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from typing import Literal

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
    owner_refs: Optional[List[str]] = Field(default_factory=list)


class ApplicationCreate(BaseModel):
    application_type: str
    priority: Optional[str] = "normal"
    applicant_ref: ApplicantRef
    parcel_ref: ParcelRef
    parcel_geometry: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)


class AttachmentCreate(BaseModel):
    document_type: str
    file_url: str
    uploaded_by: str


class AttachmentVerification(BaseModel):
    verification_status: str
    verified_by: str


class InternalNoteCreate(BaseModel):
    note: str
    author_id: str
    author_role: str = "registrar"
    visibility: Literal["staff_only", "applicant", "public"] = "staff_only"


