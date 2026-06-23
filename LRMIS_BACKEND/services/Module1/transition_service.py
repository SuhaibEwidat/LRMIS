from datetime import datetime
from core.enums import ApplicationStatus
from services.Module1.workflow_rules import can_transition
from services.Module1.field_validation_engine import validate_fields_for_transition
from repositories.application_repository import ApplicationRepository
from services.Module1.performance_log_service import log_event

repo = ApplicationRepository()


# -------------------------
# CORE ENGINE
# -------------------------

def transition_application_service(application_id: str, new_state: str, extra_updates: dict = None):
    application = repo.get_application_by_id(application_id)
    current_state = application["workflow"]["current_state"]

    # 1. validate transition rules
    if not can_transition(current_state, new_state):
        return {
            "success": False,
            "error": f"Invalid transition {current_state} -> {new_state}"
        }

    # 2. validate business fields
    validation = validate_fields_for_transition(application, new_state)

    if not validation["valid"]:
        return {
            "success": False,
            "error": validation["errors"]
        }

    # 3. update DB
    repo.update_workflow_state(application_id, new_state, extra_updates)

    # 4. log event
    log_event(
        application_id=application_id,
        event_type=new_state,
        actor_type="system",
        actor_id="system_engine",
        meta={
            "from": current_state,
            "to": new_state
        }
    )

    # 5. return fresh data
    updated = repo.get_application_by_id(application_id)

    if not updated:
        return {"success": False, "error": "Application not found after update"}

    return {
        "success": True,
        "data": updated
    }



#reject application
def reject_application_service(application_id: str, reason: str):

    if not reason:
        return {"success": False, "error": "Rejection reason is required"}

    return transition_application_service(
        application_id,
        ApplicationStatus.rejected.value,
        extra_updates={
            "workflow.rejection_reason": reason,
            "timestamps.rejected_at": datetime.now()
        }
    )

# hold application
def hold_application_service(application_id: str, reason: str):

    if not reason:
        return {"success": False, "error": "Hold reason is required"}

    return transition_application_service(
        application_id,
        ApplicationStatus.on_hold.value,
        extra_updates={
            "workflow.hold_reason": reason,
            "timestamps.hold_at": datetime.now()
        }
    )

# missing documents
def mark_missing_documents_service(application_id: str, missing_docs: list):

    if not missing_docs:
        return {"success": False, "error": "Missing documents required"}

    return transition_application_service(
        application_id,
        ApplicationStatus.missing_documents.value,
        extra_updates={
            "workflow.missing_documents": missing_docs,
            "timestamps.updated_at": datetime.now()
        }
    )