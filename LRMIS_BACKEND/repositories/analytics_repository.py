from database.database import get_database

db = get_database()
collection = db["land_applications"]

TERMINAL_STATES = ["approved", "certificate_issued", "closed", "rejected", "under_objection"]


class AnalyticsRepository:

    def __init__(self, collection=collection):
        self.collection = collection

    def get_kpis(self):
        pipeline = [
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "by_status": [
                        {"$group": {"_id": "$workflow.current_state", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                    ],
                    "pending": [
                        {
                            "$match": {
                                "workflow.current_state": {"$nin": TERMINAL_STATES}
                            }
                        },
                        {"$count": "count"},
                    ],
                    "approved": [
                        {
                            "$match": {
                                "workflow.current_state": {
                                    "$in": ["approved", "certificate_issued"]
                                }
                            }
                        },
                        {"$count": "count"},
                    ],
                    "rejected": [
                        {"$match": {"workflow.current_state": "rejected"}},
                        {"$count": "count"},
                    ],
                    "under_objection": [
                        {"$match": {"workflow.current_state": "under_objection"}},
                        {"$count": "count"},
                    ],
                }
            }
        ]

        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else {}

    def get_applications_by_status(self):
        pipeline = [
            {"$group": {"_id": "$workflow.current_state", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]

        return list(self.collection.aggregate(pipeline))

    def get_applications_by_zone(self):
        pipeline = [
            {
                "$group": {
                    "_id": {"$ifNull": ["$parcel_ref.zone_id", "unknown"]},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]

        return list(self.collection.aggregate(pipeline))
