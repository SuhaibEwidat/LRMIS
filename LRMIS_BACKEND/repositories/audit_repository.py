from database.database import get_database

db = get_database()
collection = db["performance_logs"]


class AuditRepository:

    def get_application_by_id(self, application_id):
        return collection.find_one({"application_id": application_id})

    def create_log(self, doc):
        return collection.insert_one(doc)

    def push_event(self, application_id, event):
        return collection.update_one(
            {"application_id": application_id},
            {"$push": {"event_stream": event}},
            upsert=True
        )