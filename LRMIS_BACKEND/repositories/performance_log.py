from datetime import datetime
from database.database import db
from repositories.mongo_utils import serialize_mongo


performance_logs_collection = db["performance_logs"]


def add_event(
    application_id: str,
    event_type: str,
    actor_type: str,
    actor_id: str,
    meta: dict = None
):
    """
    Add event to application performance log.
    """
    now = datetime.utcnow()

    event = {
        "type": event_type,
        "by": {
            "actor_type": actor_type,
            "actor_id": actor_id
        },
        "at": now,
        "meta": meta or {}
    }

    performance_logs_collection.update_one(
        {"application_id": application_id},
        {
            "$setOnInsert": {
                "application_id": application_id,
                "created_at": now,
                "computed_kpis": {
                    "processing_days": None,
                    "survey_delay_days": None,
                    "certificate_issued": False
                }
            },
            "$push": {
                "event_stream": event
            },
            "$set": {
                "updated_at": now
            }
        },
        upsert=True
    )

    return get_log_by_application_id(application_id)


def get_log_by_application_id(application_id: str):
    """
    Get performance log for an application.
    """
    log = performance_logs_collection.find_one({"application_id": application_id})
    return serialize_mongo(log)


def update_computed_kpis(application_id: str, kpis: dict):
    """
    Update computed KPIs for an application.
    """
    performance_logs_collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "computed_kpis": kpis,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return get_log_by_application_id(application_id)