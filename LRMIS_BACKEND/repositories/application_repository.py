from datetime import datetime

from database.database import get_database


db = get_database()
collection = db["land_applications"]


def fix_mongo_document(doc):
    """
    Convert MongoDB ObjectId to string so FastAPI can return it as JSON.
    """
    if not doc:
        return doc

    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])

    return doc


class ApplicationRepository:

    def __init__(self, collection=collection):
        self.collection = collection

    def find_by_idempotency_key(self, idempotency_key: str):
        return self.collection.find_one({"idempotency_key": idempotency_key})

    def create_application(self, application: dict):
        result = self.collection.insert_one(application)
        return str(result.inserted_id)

    def get_application_by_id(self, app_id: str):
        result = self.collection.find_one({"application_id": app_id})
        return fix_mongo_document(result)

    def get_last_application(self):
        return self.collection.find_one(sort=[("application_id", -1)])

    def list_applications(
        self,
        query: dict = None,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "timestamps.submitted_at",
        order: str = "desc",
    ):
        query = query or {}
        result = self.collection.find(query).skip(skip).limit(limit)
        if sort_by:
            result = result.sort([(sort_by, -1 if order == "desc" else 1)])
        return [fix_mongo_document(doc) for doc in result]

    def count_applications(self, query: dict = None):
        query = query or {}
        return self.collection.count_documents(query)

    def update_workflow_state(
        self,
        application_id: str,
        new_state: str,
        extra_updates: dict = None,
    ):
        """
        Update the application workflow state.
        """

        now = datetime.utcnow()

        update_doc = {
            "workflow.current_state": new_state,
            "timestamps.updated_at": datetime.now(),
        }
        if extra_updates:
            update_doc.update(extra_updates)

        self.collection.update_one(
            {"application_id": application_id},
            {"$set": update_doc},
        )

    def set_fields(self, application_id: str, fields: dict):
        fields["timestamps.updated_at"] = datetime.now()
        self.collection.update_one(
            {"application_id": application_id},
            {"$set": fields},
        )

    def push_attachment(self, application_id: str, attachment: dict):
        return self.collection.update_one(
            {"application_id": application_id},
            {
                "$push": {"attachments": attachment},
                "$set": {"timestamps.updated_at": datetime.now()},
            },
        )

    def update_attachment_status(self, application_id: str, document_type: str, status: str):
        return self.collection.update_one(
            {
                "application_id": application_id,
                "attachments.document_type": document_type,
            },
            {
                "$set": {
                    "attachments.$.verification_status": status,
                    "attachments.$.verified_at": datetime.now(),
                    "timestamps.updated_at": datetime.now(),
                }
            },
        )

    def push_internal_note(self, application_id: str, note: dict):
        return self.collection.update_one(
            {"application_id": application_id},
            {
                "$push": {"internal.notes": note},
                "$set": {"timestamps.updated_at": datetime.now()},
            },
        )
