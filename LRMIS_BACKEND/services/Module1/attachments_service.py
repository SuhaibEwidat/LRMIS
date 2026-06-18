from datetime import datetime
from LRMIS_BACKEND.repositories.application_repository import ApplicationRepository
from LRMIS_BACKEND.services.Module1.performance_log_service import log_event

repo = ApplicationRepository()


def add_attachment_service(application_id: str, document_type: str, file_url: str, uploaded_by: str):

    app = repo.get_application_by_id(application_id)
    if not app:
        return {"success": False, "error": "Application not found"}

    attachment = {
        "document_type": document_type,
        "file_url": file_url,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.now(),
        "verification_status": "pending"
    }

    repo.push_attachment(application_id, attachment)

    log_event(
        application_id=application_id,
        event_type="attachment_added",
        actor_type="applicant",
        actor_id=uploaded_by,
        meta={"document_type": document_type}
    )

    updated = repo.get_application_by_id(application_id)
    updated["_id"] = str(updated["_id"])
    return {"success": True, "data": updated}


def update_attachment_verification_service(application_id: str, document_type: str, verification_status: str, verified_by: str):

    if verification_status not in ["verified", "rejected", "pending"]:
        return {"success": False, "error": "Invalid verification status"}

    app = repo.get_application_by_id(application_id)
    if not app:
        return {"success": False, "error": "Application not found"}

    repo.update_attachment_status(application_id, document_type, verification_status)

    log_event(
        application_id=application_id,
        event_type="attachment_verification_updated",
        actor_type="registrar",
        actor_id=verified_by,
        meta={"document_type": document_type, "status": verification_status}
    )

    updated = repo.get_application_by_id(application_id)
    updated["_id"] = str(updated["_id"])
    return {"success": True, "data": updated}