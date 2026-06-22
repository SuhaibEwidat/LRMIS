from datetime import datetime

from repositories.application_repository import ApplicationRepository
from services.Module1.performance_log_service import log_event

repo = ApplicationRepository()


def add_internal_note_service(application_id: str, note: str, author_id: str, author_role: str):
    app = repo.get_application_by_id(application_id)
    if not app:
        return {"success": False, "error": "Application not found"}

    note_entry = {
        "type": "registrar_remark",
        "text": note,
        "author_id": author_id,
        "author_role": author_role,
        "created_at": datetime.now(),
    }

    repo.push_internal_note(application_id, note_entry)

    log_event(
        application_id=application_id,
        event_type="internal_note_added",
        actor_type=author_role,
        actor_id=author_id,
        meta={"note": note},
    )

    updated = repo.get_application_by_id(application_id)
    return {"success": True, "data": updated}
