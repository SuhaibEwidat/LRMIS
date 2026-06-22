from core.enums import ApplicationStatus
from services.Module1.geo_validation_engine import validate_geojson

APPLICANT_REQUIRED_FIELDS = ["applicant_id", "applicant_type"]
PARCEL_REQUIRED_FIELDS = [
    "parcel_id",
    "parcel_number",
    "block_number",
    "basin_number",
    "zone_id",
]


def _ref_is_complete(ref: dict, required_fields: list) -> bool:
    if not ref or not isinstance(ref, dict):
        return False
    return all(ref.get(field) for field in required_fields)


def _has_ownership_documents(application: dict) -> bool:
    if application.get("ownership_documents"):
        return True

    attachments = application.get("attachments", [])
    return any(
        attachment.get("document_type") == "ownership"
        for attachment in attachments
    )


def validate_fields_for_transition(
    application: dict,
    new_state: str,
    pending_updates: dict = None,
):
    errors = []
    pending_updates = pending_updates or {}

    applicant = application.get("applicant_ref")
    parcel = application.get("parcel_ref")
    workflow = application.get("workflow", {})
    current_state = workflow.get("current_state")
    geometry = application.get("parcel_geometry")

    if new_state == ApplicationStatus.pre_checked.value:
        if not _ref_is_complete(applicant, APPLICANT_REQUIRED_FIELDS):
            errors.append("Complete applicant information is required for pre_checked")
        if not _ref_is_complete(parcel, PARCEL_REQUIRED_FIELDS):
            errors.append("Complete parcel information is required for pre_checked")

    if new_state == ApplicationStatus.survey_required.value:
        if not _ref_is_complete(parcel, PARCEL_REQUIRED_FIELDS):
            errors.append("Valid parcel is required for survey_required")
        if not geometry:
            errors.append("Parcel geometry is required for survey_required")
        else:
            geo_result = validate_geojson(geometry)
            if not geo_result["valid"]:
                errors.extend(geo_result["errors"])

    if new_state == ApplicationStatus.surveyed.value:
        if not application.get("survey_report"):
            errors.append("Survey report is required for surveyed")

    if new_state == ApplicationStatus.legal_review.value:
        if not _has_ownership_documents(application):
            errors.append("Ownership documents must be uploaded before legal review")

    if new_state == ApplicationStatus.approved.value:
        if current_state != ApplicationStatus.legal_review.value:
            errors.append("Legal review must be completed before approval")

    if new_state == ApplicationStatus.certificate_issued.value:
        if current_state != ApplicationStatus.approved.value:
            errors.append("Application must be approved before certificate issuance")

    if new_state == ApplicationStatus.rejected.value:
        rejection_reason = pending_updates.get("workflow.rejection_reason") or workflow.get(
            "rejection_reason"
        )
        if not rejection_reason:
            errors.append("Rejection reason is required")

    objection = application.get("objection", {})
    if objection.get("has_objection") and new_state != ApplicationStatus.under_objection.value:
        if current_state != ApplicationStatus.under_objection.value:
            errors.append("Applications with objections must move to under_objection")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
    }
