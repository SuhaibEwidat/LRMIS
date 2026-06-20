from typing import Optional, List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel


from services import auth as auth_service


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


class IdentityRequest(BaseModel):
    national_id: Optional[str] = None
    registration_number: Optional[str] = None


class ContactsRequest(BaseModel):
    phone: Optional[str] = None


class AddressRequest(BaseModel):
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    street: Optional[str] = None
    zone_id: Optional[str] = None


class NotificationsRequest(BaseModel):
    email: Optional[bool] = True
    sms: Optional[bool] = False
    on_status_change: Optional[bool] = True
    on_missing_documents: Optional[bool] = True
    on_certificate_ready: Optional[bool] = True


class PreferencesRequest(BaseModel):
    language: Optional[str] = "ar"
    preferred_contact: Optional[str] = "email"
    notifications: Optional[NotificationsRequest] = NotificationsRequest()


class PrivacySettingsRequest(BaseModel):
    show_contact_to_staff: Optional[bool] = True


class CoverageRequest(BaseModel):
    zone_ids: Optional[List[str]] = []


class WorkloadRequest(BaseModel):
    active_tasks: Optional[int] = 0
    max_tasks: Optional[int] = 10


class RegisterRequest(BaseModel):
    email: str
    password: str
    account_type: str

    # applicant fields
    full_name: Optional[str] = None
    applicant_type: Optional[str] = None
    identity: Optional[IdentityRequest] = None
    contacts: Optional[ContactsRequest] = None
    address: Optional[AddressRequest] = None
    preferences: Optional[PreferencesRequest] = None
    privacy_settings: Optional[PrivacySettingsRequest] = None

    # staff fields
    staff_code: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    skills: Optional[List[str]] = []
    coverage: Optional[CoverageRequest] = None
    workload: Optional[WorkloadRequest] = None
    active: Optional[bool] = True


class LoginRequest(BaseModel):
    email: str
    password: str


def model_to_dict(model):
    try:
        return model.model_dump(exclude_unset=True)
    except AttributeError:
        return model.dict(exclude_unset=True)


@router.post("/register")
def register(request: RegisterRequest):
    data = model_to_dict(request)
    return auth_service.register_service(data)


@router.post("/login")
def login(request: LoginRequest):
    data = model_to_dict(request)
    return auth_service.login_service(data)