from datetime import datetime

from core.enums import ApplicationStatus
from models import certificate_model
from repositories.application_repository import ApplicationRepository
from repositories.certificate_repository import CertificateRepository
from services.Module1.performance_log_service import log_event

cert_repo = CertificateRepository()
app_repo = ApplicationRepository()


def generate_certificate_id(last_number: int):
    year = datetime.now().year
    return f"CERT-{year}-{str(last_number).zfill(4)}"


def issue_certificate_service(application_id: str, registrar_id: str):
    app = app_repo.get_application_by_id(application_id)

    if not app:
        return {"success": False, "error": "Application not found"}

    if app["workflow"]["current_state"] != ApplicationStatus.approved.value:
        return {"success": False, "error": "Application must be approved first"}

    existing = cert_repo.get_application_by_id(application_id)
    if existing:
        return {"success": False, "error": "Certificate already issued"}

    last = cert_repo.get_last_certificate()
    last_number = 1
    if last and last.get("certificate_id"):
        try:
            last_number = int(last["certificate_id"].split("-")[-1]) + 1
        except ValueError:
            last_number = 1

    certificate_id = generate_certificate_id(last_number)

    certificate = certificate_model({
        "certificate_id": certificate_id,
        "application_id": application_id,
        "parcel_id": app["parcel_ref"]["parcel_id"],
        "applicant_id": app["applicant_ref"]["applicant_id"],
        "full_name": app["applicant_ref"].get("applicant_id"),
        "issued_by": registrar_id,
        "qr_code_url": f"/certificates/{certificate_id}/verify",
        "digital_signature_stub": "signed_hash_example",
    })

    cert_repo.create(certificate)

    app_repo.update_workflow_state(
        application_id,
        ApplicationStatus.certificate_issued.value,
        extra_updates={
            "certificate.issued": True,
            "certificate.certificate_id": certificate_id,
            "timestamps.certificate_issued_at": datetime.now(),
        },
    )

    log_event(
        application_id=application_id,
        event_type="certificate_issued",
        actor_type="registrar",
        actor_id=registrar_id,
        meta={"certificate_id": certificate_id},
    )

    return {
        "success": True,
        "certificate_id": certificate_id,
        "certificate": certificate,
    }
