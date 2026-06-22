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
                        {"$match": {"objection.has_objection": True}},
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

def get_processing_time_by_type(self):
    pipeline = [
        {
            "$match": {
                "timestamps.submitted_at": {"$ne": None}
            }
        },
        {
            "$project": {
                "application_type": {
                    "$ifNull": ["$application_type", "unknown"]
                },
                "submitted_at": "$timestamps.submitted_at",
                "end_at": {
                    "$ifNull": [
                        "$timestamps.closed_at",
                        {
                            "$ifNull": [
                                "$timestamps.certificate_issued_at",
                                {
                                    "$ifNull": [
                                        "$timestamps.approved_at",
                                        {
                                            "$ifNull": [
                                                "$timestamps.rejected_at",
                                                "$timestamps.updated_at"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            "$match": {
                "end_at": {"$ne": None}
            }
        },
        {
            "$project": {
                "application_type": 1,
                "processing_days": {
                    "$divide": [
                        {
                            #end_at - submitted_at =result(in miliseconds)so we divide it on 86400000
                            "$subtract": ["$end_at", "$submitted_at"]
                        },
                        86400000
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": "$application_type",
                "average_processing_days": {
                    "$avg": "$processing_days"
                },
                "applications_count": {
                    "$sum": 1
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "application_type": "$_id",
                "average_processing_days": {
                    "$round": ["$average_processing_days", 2]
                },
                "applications_count": 1
            }
        },
        {
            "$sort": {
                "average_processing_days": -1
            }
        }
    ]

    return list(self.collection.aggregate(pipeline))