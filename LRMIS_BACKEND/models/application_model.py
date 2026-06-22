from datetime import datetime


def application_model(data: dict):
    return {
        "application_id": data.get("application_id"),
        "application_type": data.get("application_type"),
        "priority": data.get("priority", "normal"),
        "idempotency_key": data.get("idempotency_key"),

        "applicant_ref": data.get("applicant_ref"),
        "parcel_ref": data.get("parcel_ref"),
        "parcel_geometry": data.get("parcel_geometry"),

        "description": data.get("description"),
        "tags": data.get("tags", []),
        "attachments": data.get("attachments", []),
        "survey_report": data.get("survey_report"),
        "ownership_documents": data.get("ownership_documents", []),

        "workflow": {
            "current_state": "submitted",
            "version": "v1.0",
        },

        "certificate": {
            "issued": False,
            "certificate_id": None,
        },

        "timestamps": {
            "submitted_at": datetime.now(),
            "updated_at": datetime.now(),
        },

        "objection": {
            "has_objection": False,
            "objection_ids": [],
        },

        "internal": {
            "notes": [],
            "visibility": "staff_only",
        },
    }
