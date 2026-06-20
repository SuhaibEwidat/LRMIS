from database.database import get_database

db = get_database()

collection = db["certificates"]


class CertificateRepository:

    def create(self, certificate: dict):
        return collection.insert_one(certificate)

    def get_by_certificate_id(self, certificate_id: str):
        return collection.find_one({
            "certificate_id": certificate_id
        })

    def get_application_by_id(self, application_id: str):
        return collection.find_one({
            "application_id": application_id
        })