from LRMIS_BACKEND.database.database import get_database

db = get_database()
collection = db["land_applications"]


def create_application(application: dict):
    return  collection.insert_one(application)


def get_application_by_id(app_id: str):
    return   collection.find_one({"application_id": app_id})


def list_applications(query: dict, skip: int, limit: int):
    return list(collection.find(query).skip(skip).limit(limit))