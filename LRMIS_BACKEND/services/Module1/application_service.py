from datetime import datetime
from LRMIS_BACKEND.core.enums import ApplicationStatus
from LRMIS_BACKEND.models import application_model
from LRMIS_BACKEND.repositories.application_repository import ApplicationRepository

repo = ApplicationRepository()


def generate_application_id(last_number: int):
    year = datetime.now().year
    return f"LRMIS-{year}-{str(last_number).zfill(4)}"


def create_application_service(data, idempotency_key=None):

    # 1. check duplicate via idempotency key
    if idempotency_key:
        existing = repo.find_by_idempotency_key(idempotency_key)
        if existing:
            existing["_id"] = str(existing["_id"])
            return existing

    # 2. get last application safely via repo
    last = repo.get_last_application()
    last_number = 1

    if last and "application_id" in last:
        try:
            last_number = int(last["application_id"].split("-")[-1]) + 1
        except:
            last_number = 1

    application_id = generate_application_id(last_number)

    # 3. build document
    new_app = application_model(data)
    new_app["application_id"] = application_id

    # 4. timestamps
    if "timestamps" not in new_app:
        new_app["timestamps"] = {}

    new_app["timestamps"]["submitted_at"] = datetime.now()

    # 5. insert via repository
    inserted_id = repo.create_application(new_app)

    return repo.get_application_by_id(inserted_id)


def get_application_service(app_id):
    return repo.get_application_by_id(app_id)


def list_applications_service(skip=0, limit=10, filters=None,sort_by="timestamps.submitted_at",order="desc"):
    query = filters or {}

    data = repo.list_applications(query, skip, limit)
    total = repo.count_applications(query)

    return {
        "data": data,
        "total": total,
        "page_size": limit,
        "skip": skip
    }