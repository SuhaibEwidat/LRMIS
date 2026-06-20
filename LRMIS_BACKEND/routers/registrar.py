from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from services.Module3 import registrar


router = APIRouter(
    prefix="/applications",
    tags=["Model 3 - Registrar"]
)


class RegistrarReviewRequest(BaseModel):
    decision: str  # approved, needs_correction, rejected
    reviewed_by: str
    notes: Optional[str] = None


def model_to_dict(model):
    try:
        return model.model_dump(exclude_unset=True)
    except AttributeError:
        return model.dict(exclude_unset=True)


@router.patch("/{application_id}/registrar-review")
def registrar_review(application_id: str, request: RegistrarReviewRequest):
    data = model_to_dict(request)

    return registrar.registrar_review_service(
        application_id=application_id,
        decision=data["decision"],
        reviewed_by=data["reviewed_by"],
        notes=data.get("notes")
    )