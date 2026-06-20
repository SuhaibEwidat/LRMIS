from datetime import datetime
from database.database import db
from repositories.mongo_utils import to_object_id, serialize_mongo


staff_collection = db["staff_members"]


def create_staff(staff_data: dict):
    """
    Create a new staff member: surveyor or registrar.
    """
    now = datetime.utcnow()

    staff_data.setdefault("active", True)
    staff_data.setdefault("created_at", now)
    staff_data.setdefault("updated_at", now)

    result = staff_collection.insert_one(staff_data)
    return get_staff_by_id(str(result.inserted_id))


def get_staff_by_id(staff_id: str):
    """
    Get staff by MongoDB _id.
    If staff_id is not ObjectId, search by staff_code.
    """
    object_id = to_object_id(staff_id)

    if object_id:
        query = {"_id": object_id}
    else:
        query = {"staff_code": staff_id}

    staff = staff_collection.find_one(query)
    return serialize_mongo(staff)


def get_staff_by_code(staff_code: str):
    """
    Get staff by staff_code.
    Example: SURV-RM-01
    """
    staff = staff_collection.find_one({"staff_code": staff_code})
    return serialize_mongo(staff)


def list_staff(role: str = None, active: bool = None):
    """
    List staff members with optional filters.
    """
    query = {}

    if role:
        query["role"] = role

    if active is not None:
        query["active"] = active

    staff_list = list(staff_collection.find(query).sort("created_at", -1))
    return serialize_mongo(staff_list)


def find_available_surveyors(zone_id: str, required_skills: list = None):
    """
    Find surveyors suitable for auto assignment.
    Conditions:
    - role = surveyor
    - active = true
    - covers the same zone
    - active_tasks < max_tasks
    - has required skills if provided
    """
    query = {
        "role": "surveyor",
        "active": True,
        "coverage.zone_ids": zone_id,
        "$expr": {
            "$lt": ["$workload.active_tasks", "$workload.max_tasks"]
        }
    }

    if required_skills:
        query["skills"] = {"$all": required_skills}

    surveyors = list(
        staff_collection.find(query).sort("workload.active_tasks", 1)
    )

    return serialize_mongo(surveyors)


def update_staff(staff_id: str, update_data: dict):
    """
    Update staff information.
    """
    object_id = to_object_id(staff_id)

    if object_id:
        query = {"_id": object_id}
    else:
        query = {"staff_code": staff_id}

    update_data["updated_at"] = datetime.utcnow()

    staff_collection.update_one(
        query,
        {"$set": update_data}
    )

    return get_staff_by_id(staff_id)


def increase_active_tasks(staff_id: str, amount: int = 1):
    """
    Increase or decrease surveyor active tasks.
    Example:
    amount = 1  when assigning task
    amount = -1 when task completed
    """
    object_id = to_object_id(staff_id)

    if object_id:
        query = {"_id": object_id}
    else:
        query = {"staff_code": staff_id}

    staff_collection.update_one(
        query,
        {
            "$inc": {"workload.active_tasks": amount},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

    return get_staff_by_id(staff_id)


def deactivate_staff(staff_id: str):
    """
    Soft delete / deactivate staff.
    """
    return update_staff(staff_id, {"active": False})