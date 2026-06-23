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
        pipeline = [
            {"$match": {"role": "surveyor"}},
            {
                "$lookup": {
                    "from": "survey_tasks",
                    "localField": "_id",
                    "foreignField": "assigned_surveyor_id",
                    "as": "tasks",
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "surveyor_id": {"$toString": "$_id"},
                    "surveyor_code": "$staff_code",
                    "surveyor_name": "$name",
                    "active": "$active",
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
                                        ],
                                    ]
                                },
                            }
                        }
                    },
                    "reports_uploaded": {
                        "$size": {
                            "$filter": {
                                "input": "$tasks",
                                "as": "task",
                                "cond": {"$eq": ["$$task.report_uploaded", True]},
                            }
                        }
                    },
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
                                            {
                                                "$divide": [
                                                    "$completed_tasks",
                                                    "$total_tasks",
                                                ]
                                            },
                                            100,
                                        ]
                                    },
                                    2,
                                ]
                            },
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
                                            {
                                                "$divide": [
                                                    "$active_tasks",
                                                    "$max_tasks",
                                                ]
                                            },
                                            100,
                                        ]
                                    },
                                    2,
                                ]
                            },
                        ]
                    },
                }
            },
            {"$sort": {"workload_percentage": -1}},
        ]

        return list(self.staff_collection.aggregate(pipeline))

    def get_registrar_workload(self):
        pipeline = [
            {
                "$match": {
                    "role": "registrar"
                }
            },
            {
                "$lookup": {
                    "from": "land_applications",
                    "let": {
                        "registrar_id_obj": "$_id",
                        "registrar_id_str": {"$toString": "$_id"},
                        "registrar_code": "$staff_code"
                    },
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$or": [
                                        {
                                            "$eq": [
                                                "$assignment.assigned_registrar_id",
                                                "$$registrar_id_obj"
                                            ]
                                        },
                                        {
                                            "$eq": [
                                                "$assignment.assigned_registrar_id",
                                                "$$registrar_id_str"
                                            ]
                                        },
                                        {
                                            "$eq": [
                                                "$assignment.assigned_registrar_id",
                                                "$$registrar_code"
                                            ]
                                        },
                                        {
                                            "$eq": [
                                                "$assignment.assigned_registrar_code",
                                                "$$registrar_code"
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "applications"
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "registrar_id": {"$toString": "$_id"},
                    "registrar_code": "$staff_code",
                    "registrar_name": "$name",
                    "active": "$active",

                    "active_tasks": {
                        "$ifNull": ["$workload.active_tasks", 0]
                    },
                    "max_tasks": {
                        "$ifNull": ["$workload.max_tasks", 0]
                    },

                    "pending_reviews": {
                        "$size": {
                            "$filter": {
                                "input": "$applications",
                                "as": "app",
                                "cond": {
                                    "$in": [
                                        "$$app.workflow.current_state",
                                        ["legal_review", "surveyed"]
                                    ]
                                }
                            }
                        }
                    },

                    "completed_reviews": {
                        "$size": {
                            "$filter": {
                                "input": "$applications",
                                "as": "app",
                                "cond": {
                                    "$in": [
                                        "$$app.workflow.current_state",
                                        [
                                            "approved",
                                            "rejected",
                                            "on_hold",
                                            "certificate_issued",
                                            "closed"
                                        ]
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                "$project": {
                    "registrar_id": 1,
                    "registrar_code": 1,
                    "registrar_name": 1,
                    "active": 1,
                    "active_tasks": 1,
                    "max_tasks": 1,
                    "pending_reviews": 1,
                    "completed_reviews": 1,

                    "workload_percentage": {
                        "$cond": [
                            {"$eq": ["$max_tasks", 0]},
                            0,
                            {
                                "$round": [
                                    {
                                        "$multiply": [
                                            {
                                                "$divide": [
                                                    "$active_tasks",
                                                    "$max_tasks"
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            }
                        ]
                    }
                }
            }
        ]

        return list(self.staff_collection.aggregate(pipeline))

    def get_parcels_with_geometry(self):
        """
        Get parcel map data directly from land_applications.

        We are not using a separate parcels collection here.
        The parcel boundary comes from:
        land_applications.parcel_geometry
        """
        applications = self.collection.find(
            {
                "parcel_geometry": {
                    "$exists": True,
                    "$nin": [None, {}],
                }
            }
        )

        parcels = []
        seen_keys = set()

        for app in applications:
            parcel_ref = app.get("parcel_ref", {})
            geometry = app.get("parcel_geometry")

            if not geometry:
                continue

            parcel_key = (
                parcel_ref.get("parcel_id"),
                parcel_ref.get("parcel_number"),
                parcel_ref.get("zone_id"),
            )

            if parcel_key in seen_keys:
                continue

            seen_keys.add(parcel_key)

            parcels.append(
                {
                    "_id": parcel_ref.get("parcel_id") or str(app.get("_id")),
                    "parcel_code": parcel_ref.get("parcel_id"),
                    "parcel_number": parcel_ref.get("parcel_number"),
                    "block_number": parcel_ref.get("block_number"),
                    "basin_number": parcel_ref.get("basin_number"),
                    "zone_id": parcel_ref.get("zone_id"),
                    "area_sqm": None,
                    "land_use": None,
                    "registration_status": None,
                    "geometry": geometry,
                    "address_hint": None,
                    "dispute_state": None,
                }
            )

        return parcels

    def get_pending_applications_with_parcels(self):
        """
        Get pending applications directly from land_applications.

        We are not using a separate parcels collection here.
        The parcel boundary comes from:
        land_applications.parcel_geometry
        """
        query = {
            "workflow.current_state": {
                "$nin": TERMINAL_STATES
            },
            "parcel_geometry": {
                "$exists": True,
                "$nin": [None, {}],
            },
        }

        applications = list(self.collection.find(query))
        result = []

        for app in applications:
            parcel_ref = app.get("parcel_ref", {})
            geometry = app.get("parcel_geometry")

            if not geometry:
                continue

            parcel = {
                "_id": parcel_ref.get("parcel_id") or str(app.get("_id")),
                "parcel_code": parcel_ref.get("parcel_id"),
                "parcel_number": parcel_ref.get("parcel_number"),
                "block_number": parcel_ref.get("block_number"),
                "basin_number": parcel_ref.get("basin_number"),
                "zone_id": parcel_ref.get("zone_id"),
                "geometry": geometry,
            }

            result.append(
                {
                    "application": app,
                    "parcel": parcel,
                }
            )

        return result
