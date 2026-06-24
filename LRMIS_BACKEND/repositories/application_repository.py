# ==============================
# repositories/application_repository.py
# ==============================

from datetime import datetime
from bson import ObjectId
from database.database import get_database


db = get_database()

collection = db["land_applications"]
application_documents_collection = db["application_documents"]


def fix_mongo_document(doc):
    """
    Convert MongoDB ObjectId to string.
    """

    if not doc:
        return doc

    if isinstance(doc, list):
        return [fix_mongo_document(item) for item in doc]

    if isinstance(doc, dict):
        fixed_doc = {}

        for key, value in doc.items():
            if isinstance(value, ObjectId):
                fixed_doc[key] = str(value)
            elif isinstance(value, dict):
                fixed_doc[key] = fix_mongo_document(value)
            elif isinstance(value, list):
                fixed_doc[key] = fix_mongo_document(value)
            else:
                fixed_doc[key] = value

        return fixed_doc

    return doc


class ApplicationRepository:
    def __init__(
        self,
        collection=collection,
        documents_collection=application_documents_collection,
    ):
        self.collection = collection
        self.documents_collection = documents_collection

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
        update_doc = {
            "workflow.current_state": new_state,
            "status": new_state,
            "timestamps.updated_at": datetime.utcnow(),
        }

        if extra_updates:
            update_doc.update(extra_updates)

        return self.collection.update_one(
            {"application_id": application_id},
            {"$set": update_doc},
        )

    def set_fields(self, application_id: str, fields: dict):
        fields["timestamps.updated_at"] = datetime.utcnow()

        return self.collection.update_one(
            {"application_id": application_id},
            {"$set": fields},
        )

    def push_attachment(self, application_id: str, attachment: dict):
        return self.collection.update_one(
            {"application_id": application_id},
            {
                "$push": {"attachments": attachment},
                "$set": {"timestamps.updated_at": datetime.utcnow()},
            },
        )

    def update_attachment_status(
        self,
        application_id: str,
        document_type: str,
        status: str,
    ):
        return self.update_attachment_verification(
            application_id=application_id,
            document_type=document_type,
            verification_status=status,
            verified_by=None,
            review_note=None,
        )

    def update_attachment_verification(
        self,
        application_id: str,
        document_type: str,
        verification_status: str,
        verified_by: str = None,
        review_note: str = None,
    ):
        now = datetime.utcnow()

        attachment_updates = {
            "attachments.$[attachment].verification_status": verification_status,
            "attachments.$[attachment].verified_at": now,
            "timestamps.updated_at": now,
        }

        required_document_updates = {
            "required_documents.$[document].status": verification_status,
            "required_documents.$[document].reviewed_by": verified_by,
            "required_documents.$[document].reviewed_at": now,
            "timestamps.updated_at": now,
        }

        document_collection_updates = {
            "verification_status": verification_status,
            "status": verification_status,
            "verified_at": now,
            "updated_at": now,
        }

        if verified_by:
            attachment_updates["attachments.$[attachment].verified_by"] = verified_by
            document_collection_updates["verified_by"] = verified_by

        if review_note is not None:
            attachment_updates["attachments.$[attachment].review_note"] = review_note
            required_document_updates["required_documents.$[document].review_note"] = review_note
            document_collection_updates["review_note"] = review_note

        attachment_result = self.collection.update_one(
            {"application_id": application_id},
            {"$set": attachment_updates},
            array_filters=[{"attachment.document_type": document_type}],
        )

        required_document_result = self.collection.update_one(
            {"application_id": application_id},
            {"$set": required_document_updates},
            array_filters=[{"document.document_type": document_type}],
        )

        document_collection_result = self.documents_collection.update_one(
            {
                "application_id": application_id,
                "document_type": document_type,
            },
            {"$set": document_collection_updates},
        )

        return {
            "attachment_matched": attachment_result.matched_count,
            "attachment_modified": attachment_result.modified_count,
            "required_document_matched": required_document_result.matched_count,
            "required_document_modified": required_document_result.modified_count,
            "document_collection_matched": document_collection_result.matched_count,
            "document_collection_modified": document_collection_result.modified_count,
        }

    def push_internal_note(self, application_id: str, note: dict):
        return self.collection.update_one(
            {"application_id": application_id},
            {
                "$push": {"internal.notes": note},
                "$set": {"timestamps.updated_at": datetime.utcnow()},
            },
        )