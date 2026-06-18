from LRMIS_BACKEND.database.database import get_database

db = get_database()
collection = db["parcels"]


class ParcelsRepository:

    def create(self, parcel: dict):
        return collection.insert_one(parcel)

    def find_by_id(self, parcel_id: str):
        return collection.find_one({"_id": parcel_id})

    def find_by_parcel_code(self, code: str):
        return collection.find_one({"parcel_code": code})

    def update(self, parcel_id: str, data: dict):
        return collection.update_one(
            {"_id": parcel_id},
            {"$set": data}
        )