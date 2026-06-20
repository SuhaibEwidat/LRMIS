from datetime import datetime

from bson import ObjectId

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
        try:
            result = self.collection.find_one({"application_id": app_id})
        except Exception:
            return None

        return fix_mongo_document(result)

    def get_last_application(self):
        return self.collection.find_one(sort=[("application_id", -1)])

    def list_applications(
        self,
        query: dict = None,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = None,
        order: str = None
    ):
        query = query or {}

        cursor = self.collection.find(query).skip(skip).limit(limit)

        if sort_by:
            cursor = cursor.sort(
                [(sort_by, -1 if order == "desc" else 1)]
            )

        data = list(cursor)

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
        """
        Update the application workflow state.
        """

        now = datetime.utcnow()

        update_doc = {
            "workflow.current_state": new_state,
            "status": new_state,
            "timestamps.updated_at": now,
            "updated_at": now
        }

        if extra_updates:
            update_doc.update(extra_updates)

        self.collection.update_one(
            {"application_id": application_id},
            {"$set": update_doc}
        )

        return self.get_application_by_id(application_id)

    def push_attachment(self, application_id: str, attachment: dict):
        """
        Add an attachment to application.
        """

        return self.collection.update_one(
            {"application_id": application_id},
            {
                "$push": {
                    "attachments": attachment
                },
                "$set": {
                    "timestamps.updated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def update_attachment_status(
        self,
        application_id: str,
        document_type: str,
        status: str
    ):
        """
        Update attachment verification status.
        """

        return self.collection.update_one(
            {
                "application_id": application_id,
                "attachments.document_type": document_type
            },
            {
                "$set": {
                    "attachments.$.verification_status": status,
                    "attachments.$.verified_at": datetime.utcnow(),
                    "timestamps.updated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def push_audit_event(self, application_id: str, event: dict):
        """
        Push audit event to application audit_log.
        """

        return self.collection.update_one(
            {"application_id": application_id},
            {
                "$push": {
                    "audit_log": event
                },
                "$set": {
                    "timestamps.updated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def get_certificate_by_application(self, application_id: str):
        """
        Get certificate related to an application.
        """

        certificate = self.collection.database["certificates"].find_one(
            {"application_id": application_id}
        )

        return fix_mongo_document(certificate)

    def mark_application_surveyed(self, application_id: str):
        """
        Mark application as surveyed after survey report upload.
        This is called when survey task becomes report_uploaded.
        """

        now = datetime.utcnow()

        audit_event = {
            "type": "surveyed",
            "at": now,
            "by": "system",
            "meta": {
                "reason": "Survey report uploaded by surveyor"
            }
        }

        self.collection.update_one(
            {"application_id": application_id},
            {
                "$set": {
                    "status": "surveyed",
                    "workflow.current_state": "surveyed",
                    "survey_status": "report_uploaded",
                    "survey.report_uploaded": True,
                    "timestamps.updated_at": now,
                    "updated_at": now
                },
                "$push": {
                    "audit_log": audit_event
                }
            }
        )

        return self.get_application_by_id(application_id)


# =====================================================
# Module-level functions
# These are used by services like:
# application_repository.mark_application_surveyed(...)
# =====================================================

application_repo = ApplicationRepository()


def mark_application_surveyed(application_id: str):
    """
    Module-level function used by Module3 survey service.
    """

    return application_repo.mark_application_surveyed(application_id)


def get_application_by_id(application_id: str):
    return application_repo.get_application_by_id(application_id)


def update_workflow_state(
    application_id: str,
    new_state: str,
    extra_updates: dict = None
):
    return application_repo.update_workflow_state(
        application_id=application_id,
        new_state=new_state,
        extra_updates=extra_updates
    )


def push_audit_event(application_id: str, event: dict):
    return application_repo.push_audit_event(
        application_id=application_id,
        event=event
    )