from shapely.geometry import shape, Polygon


def validate_geojson(geometry: dict):

    errors = []

    # -----------------------------
    # 1. Check existence
    # -----------------------------
    if not geometry:
        return {
            "valid": False,
            "errors": ["Geometry is required"]
        }

    # -----------------------------
    # 2. Check type
    # -----------------------------
    if geometry.get("type") != "Polygon":
        errors.append("Geometry must be a Polygon")

    # -----------------------------
    # 3. Validate coordinates structure
    # -----------------------------
    coords = geometry.get("coordinates")

    if not coords or not isinstance(coords, list):
        errors.append("Invalid coordinates structure")

    else:
        try:
            polygon = shape(geometry)

            # -----------------------------
            # 4. Check if valid polygon
            # -----------------------------
            if not polygon.is_valid:
                errors.append("Invalid polygon geometry (self-intersection or malformed)")

            # -----------------------------
            # 5. Check minimum points
            # -----------------------------
            if len(coords[0]) < 4:
                errors.append("Polygon must have at least 4 coordinates")

        except Exception as e:
            errors.append(f"Geometry parsing error: {str(e)}")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }