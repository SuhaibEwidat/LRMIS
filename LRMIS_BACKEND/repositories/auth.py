from datetime import datetime
from bson import ObjectId

from database.database import db


users_collection = db["users"]
applicants_collection = db["applicants"]
staff_collection = db["staff_members"]


def serialize_mongo(data):
    if isinstance(data, list):
        return [serialize_mongo(item) for item in data]

    if isinstance(data, dict):
        return {key: serialize_mongo(value) for key, value in data.items()}

    if isinstance(data, ObjectId):
        return str(data)

    if isinstance(data, datetime):
        return data.isoformat()

    return data


def to_object_id(value):
    if value and ObjectId.is_valid(str(value)):
        return ObjectId(str(value))
    return None


# =========================
# Users Collection
# =========================

def get_user_by_email(email: str):
    user = users_collection.find_one({"email": email})
    return serialize_mongo(user)


def create_user(user_data: dict):
    now = datetime.utcnow()

    user_data.setdefault("created_at", now)
    user_data.setdefault("updated_at", now)

    result = users_collection.insert_one(user_data)

    created_user = users_collection.find_one({"_id": result.inserted_id})
    return serialize_mongo(created_user)


def update_user_profile_id(user_id: str, profile_id: str):
    user_object_id = to_object_id(user_id)
    profile_object_id = to_object_id(profile_id)

    users_collection.update_one(
        {"_id": user_object_id},
        {
            "$set": {
                "profile_id": profile_object_id,
                "updated_at": datetime.utcnow()
            }
        }
    )

    user = users_collection.find_one({"_id": user_object_id})
    return serialize_mongo(user)


# =========================
# Applicants Collection
# =========================

def get_applicant_by_national_id(national_id: str):
    applicant = applicants_collection.find_one({
        "identity.national_id": national_id
    })
    return serialize_mongo(applicant)


def create_applicant(applicant_data: dict):
    now = datetime.utcnow()

    applicant_data.setdefault("created_at", now)
    applicant_data.setdefault("updated_at", now)

    result = applicants_collection.insert_one(applicant_data)

    applicant = applicants_collection.find_one({"_id": result.inserted_id})
    return serialize_mongo(applicant)


def update_applicant_user_id(applicant_id: str, user_id: str):
    applicant_object_id = to_object_id(applicant_id)
    user_object_id = to_object_id(user_id)

    applicants_collection.update_one(
        {"_id": applicant_object_id},
        {
            "$set": {
                "user_id": user_object_id,
                "updated_at": datetime.utcnow()
            }
        }
    )

    applicant = applicants_collection.find_one({"_id": applicant_object_id})
    return serialize_mongo(applicant)


def get_applicant_by_id(applicant_id: str):
    applicant_object_id = to_object_id(applicant_id)

    applicant = applicants_collection.find_one({"_id": applicant_object_id})
    return serialize_mongo(applicant)


# =========================
# Staff Members Collection
# =========================

def get_staff_by_code(staff_code: str):
    staff = staff_collection.find_one({"staff_code": staff_code})
    return serialize_mongo(staff)


def create_staff(staff_data: dict):
    now = datetime.utcnow()

    staff_data.setdefault("created_at", now)
    staff_data.setdefault("updated_at", now)

    result = staff_collection.insert_one(staff_data)

    staff = staff_collection.find_one({"_id": result.inserted_id})
    return serialize_mongo(staff)


def update_staff_user_id(staff_id: str, user_id: str):
    staff_object_id = to_object_id(staff_id)
    user_object_id = to_object_id(user_id)

    staff_collection.update_one(
        {"_id": staff_object_id},
        {
            "$set": {
                "user_id": user_object_id,
                "updated_at": datetime.utcnow()
            }
        }
    )

    staff = staff_collection.find_one({"_id": staff_object_id})
    return serialize_mongo(staff)


def get_staff_by_id(staff_id: str):
    staff_object_id = to_object_id(staff_id)

    staff = staff_collection.find_one({"_id": staff_object_id})
    return serialize_mongo(staff)