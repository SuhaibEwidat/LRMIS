from models.parcels_model import parcel_model
from repositories.parcels_repository import ParcelsRepository

repo = ParcelsRepository()


def create_parcel_service(data: dict):

    # 1. build parcel
    parcel = parcel_model(data)

    # 2. insert
    result = repo.create(parcel)

    return {
        "success": True,
        "id": str(result.inserted_id)
    }