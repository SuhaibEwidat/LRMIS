from datetime import datetime

from core.enums import ApplicationStatus
from models import certificate_model
from repositories.application_repository import ApplicationRepository
from repositories.certificate_repository import CertificateRepository
from services.Module1.performance_log_service import log_event


def generate_certificate_id(last_number: int):

    year = datetime.now().year

    return f"CERT-{year}-{str(last_number).zfill(4)}"


cert_repo = CertificateRepository()
app_repo = ApplicationRepository()

def issue_certificate_service(
        application_id: str,
        registrar_id: str):

    app = app_repo.get_application_by_id(application_id)

    if not app:
        return {
            "success": False,
            "error": "Application not found"
        }

    # الدكتور طالب:
    # cannot issue certificate unless approved

    if app["workflow"]["current_state"] != ApplicationStatus.approved.value:
        return {
            "success": False,
            "error": "Application must be approved first"
        }

    existing = cert_repo.get_application_by_id(application_id)

    if existing:
        return {
            "success": False,
            "error": "Certificate already issued"
        }

    last_number = 1

    certificate_id = generate_certificate_id(last_number)

    certificate = certificate_model({
        "certificate_id": certificate_id,

        "application_id": application_id,

        "parcel_id": app["parcel_ref"]["parcel_id"],

        "applicant_id": app["applicant_ref"]["applicant_id"],

        "full_name": app.get("applicant_name"),

        "issued_by": registrar_id,

        "qr_code_url":
            f"/certificates/{certificate_id}/verify",

        "digital_signature_stub":
            "signed_hash_example"
    })

    cert_repo.create(certificate)

    # update workflow

    app_repo.update_workflow_state(
        application_id,
        ApplicationStatus.certificate_issued.value
    )

    # audit

    log_event(
        application_id=application_id,
        event_type="certificate_issued",
        actor_type="registrar",
        actor_id=registrar_id,
        meta={
            "certificate_id": certificate_id
        }
    )

    return {
        "success": True,
        "certificate_id": certificate_id
    }