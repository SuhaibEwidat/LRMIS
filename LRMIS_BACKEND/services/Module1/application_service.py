# ==============================
# services/Module1/application_service.py
# ==============================

from datetime import datetime

from models.application_model import application_model
from repositories.application_repository import ApplicationRepository
from repositories.certificate_repository import CertificateRepository
from repositories.parcels_repository import ParcelsRepository
from services.Module1.geo_validation_engine import validate_geojson
from services.Module1.parcels_service import create_parcel_service
from services.Module1.performance_log_service import log_event


repo = ApplicationRepository()
cert_repo = CertificateRepository()
parcels_repo = ParcelsRepository()


REQUIRED_DOCUMENTS_BY_APPLICATION_TYPE = {
    "first_registration": [
        {"document_type": "id_copy", "label": "ID Copy"},
        {"document_type": "ownership_deed", "label": "Ownership Deed"},
        {"document_type": "parcel_map", "label": "Parcel Map"},
    ],
    "ownership_transfer": [
        {"document_type": "id_copy", "label": "ID Copy"},
        {"document_type": "ownership_deed", "label": "Ownership Deed"},
        {"document_type": "sale_contract", "label": "Sale Contract"},
    ],
    "parcel_subdivision": [
        {"document_type": "id_copy", "label": "ID Copy"},
        {"document_type": "ownership_deed", "label": "Ownership Deed"},
        {"document_type": "parcel_map", "label": "Parcel Map"},
    ],
    "parcel_merge": [
        {"document_type": "id_copy", "label": "ID Copy"},
        {"document_type": "ownership_deed", "label": "Ownership Deed"},
        {"document_type": "parcel_map", "label": "Parcel Map"},
    ],
    "boundary_correction": [
        {"document_type": "id_copy", "label": "ID Copy"},
        {"document_type": "ownership_deed", "label": "Ownership Deed"},
        {"document_type": "parcel_map", "label": "Parcel Map"},
    ],
    "certificate_request": [
        {"document_type": "id_copy", "label": "ID Copy"},
        {"document_type": "ownership_deed", "label": "Ownership Deed"},
    ],
}


def generate_application_id(last_number: int):
    year = datetime.now().year
    return f"LRMIS-{year}-{str(last_number).zfill(4)}"


def _store_parcel_for_application(data: dict):
    parcel_ref = data.get("parcel_ref") or {}
    geometry = data.get("parcel_geometry")

    if not geometry:
        return

    parcel_data = {
        "parcel_code": f"{parcel_ref.get('zone_id')}-{parcel_ref.get('block_number')}-{parcel_ref.get('parcel_number')}",
        "parcel_number": parcel_ref.get("parcel_number"),
        "block_number": parcel_ref.get("block_number"),
        "basin_number": parcel_ref.get("basin_number"),
        "zone_id": parcel_ref.get("zone_id"),
        "current_owner_refs": parcel_ref.get("owner_refs", []),
        "geometry": geometry,
    }

    create_parcel_service(parcel_data)


def build_required_documents(application_type: str) -> list:
    documents = REQUIRED_DOCUMENTS_BY_APPLICATION_TYPE.get(application_type, [])

    return [
        {
            "document_type": document["document_type"],
            "label": document["label"],
            "required": True,
            "status": "missing",
            "uploaded_document_id": None,
            "file_name": None,
            "reviewed_by": None,
            "reviewed_at": None,
            "review_note": None,
        }
        for document in documents
    ]


def create_application_service(data, idempotency_key=None):
    if idempotency_key:
        existing = repo.find_by_idempotency_key(idempotency_key)

        if existing:
            existing["_id"] = str(existing["_id"])
            return existing

    if data.get("parcel_geometry"):
        geo_result = validate_geojson(data["parcel_geometry"])

        if not geo_result["valid"]:
            return {
                "success": False,
                "error": geo_result["errors"],
            }

    last = repo.get_last_application()
    last_number = 1

    if last and "application_id" in last:
        try:
            last_number = int(last["application_id"].split("-")[-1]) + 1
        except ValueError:
            last_number = 1

    application_id = generate_application_id(last_number)

    new_app = application_model(data)
    new_app["application_id"] = application_id

    application_type = (
        new_app.get("application_type")
        or data.get("application_type")
        or (data.get("tags") or [None])[0]
    )

    new_app["application_type"] = application_type
    new_app["required_documents"] = build_required_documents(application_type)

    if idempotency_key:
        new_app["idempotency_key"] = idempotency_key

    repo.create_application(new_app)
    _store_parcel_for_application(data)

    log_event(
        application_id=application_id,
        event_type="application_created",
        actor_type="system",
        actor_id="system_engine",
        meta={"application_type": new_app.get("application_type")},
    )

    return get_application_service(application_id)


def get_application_service(app_id: str):
    app = repo.get_application_by_id(app_id)

    if not app:
        return {
            "success": False,
            "error": f"Application {app_id} not found",
        }

    return app


def list_applications_service(
    skip=0,
    limit=10,
    filters=None,
    sort_by="timestamps.submitted_at",
    order="desc",
):
    query = filters or {}

    data = repo.list_applications(query, skip, limit, sort_by, order)
    total = repo.count_applications(query)

    return {
        "data": data,
        "total": total,
        "page_size": limit,
        "skip": skip,
    }


def transition_application_service(application_id: str, new_state: str):
    allowed_states = [
        "submitted",
        "pending",
        "pre_checked",
        "survey_required",
        "surveyed",
        "legal_review",
        "under_objection",
        "missing_documents",
        "approved",
        "certificate_issued",
        "closed",
        "rejected",
        "on_hold",
    ]

    if new_state not in allowed_states:
        return {
            "success": False,
            "error": f"Invalid application state: {new_state}",
        }

    app = repo.get_application_by_id(application_id)

    if not app:
        return {
            "success": False,
            "error": f"Application {application_id} not found",
        }

    repo.update_workflow_state(application_id, new_state)

    log_event(
        application_id=application_id,
        event_type="application_state_changed",
        actor_type="staff",
        actor_id="registrar",
        meta={
            "new_state": new_state,
        },
    )

    return get_application_service(application_id)


def reject_application_service(application_id: str, reason: str):
    if not reason or not reason.strip():
        return {
            "success": False,
            "error": "Rejection reason is required",
        }

    app = repo.get_application_by_id(application_id)

    if not app:
        return {
            "success": False,
            "error": f"Application {application_id} not found",
        }

    repo.update_workflow_state(
        application_id=application_id,
        new_state="rejected",
        extra_updates={
            "rejection.reason": reason.strip(),
            "rejection.rejected_at": datetime.utcnow(),
        },
    )

    log_event(
        application_id=application_id,
        event_type="application_rejected",
        actor_type="staff",
        actor_id="registrar",
        meta={
            "reason": reason.strip(),
        },
    )

    return get_application_service(application_id)


def add_internal_note_service(application_id: str, note_data: dict):
    app = repo.get_application_by_id(application_id)

    if not app:
        return {
            "success": False,
            "error": f"Application {application_id} not found",
        }

    note_text = note_data.get("note")

    if not note_text or not note_text.strip():
        return {
            "success": False,
            "error": "Note text is required",
        }

    note = {
        "note": note_text.strip(),
        "author_id": note_data.get("author_id"),
        "author_role": note_data.get("author_role", "registrar"),
        "visibility": note_data.get("visibility", "staff_only"),
        "created_at": datetime.utcnow(),
    }

    repo.push_internal_note(application_id, note)

    log_event(
        application_id=application_id,
        event_type="internal_note_added",
        actor_type="staff",
        actor_id=note.get("author_id") or "registrar",
        meta={
            "visibility": note.get("visibility"),
        },
    )

    return {
        "success": True,
        "message": "Internal note added successfully",
        "note": note,
    }


def verify_attachment_service(
    application_id: str,
    document_type: str,
    verification_data: dict,
):
    app = repo.get_application_by_id(application_id)

    if not app:
        return {
            "success": False,
            "error": f"Application {application_id} not found",
        }

    verification_status = verification_data.get("verification_status")
    verified_by = verification_data.get("verified_by")
    review_note = verification_data.get("review_note")

    allowed_statuses = ["verified", "rejected"]

    if verification_status not in allowed_statuses:
        return {
            "success": False,
            "error": "verification_status must be either 'verified' or 'rejected'",
        }

    if not document_type:
        return {
            "success": False,
            "error": "document_type is required",
        }

    result = repo.update_attachment_verification(
        application_id=application_id,
        document_type=document_type,
        verification_status=verification_status,
        verified_by=verified_by,
        review_note=review_note,
    )

    if (
        result["attachment_matched"] == 0
        and result["required_document_matched"] == 0
        and result["document_collection_matched"] == 0
    ):
        return {
            "success": False,
            "error": f"Document {document_type} was not found for application {application_id}",
        }

    log_event(
        application_id=application_id,
        event_type="document_verified"
        if verification_status == "verified"
        else "document_rejected",
        actor_type="staff",
        actor_id=verified_by or "registrar",
        meta={
            "document_type": document_type,
            "verification_status": verification_status,
            "review_note": review_note,
        },
    )

    return {
        "success": True,
        "message": "Document verification updated successfully",
        "application_id": application_id,
        "document_type": document_type,
        "verification_status": verification_status,
        "result": result,
    }