from datetime import datetime
from LRMIS_BACKEND.services.application_service  import can_transition


def transition_application_service(app, new_state, repository):

    current_state = app["workflow"]["current_state"]

    if not can_transition(current_state, new_state):
        return {
            "error": f"Invalid transition {current_state} -> {new_state}"
        }

    # update state
    repository.collection.update_one(
        {"application_id": app["application_id"]},
        {
            "$set": {
                "workflow.current_state": new_state,
                "timestamps.updated_at": datetime.utcnow()
            }
        }
    )

    return repository.collection.find_one({"application_id": app["application_id"]})