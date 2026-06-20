from datetime import datetime
from database.database import db
from repositories.mongo_utils import to_object_id, serialize_mongo


survey_reports_collection = db["survey_reports"]


def create_survey_report(report_data: dict):
    """
    Create survey report metadata.
    """
    now = datetime.utcnow()

    report_data.setdefault("status", "pending_registrar_review")
    report_data.setdefault("created_at", now)
    report_data.setdefault("updated_at", now)

    result = survey_reports_collection.insert_one(report_data)
    return get_report_by_id(str(result.inserted_id))


def get_report_by_id(report_id: str):
    """
    Get survey report by MongoDB _id or report_id.
    """
    object_id = to_object_id(report_id)

    if object_id:
        query = {"_id": object_id}
    else:
        query = {"report_id": report_id}

    report = survey_reports_collection.find_one(query)
    return serialize_mongo(report)


def get_report_by_application_id(application_id: str):
    """
    Get latest survey report for an application.
    """
    report = survey_reports_collection.find_one(
        {"application_id": application_id},
        sort=[("created_at", -1)]
    )

    return serialize_mongo(report)


def get_report_by_task_id(task_id: str):
    """
    Get survey report by task_id.
    """
    report = survey_reports_collection.find_one({"task_id": task_id})
    return serialize_mongo(report)


def list_reports_by_surveyor(surveyor_id: str):
    """
    List all reports created by a surveyor.
    """
    reports = list(
        survey_reports_collection.find(
            {"created_by": surveyor_id}
        ).sort("created_at", -1)
    )

    return serialize_mongo(reports)


def update_report_status(application_id: str, status: str, review_data: dict = None):
    """
    Update report status after registrar review.
    """
    update_fields = {
        "status": status,
        "updated_at": datetime.utcnow()
    }

    if review_data:
        update_fields["registrar_review"] = review_data

    survey_reports_collection.update_one(
        {"application_id": application_id},
        {"$set": update_fields}
    )

    return get_report_by_application_id(application_id)