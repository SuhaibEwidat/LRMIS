from fastapi import APIRouter

from services.Module4.analytics_service import (
    get_applications_by_status_service,
    get_applications_by_zone_service,
    get_kpis_service,
    get_processing_time_service,
    get_surveyor_analytics_service,
    get_registrar_workload_service,
    get_parcels_geofeed_service,
    get_pending_heatmap_service,
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


@router.get("/registrars")
def get_registrar_workload():
    return get_registrar_workload_service()


@router.get("/geofeeds/parcels")
def get_parcels_geofeed():
    return get_parcels_geofeed_service()


@router.get("/geofeeds/pending-heatmap")
def get_pending_heatmap():
    return get_pending_heatmap_service()