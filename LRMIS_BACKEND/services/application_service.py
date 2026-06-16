from datetime import datetime
from LRMIS.core.enums import ApplicationStatus


def generate_application_id(last_number: int):
    year = datetime.now().year
    return f"LRMIS-{year}-{str(last_number).zfill(4)}"

def check_duplicate(collection, idempotency_key: str):
    return collection.find_one({"idempotency_key": idempotency_key})



WORKFLOW_RULES = {
    "submitted": ["pre_checked", "rejected"],
    "pre_checked": ["survey_required", "missing_documents", "rejected"],
    "survey_required": ["surveyed"],
    "surveyed": ["legal_review"],
    "legal_review": ["approved"],
    "approved": ["certificate_issued"],
    "certificate_issued": ["closed"]
}
def can_transition(current_state: str, new_state: str):
    allowed = WORKFLOW_RULES.get(current_state, [])
    return new_state in allowed