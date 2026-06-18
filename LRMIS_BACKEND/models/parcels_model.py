from datetime import datetime


def parcel_model(data: dict):
    return {
        "parcel_code": data.get("parcel_code"),  # RM-Z01-B12-P145
        "parcel_number": data.get("parcel_number"),
        "block_number": data.get("block_number"),
        "basin_number": data.get("basin_number"),
        "zone_id": data.get("zone_id"),

        "current_owner_refs": data.get("current_owner_refs", []),

        "area_sqm": data.get("area_sqm"),
        "land_use": data.get("land_use", "residential"),

        "registration_status": "registered",

        "geometry": data.get("geometry"),  # GeoJSON Polygon

        "address_hint": data.get("address_hint"),

        "dispute_state": "none",

        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }