from datetime import datetime
from LRMIS.models.application_model import application_model


async def create_application_service(data, repository, idempotency_key=None):
    collection = repository.collection

    # 1. check duplicate
    if idempotency_key:
        existing =await collection.find_one({"idempotency_key": idempotency_key})
        if existing:
            return existing

    # 2. get last number for ID
    last =  await collection.find_one(sort=[("application_id", -1)])
    last_number = 1

    if last and "application_id" in last:
        try:
            last_number = int(last["application_id"].split("-")[-1]) + 1
        except:
            last_number = 1

    application_id = f"LRMIS-2026-{str(last_number).zfill(4)}"

    # 3. build document
    new_app = application_model(data)
    new_app["application_id"] = application_id

    # 4. timestamps
    new_app["timestamps"]["submitted_at"] = datetime.utcnow()

    # 5. insert
    result = await collection.insert_one(new_app)
   
    app =await collection.find_one({"_id": result.inserted_id})
    app["_id"] = str(app["_id"])
    return app