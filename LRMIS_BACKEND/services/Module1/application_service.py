from datetime import datetime

from models.application_model import application_model
from models.parcels_model import parcel_model
from repositories.application_repository import ApplicationRepository
from repositories.certificate_repository import CertificateRepository
from repositories.parcels_repository import ParcelsRepository
from services.Module1.geo_validation_engine import validate_geojson
from services.Module1.parcels_service import create_parcel_service
from services.Module1.performance_log_service import log_event

repo = ApplicationRepository()
cert_repo = CertificateRepository()
parcels_repo = ParcelsRepository()


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
            return {"success": False, "error": geo_result["errors"]}

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
        return {"success": False, "error": f"Application {app_id} not found"}

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