from fastapi import APIRouter

from services.Module4.analytics_service import (
    get_applications_by_status_service,
    get_applications_by_zone_service,
    get_kpis_service,
    get_processing_time_service,
    get_surveyor_analytics_service,
    
)

router = APIRouter(prefix="/analytics", tags=["Module 4 - Analytics"])


@router.get("/kpis")
def get_kpis():
    return get_kpis_service()


@router.get("/applications-by-status")
def get_applications_by_status():
    return get_applications_by_status_service()


@router.get("/applications-by-zone")
def get_applications_by_zone():
    return get_applications_by_zone_service()


@router.get("/processing-time")
def get_processing_time():
    return get_processing_time_service()

@router.get("/surveyors")
def get_surveyor_analytics():
    return get_surveyor_analytics_service()