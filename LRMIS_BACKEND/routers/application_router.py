from fastapi import APIRouter, HTTPException

from schemas.application_schema import (
    ApplicationCreate,
    AttachmentCreate,
    AttachmentVerification,
    InternalNoteCreate,
    ObjectionCreate,
    SurveyReportCreate,
)
from services.Module1.application_service import (
    create_application_service,
    get_application_service,
    list_applications_service,
)
from services.Module1.attachments_service import (
    add_attachment_service,
    update_attachment_verification_service,
)
from services.Module1.certificate_service import issue_certificate_service
from services.Module1.internal_notes_service import add_internal_note_service
from services.Module1.transition_service import (
    reject_application_service,
    hold_application_service,
    transition_application_service,
)

router = APIRouter(prefix="/applications", tags=["Module 1 - Applications"])


def _handle_service_result(result: dict):
    if result.get("success") is False:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result.get("data", result)


@router.post("/")
def create_application(payload: ApplicationCreate, idempotency_key: str = None):
    result = create_application_service(
        data=payload.dict(),
        idempotency_key=idempotency_key,
    )
    if isinstance(result, dict) and result.get("success") is False:
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/{application_id}")
def get_application(application_id: str):
    result = get_application_service(application_id)
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@router.get("/")
def list_applications(
    skip: int = 0,
    limit: int = 10,
    status: str = None,
    application_type: str = None,
    zone_id: str = None,
    sort_by: str = "timestamps.submitted_at",
    order: str = "desc",
):
    filters = {}
    if status:
        filters["workflow.current_state"] = status
    if application_type:
        filters["application_type"] = application_type
    if zone_id:
        filters["parcel_ref.zone_id"] = zone_id

    return list_applications_service(
        skip=skip,
        limit=limit,
        filters=filters,
        sort_by=sort_by,
        order=order,
    )


@router.patch("/{application_id}/transition")
def transition(application_id: str, new_state: str):
    return _handle_service_result(
        transition_application_service(application_id, new_state)
    )


@router.post("/{application_id}/hold")
def hold_application(application_id: str, reason: str):
    if not reason:
        raise HTTPException(status_code=400, detail="Hold reason required")
    return _handle_service_result(
        hold_application_service(application_id, reason)
    )


@router.post("/{application_id}/reject")
def reject_application(application_id: str, reason: str):
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason required")
    return _handle_service_result(
        reject_application_service(application_id, reason)
    )


@router.post("/{application_id}/certificate")
def issue_certificate(application_id: str, registrar_id: str):
    result = issue_certificate_service(application_id, registrar_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/{application_id}/attachments")
def add_attachment(application_id: str, payload: AttachmentCreate):
    return _handle_service_result(
        add_attachment_service(
            application_id,
            payload.document_type,
            payload.file_url,
            payload.uploaded_by,
        )
    )


@router.patch("/{application_id}/attachments/{document_type}/verification")
def verify_attachment(
    application_id: str,
    document_type: str,
    payload: AttachmentVerification,
):
    return _handle_service_result(
        update_attachment_verification_service(
            application_id,
            document_type,
            payload.verification_status,
            payload.verified_by,
        )
    )


@router.post("/{application_id}/notes")
def add_internal_note(application_id: str, payload: InternalNoteCreate):
    return _handle_service_result(
        add_internal_note_service(
            application_id,
            payload.note,
            payload.author_id,
            payload.author_role,
        )
    )


