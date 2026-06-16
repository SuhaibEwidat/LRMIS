from fastapi import APIRouter, HTTPException, Query
from LRMIS.schemas.application_schema import ApplicationCreate

from LRMIS.services.create_application_service import create_application_service
from LRMIS.services.get_application_service import get_application_service
from LRMIS.services.List_applications_service import list_applications_service
from LRMIS.services.transition_service import transition_application_service


from  LRMIS.repositories.application_repository import collection

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("/")
async def create_application(payload: ApplicationCreate, idempotency_key: str = None):

    result = await create_application_service(
        data=payload.dict(),
        repository=type("Repo", (), {"collection": collection}),
        idempotency_key=idempotency_key
    )

    return result

@router.get("/{application_id}")
async def get_application(application_id: str):

    result = await get_application_service(application_id, type("Repo", (), {"collection": collection}))

    if not result:
        raise HTTPException(status_code=404, detail="Application not found")

    return result

@router.get("/")
async def list_applications(
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

    result = await list_applications_service(
        repository=type("Repo", (), {"collection": collection}),
        skip=skip,
        limit=limit,
        filters=filters
    )

    return result

@router.patch("/{application_id}/transition")
async def transition(application_id: str, new_state: str):

    app =await collection.find_one({"application_id": application_id})

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    result = transition_application_service(app, new_state, type("Repo", (), {"collection": collection}))

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@router.post("/{application_id}/hold")
async def hold_application(application_id: str, reason: str):

    result = await collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "workflow.current_state": "on_hold",
                "internal.notes": [reason]
            }
        }
    )

    return {"message": "Application put on hold"}


@router.post("/{application_id}/reject")
async def reject_application(application_id: str, reason: str):

    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason required")

    await collection.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "workflow.current_state": "rejected",
                "internal.notes": [reason]
            }
        }
    )

    return {"message": "Application rejected"}