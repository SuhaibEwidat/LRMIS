from enum import Enum


class ApplicationStatus(str, Enum):
    submitted = "submitted"
    pre_checked = "pre_checked"
    survey_required = "survey_required"
    surveyed = "surveyed"
    legal_review = "legal_review"
    approved = "approved"
    certificate_issued = "certificate_issued"
    closed = "closed"

    rejected = "rejected"
    on_hold = "on_hold"
    missing_documents = "missing_documents"
    under_objection = "under_objection"