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