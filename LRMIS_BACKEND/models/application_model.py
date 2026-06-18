from datetime import datetime
from LRMIS_BACKEND.core.enums import ApplicationStatus


def application_model(data: dict):
    return {
        "application_id": data.get("application_id"),
        "application_type": data.get("application_type"),
        "status": ApplicationStatus.submitted,

        "priority": data.get("priority", "normal"),

        "applicant_ref": data.get("applicant_ref"),
        "parcel_ref": data.get("parcel_ref"),

        "description": data.get("description"),
        "tags": data.get("tags", []),

        "workflow": {
            "current_state": "submitted",
            "allowed_next": ["pre_checked", "rejected"],
            "version": "v1.0"
        },

        "required_documents": data.get("required_documents", []),

        "timestamps": {
            "submitted_at": datetime.now(),
            "updated_at": datetime.now()
        },

        "assignment": {
            "assigned_surveyor_id": None,
            "assigned_registrar_id": None
        },

        "objection": {
            "has_objection": False,
            "objection_ids": []
        },

        "internal": {
            "notes": [],
            "visibility": "staff_only"
        }
    }