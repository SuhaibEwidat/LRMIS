from datetime import datetime


def certificate_model(data: dict):
    return {
        "certificate_id": data.get("certificate_id"),
        "application_id": data.get("application_id"),
        "parcel_id": data.get("parcel_id"),

        "certificate_type": data.get(
            "certificate_type",
            "ownership_certificate",
        ),

        "status": "issued",

        "issued_to": {
            "applicant_id": data.get("applicant_id"),
            "full_name": data.get("full_name"),
        },

        "issued_at": datetime.utcnow(),

        "issued_by": data.get("issued_by"),

        "verification": {
            "qr_code_url": data.get("qr_code_url"),
            "digital_signature_stub": data.get("digital_signature_stub"),
        },
    }