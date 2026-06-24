from datetime import datetime, timezone

from bson import ObjectId

from database.database import get_database
db = get_database()

applicants_collection = db["applicants"]
applications_collection =db["land_applications"]
documents_collection=db["application_documents"]
performance_logs_collection=db["performance_logs"]
objections_collection=db["objections"]

def applicant_repository_ping():
    return {"message": "Applicant repository is working!"}

def find_applicant_by_nationalId(national_id:str):
    return applicants_collection.find_one({"identity.national_id": national_id})

def find_applicant_by_RegistrationNumber(registration_number:str):
    return applicants_collection.find_one({"identity.registration_number": registration_number})

def insert_applicant(applicant_data:dict):
    result= applicants_collection.insert_one(applicant_data)
    return str(result.inserted_id)

#objectId have shape maybe expect 24 char and number
def find_applicantById(applicant_id:str):
    if not ObjectId.is_valid(applicant_id): #can applicant_id convert to ObJECIT id (must have 24 numberandchar)
        return None
    return applicants_collection.find_one({
        "_id":ObjectId(applicant_id)
    })

def find_applications_by_applicant_id(applicant_id: str):
    cursor = applications_collection.find(
        {
            "applicant_ref.applicant_id": applicant_id
        },
        #Projection which field i want to return from mongoDB
        #1:return the field
        #0:dont return the field
        {
            "_id": 0,
            "application_id": 1,
            "application_type": 1,
            "status": 1,
            "priority": 1,
            "applicant_ref": 1,
            "parcel_ref": 1,
            "description": 1,
            "workflow.current_state": 1,
            "timestamps": 1
        }
    )

    return list(cursor)

def find_application_by_application_id(application_id:str):
    return applications_collection.find_one({
        "application_id":application_id
    })

def insert_application_document(document_data:dict):
    result=documents_collection.insert_one(document_data)
    return str(result.inserted_id)


# Update the status of a required document inside land_applications
# after saving the uploaded document metadata in application_documents.
# Example: change sale_contract status to pending_review.
def update_required_document_status(application_id: str, document_type: str, status: str):
    result = applications_collection.update_one(
        {
            "application_id": application_id,
            "required_documents.document_type": document_type
        },
        {
            "$set": {
                "required_documents.$.status": status
            }
        }
    )

    return result.modified_count

# Add applicant comment as a new event inside performance_logs.event_stream

def add_application_comment_event(application_id:str,comment_event:dict):
    result=performance_logs_collection.update_one(
        {
            #mongodb search in perfomance log for this application_id
            "application_id":application_id
        },
        {
            #add new attribute in array
            "$push":{
                "event_stream":comment_event
            },

            "$set":{
                #update_at and make it the same time as the comment when we add it.

                "updated_at":comment_event["at"]
            }
        }
        
    )
    #1: This means one record has been successfully modified.
    return result.modified_count

def insert_objection(objection_data:dict):
    result=objections_collection.insert_one(objection_data)
    return str(result.inserted_id)

# Link the created objection to the related application
def add_objection_to_application(application_id: str, objection_id: str):
    now = datetime.now(timezone.utc)

    result = applications_collection.update_one(
        {
            "application_id": application_id
        },
        {
            "$set": {
                "objection.has_objection": True,
                "workflow.current_state": "under_objection",
                "status": "under_objection",
                "timestamps.updated_at": now
            },
            "$addToSet": {
                "objection.objection_ids": objection_id
            }
        }
    )

    return result.modified_count

# Add objection submission as an event inside performance logs.eventstream 
# Used to show the objection later in the application timeline

def add_objection_event(application_id:str,objection_event:dict):
    result=performance_logs_collection.update_one(
        {
        "application_id":application_id
        },
        {
            "$push":{
                "event_stream":objection_event
            },
            "$set":{
                #We change:updated_at and We make it the same time as submitting the objection.
                "updated_at":objection_event["at"]
            }
        }
    )
    return result.modified_count

def findTimeLineByApplicationId(application_id:str):
    return performance_logs_collection.find_one(
        {
            "application_id":application_id
        },
        {
            "_id": 0,
            "application_id": 1,
            "event_stream": 1,
            "computed_kpis": 1,
            "created_at": 1,
            "updated_at": 1
        }

    )
def find_documents_by_application_id(application_id: str):
    documents = list(
        documents_collection
        .find({"application_id": application_id})
        .sort("uploaded_at", -1)
    )

    for document in documents:
        document["document_id"] = str(document["_id"])
        del document["_id"]

    return documents