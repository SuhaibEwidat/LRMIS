from core.enums import ApplicationStatus

WORKFLOW_RULES = {
    ApplicationStatus.submitted.value: [
        ApplicationStatus.pre_checked.value,
        ApplicationStatus.rejected.value,
        ApplicationStatus.on_hold.value,
    ],
    ApplicationStatus.pre_checked.value: [
        ApplicationStatus.survey_required.value,
        ApplicationStatus.missing_documents.value,
        ApplicationStatus.rejected.value,
        ApplicationStatus.on_hold.value,
        ApplicationStatus.under_objection.value,
    ],
    ApplicationStatus.survey_required.value: [
        ApplicationStatus.surveyed.value,
        ApplicationStatus.rejected.value,
        ApplicationStatus.on_hold.value,
        ApplicationStatus.under_objection.value,
    ],
    ApplicationStatus.surveyed.value: [
        ApplicationStatus.legal_review.value,
        ApplicationStatus.on_hold.value,
        ApplicationStatus.under_objection.value,
    ],
    ApplicationStatus.legal_review.value: [
        ApplicationStatus.approved.value,
        ApplicationStatus.rejected.value,
        ApplicationStatus.under_objection.value,
    ],
    ApplicationStatus.approved.value: [
        ApplicationStatus.certificate_issued.value,
    ],
    ApplicationStatus.certificate_issued.value: [
        ApplicationStatus.closed.value,
    ],
    ApplicationStatus.on_hold.value: [
        ApplicationStatus.pre_checked.value,
        ApplicationStatus.survey_required.value,
        ApplicationStatus.surveyed.value,
        ApplicationStatus.legal_review.value,
        ApplicationStatus.rejected.value,
    ],
    ApplicationStatus.missing_documents.value: [
        ApplicationStatus.pre_checked.value,
        ApplicationStatus.survey_required.value,
        ApplicationStatus.legal_review.value,
        ApplicationStatus.rejected.value,
    ],
    ApplicationStatus.under_objection.value: [
        ApplicationStatus.pre_checked.value,
        ApplicationStatus.survey_required.value,
        ApplicationStatus.surveyed.value,
        ApplicationStatus.legal_review.value,
        ApplicationStatus.rejected.value,
    ],
    ApplicationStatus.rejected.value: [],
    ApplicationStatus.closed.value: [],
}


def can_transition(current_state: str, new_state: str) -> bool:
    allowed = WORKFLOW_RULES.get(current_state, [])
    return new_state in allowed
