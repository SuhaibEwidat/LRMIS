from enum import Enum
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.Module2 import applicant_service


router = APIRouter(
    tags=["Module 2 - Applicant Portal"]
)


@router.get("/applicants/ping")
def applicant_module_ping():
    return applicant_service.applicant_module_ping()


class ApplicantType(str, Enum):
    citizen = "citizen"
    lawyer = "lawyer"
    company = "company"
    surveyor = "surveyor"
    authorized_representative = "authorized_representative"


# BaseModel is used to create schemas for request body

class IdentityRequest(BaseModel):
    national_id: Optional[str] = None
    registration_number: Optional[str] = None


class ContactRequest(BaseModel):
    email: str
    phone: str


class AddressRequest(BaseModel):
    city: str
    neighborhood: str
    zone_id: str


class NotificationsRequest(BaseModel):
    on_status_change: bool = True
    on_missing_documents: bool = True
    on_certificate_ready: bool = True


class PreferencesRequest(BaseModel):
    preferred_contact: str = "email"
    language: str = "ar"
    notifications: NotificationsRequest = Field(default_factory=NotificationsRequest)


class PrivacySettingsRequest(BaseModel):
    show_phone_to_staff: bool = True
    show_email_to_staff: bool = True


class ApplicantCreateRequest(BaseModel):
    full_name: str
    applicant_type: ApplicantType
    identity: IdentityRequest
    contacts: ContactRequest
    address: AddressRequest
    preferences: PreferencesRequest = Field(default_factory=PreferencesRequest)
    privacy_settings: PrivacySettingsRequest = Field(default_factory=PrivacySettingsRequest)

class DocumentCreateRequest(BaseModel):
    document_type: str
    file_name: str
    file_url: Optional[str] = None
    uploaded_by: str
    notes: Optional[str] = None

class CommentRequest(BaseModel):
    actor_id: str
    comment: str    

class ObjectionRequest(BaseModel):
    submitted_by: str
    reason: str
    description: Optional[str] = None

# we use it becuase fastAPI take the json Request and convert it to pydantic Object
def model_to_dict(model):
    try:
        return model.model_dump(exclude_none=True, mode="json")
    except TypeError:
        return model.model_dump(exclude_none=True)
    except AttributeError:
        return model.dict(exclude_none=True)


@router.post("/applicants/")
def create_applicant(request: ApplicantCreateRequest):
    data = model_to_dict(request)
    return applicant_service.create_applicant_service(data)

@router.get("/applicants/{applicant_id}")
def getApplicant(applicant_id:str):
    return applicant_service.getApplicantService(applicant_id)

@router.get("/applicants/{applicant_id}/applications")
def get_applicant_applications(applicant_id: str):
    return applicant_service.get_applicant_applications_service(applicant_id)

@router.post("/applications/{application_id}/documents")
def add_application_doucment(application_id:str,request:DocumentCreateRequest):
    data=model_to_dict(request)
    return applicant_service.add_application_document_service(application_id,data)

@router.post("/applications/{application_id}/comments")
def add_application_comment(application_id:str,request:CommentRequest):
    data=model_to_dict(request)
    return applicant_service.add_application_comment_service(application_id,data)

@router.post("/applications/{application_id}/objections")
def add_objection(application_id:str,request:ObjectionRequest):
    data=model_to_dict(request)
    return applicant_service.submit_objection_service(application_id,data)

@router.get("/applications/{application_id}/timeline")
def get_application_timeline(application_id: str):
    return applicant_service.get_application_timeline_service(application_id)