from datetime import datetime

from bson import ObjectId

from database.database import get_database

db = get_database()
collection = db["land_applications"]


def fix_mongo_document(doc):
    if not doc:
        return doc
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
        try:
            result = self.collection.find_one({"application_id": app_id})
        except:
            return None

        return fix_mongo_document(result)
    
    def get_last_application(self):
        return self.collection.find_one(sort=[("application_id", -1)])    

    def list_applications(self, query: dict = None, skip: int = 0, limit: int = 10, sort_by: str = None, order: str = None):
        query = query or {}

        data = list(
            self.collection.find(query).skip(skip).limit(limit).sort([(sort_by, -1 if order == "desc" else 1)])
        )

        return [fix_mongo_document(doc) for doc in data]

    def count_applications(self, query: dict = None):
        query = query or {}
        return self.collection.count_documents(query)
    
    def update_workflow_state(
        self,
        application_id: str,
        new_state: str,
        extra_updates: dict = None
    ):
        update_doc = {
            "workflow.current_state": new_state,
            "timestamps.updated_at": datetime.now()
        }

        # merge extra dynamic fields (rejection, hold, missing docs, etc.)
        if extra_updates:
            update_doc.update(extra_updates)

        self.collection.update_one(
            {"application_id": application_id},
            {"$set": update_doc}
        )
        
        
        # for attchments
    def push_attachment(self, application_id: str, attachment: dict):

      return self.collection.update_one(
        {"application_id": application_id},
        {
            "$push": {
                "attachments": attachment
            },
            "$set": {
                "timestamps.updated_at": datetime.now()
            }
        }
    )
      
      
    def update_attachment_status(self, application_id: str, document_type: str, status: str):

       return self.collection.update_one(
        {
            "application_id": application_id,
            "attachments.document_type": document_type
        },
        {
            "$set": {
                "attachments.$.verification_status": status,
                "attachments.$.verified_at": datetime.now()
            }
        }
    )
    def push_audit_event(self, application_id: str, event: dict):

      return self.collection.update_one(
        {"application_id": application_id},
        {
            "$push": {
                "audit_log": event
            }
        }
    )
      
      def get_certificate_by_application(self, application_id: str):

         return self.collection.database["certificates"].find_one({
         "application_id": application_id
    })