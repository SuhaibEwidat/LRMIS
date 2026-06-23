from datetime import datetime, timezone
from fastapi import HTTPException

from repositories import applicant_repository


def applicant_module_ping():
    repo_result = applicant_repository.applicant_repository_ping()
    return {"message": "Applicant module is working!", "repository_result": repo_result}


# take data from the request
# check the identity
# check the national_id and registationNumber
# Preventing repetition
# add state verfication_state
# add linked_application
# add created_at,updated_at
# save in mongodb using repo
# return applicant_id


def create_applicant_service(applicant_data: dict):
    identity = applicant_data.setdefault("identity", {})
    national_id = identity.get("national_id")
    registration_number = identity.get("registration_number")

    if not national_id and not registration_number:
        raise HTTPException(
            status_code=400,
            detail="Either national_id or registration_number is required",
        )

    if national_id:
        existingApplicant = applicant_repository.find_applicant_by_nationalId(
            national_id
        )
        if existingApplicant:
            raise HTTPException(
                status_code=400, detail="Applicant with this national_id already exists"
            )

    if registration_number:
        existingApplicant = applicant_repository.find_applicant_by_RegistrationNumber(
            registration_number
        )

        if existingApplicant:
            raise HTTPException(
                status_code=400,
                detail="Applicant with this registration_number already exists",
            )

    applicant_data["verification_state"] = "unverified"
    applicant_data["identity"]["verified"] = False
    applicant_data["identity"]["verification_method"] = None
    applicant_data["identity"]["verified_at"] = None

    applicant_data["stats"] = {
        "total_applications": 0,
        "approved_applications": 0,
        "pending_applications": 0,
    }
    applicant_data["linked_applications"] = (
        []
    )  # new applicant we start without any application

    applicant_data["created_at"] = datetime.now(timezone.utc)
    applicant_data["updated_at"] = datetime.now(timezone.utc)

    applicant_id = applicant_repository.insert_applicant(applicant_data)

    return {
        "message": "Applicant profile created successfully",
        "applicant_id": applicant_id,
        "verification_state": applicant_data["verification_state"],
    }


def getApplicantService(applicant_id: str):
    applicant = applicant_repository.find_applicantById(applicant_id)

    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    return {
        "applicant_id": str(applicant["_id"]),
        "full_name": applicant.get("full_name"),
        "applicant_type": applicant.get("applicant_type"),
        "verification_state": applicant.get("verification_state"),
        "identity": applicant.get("identity", {}),
        "contacts": applicant.get("contacts", {}),
        "address": applicant.get("address", {}),
        "preferences": applicant.get("preferences", {}),
        "privacy_settings": applicant.get("privacy_settings", {}),
        "linked_applications": applicant.get("linked_applications", []),
        "stats": applicant.get("stats", {}),
        "created_at": applicant.get("created_at"),
        "updated_at": applicant.get("updated_at"),
    }


def get_applicant_applications_service(applicant_id: str):
    applicant = applicant_repository.find_applicantById(applicant_id)

    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    applications = applicant_repository.find_applications_by_applicant_id(applicant_id)

    return {
        "applicant_id": applicant_id,
        "count": len(applications),
        "applications": applications,
    }


def add_application_document_service(application_id: str, document_data: dict):
    application = applicant_repository.find_application_by_application_id(
        application_id
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    document_type = document_data.get("document_type")
    file_name = document_data.get("file_name")
    uploaded_by = document_data.get("uploaded_by")

    if not document_type:
        raise HTTPException(status_code=400, detail="document_type is required")

    if not file_name:
        raise HTTPException(status_code=400, detail="file_name is required")

    if not uploaded_by:
        raise HTTPException(status_code=400, detail="uploaded_by is required")

    document_data["application_id"] = application_id
    document_data["uploaded_by_type"] = "applicant"
    document_data["status"] = "pending_review"
    document_data["uploaded_at"] = datetime.now(timezone.utc)
    document_data["created_at"] = datetime.now(timezone.utc)
    document_data["updated_at"] = datetime.now(timezone.utc)

# To save the document_data inside collection application_document
    document_id = applicant_repository.insert_application_document(document_data)

    #If it returns True, then we found the document inside. If it returns False, it means the document was saved in application_documents, but we didn't find the same `required_documents` inside document_type.

    required_document_updated = applicant_repository.update_required_document_status(application_id, document_data["document_type"], document_data["status"])
    return {
        "message": "Document metadata added successfully",
        "document_id": document_id,
        "application_id": application_id,
        "document_type": document_data["document_type"],
        "status": document_data["status"],
        "required_document_updated": required_document_updated > 0
    }

def add_application_comment_service(application_id:str,comment_data:dict):
    application=applicant_repository.find_application_by_application_id(application_id)
    if not application:
        raise HTTPException (
            status_code=400,
            detail="application Not Found"
        )
    
    actor_id=comment_data.get("actor_id") # whos write the comment
    comment=comment_data.get("comment") # meesage of comment coming from Swagger

    if not actor_id:
        raise HTTPException(
            status_code=400,
            detail="actor_id is required"
        )
    
    if not comment:
        raise HTTPException(
            status_code=400,
            detail="comment is required"
        )
    
    #build event for Comment
    comment_event={
        "type":"applicant_comment",
        "by":{
            "actor_type":"applicant",
            "actor_id":actor_id
        },
        "at": datetime.now(timezone.utc),
        "meta":{
            "comment":comment
        }
    }
    #send event to repo
    modified = applicant_repository.add_application_comment_event(application_id, comment_event)

    # if the application exists But it has no performance_logs
    if modified==0:
        raise HTTPException(
            status_code=404,
            detail="performance log not found for this application"
        )
    # This response appears in Swagger.
    return{
        "messsage":"applicant comment added succesfully",
        "application_id": application_id,
        "comment_by":actor_id,
        "event_type":comment_event["type"]
    
    }



def submit_objection_service(application_id: str, objection_data: dict):
    application = applicant_repository.find_application_by_application_id(application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    submitted_by = objection_data.get("submitted_by")
    reason = objection_data.get("reason")
    description = objection_data.get("description")
    supporting_documents = objection_data.get("supporting_documents", [])
    if not submitted_by:
        raise HTTPException(
            status_code=400,
            detail="submitted_by is required"
        )

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="reason is required"
        )

    
    objection_data["supporting_documents"] = supporting_documents
    objection_data["application_id"] = application_id
    objection_data["submitted_by_type"] = "applicant"
    objection_data["status"] = "submitted"
    objection_data["created_at"] = datetime.now(timezone.utc)
    objection_data["updated_at"] = datetime.now(timezone.utc)

    objection_id = applicant_repository.insert_objection(objection_data)

    application_updated = applicant_repository.add_objection_to_application(
        application_id=application_id,
        objection_id=objection_id
    )

    objection_event = {
        "type": "objection_submitted",
        "by": {
            "actor_type": "applicant",
            "actor_id": submitted_by
        },
        "at": datetime.now(timezone.utc),
        "meta": {
            "objection_id": objection_id,
            "reason": reason
        }
    }

    logs_updated = applicant_repository.add_objection_event(
        application_id=application_id,
        objection_event=objection_event
    )

    return {
    "message": "Objection submitted successfully",
    "objection_id": objection_id,
    "application_id": application_id,
    "status": objection_data["status"],
    "supporting_documents": objection_data["supporting_documents"],
    "application_updated": application_updated > 0,
    "logs_updated": logs_updated > 0
}

def get_application_timeline_service(application_id: str):
    application = applicant_repository.find_application_by_application_id(application_id)

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    timeline_log = applicant_repository.findTimeLineByApplicationId(application_id)

    if not timeline_log:
        return {
            "application_id": application_id,
            "count": 0,
            "timeline": [],
            "message": "No timeline events found for this application"
        }

    events = timeline_log.get("event_stream", [])

    return {
        "application_id": application_id,
        "events_count": len(events),
        "timeline": events,
        "computed_kpis": timeline_log.get("computed_kpis", {}),
        "created_at": timeline_log.get("created_at"),
        "updated_at": timeline_log.get("updated_at")
    }
def get_application_documents_service(application_id: str):
    application = applicant_repository.find_application_by_application_id(
        application_id
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    documents = applicant_repository.find_documents_by_application_id(
        application_id
    )

    return {
        "application_id": application_id,
        "count": len(documents),
        "data": documents
    }