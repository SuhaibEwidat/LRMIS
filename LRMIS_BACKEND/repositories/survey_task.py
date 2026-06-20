from datetime import datetime
from database.database import db
from repositories.mongo_utils import to_object_id, serialize_mongo


survey_tasks_collection = db["survey_tasks"]


def create_survey_task(task_data: dict):
    """
    Create a new survey task.
    """
    now = datetime.utcnow()

    task_data.setdefault("status", "assigned")
    task_data.setdefault("milestones", [])
    task_data.setdefault("field_notes", [])
    task_data.setdefault("report_uploaded", False)
    task_data.setdefault("created_at", now)
    task_data.setdefault("updated_at", now)

    result = survey_tasks_collection.insert_one(task_data)
    return get_task_by_id(str(result.inserted_id))


def get_task_by_id(task_id: str):
    """
    Get survey task by MongoDB _id or task_id.
    """
    object_id = to_object_id(task_id)

    if object_id:
        query = {"_id": object_id}
    else:
        query = {"task_id": task_id}

    task = survey_tasks_collection.find_one(query)
    return serialize_mongo(task)


def get_task_by_application_id(application_id: str):
    """
    Get latest survey task for an application.
    """
    task = survey_tasks_collection.find_one(
        {"application_id": application_id},
        sort=[("created_at", -1)]
    )

    return serialize_mongo(task)


def list_tasks_by_surveyor(surveyor_id: str):
    """
    List all tasks assigned to a specific surveyor.
    """
    tasks = list(
        survey_tasks_collection.find(
            {"assigned_surveyor_id": surveyor_id}
        ).sort("created_at", -1)
    )

    return serialize_mongo(tasks)


def list_tasks(status: str = None, zone_id: str = None):
    """
    List survey tasks with optional filters.
    """
    query = {}

    if status:
        query["status"] = status

    if zone_id:
        query["zone_id"] = zone_id

    tasks = list(survey_tasks_collection.find(query).sort("created_at", -1))
    return serialize_mongo(tasks)


def update_task_status(application_id: str, new_status: str):
    """
    Update survey task status by application_id.
    """
    survey_tasks_collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return get_task_by_application_id(application_id)


def add_milestone(application_id: str, milestone_type: str, by: str, meta: dict = None):
    """
    Add milestone to survey task.
    """
    milestone = {
        "type": milestone_type,
        "at": datetime.utcnow(),
        "by": by,
        "meta": meta or {}
    }

    survey_tasks_collection.update_one(
        {"application_id": application_id},
        {
            "$push": {"milestones": milestone},
            "$set": {
                "status": milestone_type,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return get_task_by_application_id(application_id)


def set_scheduled_visit(application_id: str, scheduled_visit_date: str, by: str):
    """
    Set scheduled visit date and add visit_scheduled milestone.
    """
    milestone = {
        "type": "visit_scheduled",
        "at": datetime.utcnow(),
        "by": by,
        "meta": {
            "scheduled_visit_date": scheduled_visit_date
        }
    }

    survey_tasks_collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": "visit_scheduled",
                "scheduled_visit_date": scheduled_visit_date,
                "updated_at": datetime.utcnow()
            },
            "$push": {"milestones": milestone}
        }
    )

    return get_task_by_application_id(application_id)


def add_field_note(application_id: str, note: str):
    """
    Add field note to survey task.
    """
    survey_tasks_collection.update_one(
        {"application_id": application_id},
        {
            "$push": {"field_notes": note},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

    return get_task_by_application_id(application_id)


def mark_report_uploaded(application_id: str):
    """
    Mark task as report_uploaded.
    """
    milestone = {
        "type": "report_uploaded",
        "at": datetime.utcnow(),
        "by": "surveyor",
        "meta": {
            "message": "Survey report uploaded"
        }
    }

    survey_tasks_collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": "report_uploaded",
                "report_uploaded": True,
                "updated_at": datetime.utcnow()
            },
            "$push": {"milestones": milestone}
        }
    )

    return get_task_by_application_id(application_id)


def mark_registrar_reviewed(application_id: str, registrar_id: str, decision: str):
    """
    Mark task as registrar_reviewed.
    """
    milestone = {
        "type": "registrar_reviewed",
        "at": datetime.utcnow(),
        "by": registrar_id,
        "meta": {
            "decision": decision
        }
    }

    survey_tasks_collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": "registrar_reviewed",
                "updated_at": datetime.utcnow()
            },
            "$push": {"milestones": milestone}
        }
    )

    return get_task_by_application_id(application_id)