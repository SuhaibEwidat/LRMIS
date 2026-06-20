from datetime import datetime

from repositories.audit_repository import AuditRepository

repo = AuditRepository()


def log_event(
    application_id: str,
    event_type: str,
    actor_type: str,
    actor_id: str,
    meta: dict = None
):

    event = {
        "type": event_type,
        "by": {
            "actor_type": actor_type,
            "actor_id": actor_id
        },
        "at": datetime.now(),
        "meta": meta or {}
    }

    repo.push_event(application_id, event)

    return event