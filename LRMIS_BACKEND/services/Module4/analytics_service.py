from repositories.analytics_repository import AnalyticsRepository

repo = AnalyticsRepository()


def _count_from_facet(facet_result: list) -> int:
    if facet_result and facet_result[0].get("count") is not None:
        return facet_result[0]["count"]
    return 0


def _format_status_groups(groups: list) -> list:
    return [
        {"status": group["_id"] or "unknown", "count": group["count"]}
        for group in groups
    ]


def _feature_collection(features: list) -> dict:
    """
    Return data in GeoJSON FeatureCollection format.
    Leaflet and map libraries understand this format.
    """
    return {
        "type": "FeatureCollection",
        "count": len(features),
        "features": features
    }


def _polygon_center(geometry: dict):
    """
    Convert GeoJSON Polygon to center Point.

    GeoJSON coordinates order:
    [longitude, latitude]
    """
    if not geometry:
        return None

    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")

    # If geometry is already Point, return it directly
    if geometry_type == "Point":
        return coordinates

    # For now we support Polygon because parcels usually use Polygon
    if geometry_type != "Polygon":
        return None

    if not coordinates or not coordinates[0]:
        return None

    points = coordinates[0]

    # In GeoJSON Polygon, the last point is often the same as the first point.
    # We remove it so the center calculation is cleaner.
    if len(points) > 1 and points[0] == points[-1]:
        points = points[:-1]

    lng_values = []
    lat_values = []

    for point in points:
        if len(point) >= 2:
            lng_values.append(point[0])
            lat_values.append(point[1])

    if not lng_values or not lat_values:
        return None

    center_lng = (min(lng_values) + max(lng_values)) / 2
    center_lat = (min(lat_values) + max(lat_values)) / 2

    return [center_lng, center_lat]


def get_kpis_service():
    raw = repo.get_kpis()

    return {
        "total_applications": _count_from_facet(raw.get("total", [])),
        "by_status": _format_status_groups(raw.get("by_status", [])),
        "pending": _count_from_facet(raw.get("pending", [])),
        "approved": _count_from_facet(raw.get("approved", [])),
        "rejected": _count_from_facet(raw.get("rejected", [])),
        "under_objection": _count_from_facet(raw.get("under_objection", [])),
    }


def get_applications_by_status_service():
    groups = repo.get_applications_by_status()

    return {
        "data": _format_status_groups(groups),
    }


def get_applications_by_zone_service():
    groups = repo.get_applications_by_zone()

    return {
        "data": [
            {"zone_id": group["_id"], "count": group["count"]}
            for group in groups
        ],
    }


def get_processing_time_service():
    data = repo.get_processing_time_by_type()

    return {
        "data": data
    }


def get_surveyor_analytics_service():
    data = repo.get_surveyor_analytics()

    return {
        "data": data
    }


def get_registrar_workload_service():
    data = repo.get_registrar_workload()

    return {
        "data": data
    }


def get_parcels_geofeed_service():
    """
    Used by:
    GET /analytics/geofeeds/parcels

    This returns all parcels as GeoJSON features.
    Each parcel keeps its real Polygon geometry.
    """
    parcels = repo.get_parcels_with_geometry()
    features = []

    for parcel in parcels:
        features.append({
            "type": "Feature",
            "geometry": parcel.get("geometry"),
            "properties": {
                "parcel_id": str(parcel.get("_id")),
                "parcel_code": parcel.get("parcel_code"),
                "parcel_number": parcel.get("parcel_number"),
                "block_number": parcel.get("block_number"),
                "basin_number": parcel.get("basin_number"),
                "zone_id": parcel.get("zone_id"),
                "area_sqm": parcel.get("area_sqm"),
                "land_use": parcel.get("land_use"),
                "registration_status": parcel.get("registration_status"),
                "dispute_state": parcel.get("dispute_state"),
                "address_hint": parcel.get("address_hint")
            }
        })

    return _feature_collection(features)


def get_pending_heatmap_service():
    """
    Used by:
    GET /analytics/geofeeds/pending-heatmap

    This returns pending applications as GeoJSON Points.
    Heatmaps usually work better with points, not polygons.
    """
    records = repo.get_pending_applications_with_parcels()
    features = []

    for item in records:
        app = item.get("application", {})
        parcel = item.get("parcel", {})

        geometry = parcel.get("geometry")
        center = _polygon_center(geometry)

        if center is None:
            continue

        status = app.get("status")

        # Some applications store status inside workflow.current_state
        if app.get("workflow"):
            status = app.get("workflow", {}).get("current_state", status)

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": center
            },
            "properties": {
                "application_id": app.get("application_id"),
                "application_type": app.get("application_type"),
                "status": status,
                "priority": app.get("priority"),
                "parcel_id": str(parcel.get("_id")),
                "parcel_number": parcel.get("parcel_number"),
                "block_number": parcel.get("block_number"),
                "basin_number": parcel.get("basin_number"),
                "zone_id": parcel.get("zone_id"),
                "weight": 1
            }
        })

    return _feature_collection(features)