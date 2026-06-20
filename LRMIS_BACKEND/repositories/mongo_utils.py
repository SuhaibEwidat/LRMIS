from bson import ObjectId
from datetime import datetime


def to_object_id(value):
    """
    Convert string to MongoDB ObjectId if valid.
    """
    if value and ObjectId.is_valid(str(value)):
        return ObjectId(str(value))
    return None


def serialize_mongo(data):
    """
    Convert MongoDB ObjectId and datetime values to JSON-friendly values.
    """

    if isinstance(data, list):
        return [serialize_mongo(item) for item in data]

    if isinstance(data, dict):
        return {
            key: serialize_mongo(value)
            for key, value in data.items()
        }

    if isinstance(data, ObjectId):
        return str(data)

    if isinstance(data, datetime):
        return data.isoformat()

    return data