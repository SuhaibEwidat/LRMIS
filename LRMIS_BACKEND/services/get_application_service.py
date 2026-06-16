async def get_application_service(app_id, repository):
    return await repository.collection.find_one({"application_id": app_id})