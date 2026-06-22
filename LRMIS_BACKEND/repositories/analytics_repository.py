from database.database import get_database

db = get_database()
collection = db["land_applications"]
staff_collection = db["staff_members"]
survey_tasks_collection = db["survey_tasks"]


TERMINAL_STATES = [
    "approved",
    "certificate_issued",
    "closed",
    "rejected",
    "under_objection",
]


class AnalyticsRepository:

    def __init__(
        self,
        collection=collection,
        staff_collection=staff_collection,
        survey_tasks_collection=survey_tasks_collection,
    ):
        self.collection = collection
        self.staff_collection = staff_collection
        self.survey_tasks_collection = survey_tasks_collection

    def get_kpis(self):
        pipeline = [
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "by_status": [
                        {
                            "$group": {
                                "_id": "$workflow.current_state",
                                "count": {"$sum": 1},
                            }
                        },
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

    # calculate
    def get_processing_time_by_type(self):
        pipeline = [
            {"$match": {"timestamps.submitted_at": {"$ne": None}}},
            {
                "$project": {
                    "application_type": {"$ifNull": ["$application_type", "unknown"]},
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
                                                    "$timestamps.updated_at",
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                        ]
                    },
                }
            },
            {"$match": {"end_at": {"$ne": None}}},
            {
                "$project": {
                    "application_type": 1,
                    "processing_days": {
                        "$divide": [
                            {
                                # end_at - submitted_at =result(in miliseconds)so we divide it on 86400000
                                "$subtract": ["$end_at", "$submitted_at"]
                            },
                            86400000,
                        ]
                    },
                }
            },
            {
                "$group": {
                    "_id": "$application_type",
                    "average_processing_days": {"$avg": "$processing_days"},
                    "applications_count": {"$sum": 1},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "application_type": "$_id",
                    "average_processing_days": {
                        "$round": ["$average_processing_days", 2]
                    },
                    "applications_count": 1,
                }
            },
            {"$sort": {"average_processing_days": 1}},
        ]

        return list(self.collection.aggregate(pipeline))

    def get_surveyor_analytics(self):
        # we will give mongodb many step or series
        pipleline = [
            {"$match": {"role": "surveyor"}},
            {
                # connect connection with other connection
                "$lookup": {
                    # go to collection
                    "from": "survey_tasks",
                    # take id frrom survey inside staff_members
                    "localField": "_id",
                    # search inside survey tasks about tasks which assigned_surveyor_id=_id
                    # connection like this staff_members._id = survey_tasks.assigned_surveyor_id
                    "foreignField": "assigned_surveyor_id",
                    # Place the tasks you found inside an array named tasks.
                    "as": "tasks",
                }
            },
            # Choose the final result format, or create new fields.
            # This means that instead of returning all employee data, we only return the data we need for the dashboard.
            {
                "$project": {
                    "_id": 0,
                    "surveyor_id": {"$toString": "$_id"},
                    "surveyor_code": "$staff_code",
                    "surveyor_name": "$name",
                    "active_tasks": "$workload.active_tasks",
                    "max_tasks": "$workload.max_tasks",
                    "total_tasks": {"$size": "$tasks"},
                    "completed_tasks": {
                        "$size": {
                            "$filter": {
                                "input": "$tasks",
                                "as": "task",
                                "cond": {
                                    "$in": [
                                        "$$task.status",
                                        [
                                            "survey_completed",
                                            "report_uploaded",
                                            "registrar_reviewed",
                                        ]
                                    ]
                                }
                            }
                        }
                    },
                    "reports_uploaded": {
                        "$size": {
                            "$filter": {
                                "input": "$tasks",
                                "as": "task",
                                "cond": {"$eq": ["$$task.report_uploaded", True]}
                            }
                        }
                    }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "surveyor_id": 1,
                    "surveyor_code": 1,
                    "surveyor_name": 1,
                    "active": 1,
                    "active_tasks": 1,
                    "max_tasks": 1,
                    "total_tasks": 1,
                    "completed_tasks": 1,
                    "reports_uploaded": 1,
                    "completion_rate": {
                        "$cond": [
                            {"$eq": ["$total_tasks", 0]},
                            0,
                            {
                                "$round": [
                                    {
                                        "$multiply": [
                                            {"$divide": ["$completed_tasks", "$total_tasks"]},
                                            100
                                        ]
                                    },
                                    2
                                ]
                            }
                        ]
                    },
                    "workload_percentage": {
                        "$cond": [
                            {"$eq": ["$max_tasks", 0]},
                            0,
                            {
                                "$round": [
                                    {
                                        "$multiply": [
                                            {"$divide": ["$active_tasks", "$max_tasks"]},
                                            100
                                        ]
                                    },
                                    2
                                ]
                            }
                        ]
                    }
                }
            },
            {
                "$sort": {"workload_percentage": -1}
            }
        ]
        # Currently, the function will return surveyor data only.
        # we use self.staff_collection because we need to analytic from staff_members
        return list(self.staff_collection.aggregate(pipleline))
