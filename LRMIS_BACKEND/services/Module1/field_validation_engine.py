from core.enums import ApplicationStatus
from services.Module1.geo_validation_engine import validate_geojson


def validate_fields_for_transition(application: dict, new_state: str):
    errors = []

    applicant = application.get("applicant_ref")
    parcel = application.get("parcel_ref")

    workflow = application.get("workflow", {})
    current_state = workflow.get("current_state")

    geometry = application.get("parcel_geometry")

    # -------------------------
    # Global validations (always run)
    # -------------------------
    

    # -------------------------
    # 1. pre_checked
    # -------------------------
    if new_state == ApplicationStatus.pre_checked.value:
        if not applicant:
            errors.append("Applicant is required for pre_checked")
        if not parcel:
            errors.append("Parcel is required for pre_checked")

    # -------------------------
    # 2. survey_required
    # -------------------------
    if new_state == ApplicationStatus.survey_required.value:
     if not parcel:
        errors.append("Valid parcel is required for survey_required")

    if not geometry:
        errors.append("Parcel geometry is required for survey_required")
    else:
        geo_result = validate_geojson(geometry)
        if not geo_result["valid"]:
            errors.extend(geo_result["errors"])
    # -------------------------
    # 3. surveyed
    # -------------------------
    if new_state == ApplicationStatus.surveyed.value:
        survey_report = application.get("survey_report")
        if not survey_report:
            errors.append("Survey report is required for surveyed")

    # -------------------------
    # 4. legal_review
    # -------------------------
    if new_state == ApplicationStatus.legal_review.value:
        ownership_docs = application.get("ownership_documents")
        if not ownership_docs:
            errors.append("Ownership documents required for legal review")

    # -------------------------
    # 5. approved
    # -------------------------
    if new_state == ApplicationStatus.approved.value:
        if current_state != ApplicationStatus.legal_review.value:
            errors.append("Must complete legal review before approval")

    # -------------------------
    # 6. certificate_issued
    # -------------------------
    if new_state == ApplicationStatus.certificate_issued.value:
        if current_state != ApplicationStatus.approved.value:
            errors.append("Application must be approved before certificate issuance")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }