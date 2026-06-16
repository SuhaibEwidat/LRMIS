from LRMIS.database.database import get_database

db = get_database()
collection = db["land_applications"]


async def create_application(application: dict):
    return await collection.insert_one(application)


async def get_application_by_id(app_id: str):
    return  await collection.find_one({"application_id": app_id})


async def list_applications(query: dict, skip: int, limit: int):
    return await list(collection.find(query).skip(skip).limit(limit))