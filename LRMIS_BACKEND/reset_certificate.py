from database.database import get_database
from datetime import datetime

app_id = "LRMIS-2026-0024"

db = get_database()

cert_count = db['certificates'].count_documents({"application_id": app_id})
print(f"Certificates count before: {cert_count}")

del_res = db['certificates'].delete_many({"application_id": app_id})
print(f"Deleted certificates: {del_res.deleted_count}")

update_res = db['land_applications'].update_one(
    {"application_id": app_id},
    {"$set": {
        "workflow.current_state": "approved",
        "status": "approved",
        "certificate.issued": False,
        "certificate.certificate_id": None,
        "timestamps.updated_at": datetime.utcnow(),
    }}
)
print(f"Application matched: {update_res.matched_count}, modified: {update_res.modified_count}")

app = db['land_applications'].find_one({"application_id": app_id})
print("Current workflow.current_state:", app.get('workflow', {}).get('current_state'))
print("Current certificate:", app.get('certificate'))
print("Done")
