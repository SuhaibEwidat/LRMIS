from pymongo import ASCENDING, GEOSPHERE
from database.database import get_database


def create_mongodb_indexes():
    db = get_database()

    db["land_applications"].create_index(
        [("application_id", ASCENDING)],
        unique=True
    )

    db["land_applications"].create_index(
        [("status", ASCENDING)]
    )

    db["land_applications"].create_index(
        [("application_type", ASCENDING)]
    )

    db["land_applications"].create_index(
        [("parcel_ref.parcel_number", ASCENDING)]
    )

    db["land_applications"].create_index(
        [("parcel_ref.zone_id", ASCENDING)]
    )

    db["land_applications"].create_index(
        [("timestamps.submitted_at", ASCENDING)]
    )

    db["parcels"].create_index(
        [("parcel_code", ASCENDING)],
        unique=True
    )

    db["parcels"].create_index(
        [("geometry", GEOSPHERE)]
    )

    db["parcels"].create_index(
        [("zone_id", ASCENDING)]
    )

    db["applicants"].create_index(
        [("identity.national_id", ASCENDING)],
        unique=True
    )

    db["staff_members"].create_index(
        [("staff_code", ASCENDING)],
        unique=True
    )

    db["survey_tasks"].create_index(
        [("application_id", ASCENDING)]
    )

    db["certificates"].create_index(
        [("certificate_id", ASCENDING)],
        unique=True
    )

    print("MongoDB indexes created successfully.")