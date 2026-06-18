from fastapi import APIRouter, HTTPException, Query
from LRMIS_BACKEND.schemas.application_schema import ApplicationCreate 

from LRMIS_BACKEND.services.Module1.application_service import create_application_service, get_application_service, list_applications_service
from LRMIS_BACKEND.services.Module1.certificate_service import issue_certificate_service
from LRMIS_BACKEND.services.Module1.transition_service import hold_application_service, transition_application_service

# create router /applications
router = APIRouter(prefix="/applications", tags=["Applications"])



# create application
@router.post("/")
def create_application(payload: ApplicationCreate, idempotency_key: str = None):

    result = create_application_service(
        data=payload.dict(),
        idempotency_key=idempotency_key
    )

    return result


#get application by id
@router.get("/{application_id}")
def get_application(application_id: str):

    result =  get_application_service(application_id)

    if not result:
        raise HTTPException(status_code=404, detail="Application not found")

    return result

@router.get("/")
def list_applications(
    skip: int = 0,
    limit: int = 10,
    status: str = None,
    application_type: str = None,
    zone_id: str = None
):

    filters = {}

    if status:
        filters["status"] = status

    if application_type:
        filters["application_type"] = application_type

    if zone_id:
        filters["parcel_ref.zone_id"] = zone_id

    result =  list_applications_service(
        skip=skip,
        limit=limit,
        filters=filters
    )

    return result

@router.patch("/{application_id}/transition")
def transition(application_id: str, new_state: str):

    result = transition_application_service(application_id, new_state)

    return result

@router.post("/{application_id}/hold")
def hold_application(application_id: str, reason: str):

    if not reason:
        raise HTTPException(status_code=400, detail="Hold reason required")
   
 

    return {"message": "Application put on hold"}


@router.post("/{application_id}/reject")
def reject_application(application_id: str, reason: str):

    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason required")

    collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "workflow.current_state": "rejected",
                "internal.notes": [reason]
            }
        }
    )

    return {"message": "Application rejected"}

# certificate
@router.get("/{application_id}/certificate")
def get_certificate(application_id: str, registrar_id: str):

  
    return issue_certificate_service(application_id, registrar_id)