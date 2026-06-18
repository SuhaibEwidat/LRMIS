from datetime import datetime


def performance_log_model(application_id: str):
    return {
        "application_id": application_id,

        "event_stream": [
            {
                "type": "created",
                "by": {
                    "actor_type": "system",
                    "actor_id": "init"
                },
                "at": datetime.now(),
                "meta": {
                    "message": "application log initialized"
                }
            }
        ],

        "computed_kpis": {
            "processing_days": None,
            "precheck_minutes": None,
            "survey_delay_days": None,
            "certificate_issued": False
        },

        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }