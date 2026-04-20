from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.db import get_database
from src.dependencies import CurrentUserId
from src.models.review import ReviewDocument
from src.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewStats,
)
from src.services.review_service import ReviewService


def _service(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> ReviewService:
    return ReviewService(db)


ServiceDep = Annotated[ReviewService, Depends(_service)]

router = APIRouter()


def _to_response(doc: ReviewDocument) -> ReviewResponse:
    return ReviewResponse(
        id=str(doc.id),
        user_name=doc.user_name,
        rating=doc.rating,
        comment=doc.comment,
        created_at=doc.created_at,
    )


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(service: ServiceDep) -> list[ReviewResponse]:
    docs = await service.list_latest(limit=50)
    return [_to_response(d) for d in docs]


@router.get("/stats", response_model=ReviewStats)
async def stats(service: ServiceDep) -> ReviewStats:
    total, average, dist = await service.stats()
    return ReviewStats(total=total, average=average, distribution=dist)


@router.get("/mine", response_model=ReviewResponse | None)
async def my_review(
    user_id: CurrentUserId, service: ServiceDep
) -> ReviewResponse | None:
    doc = await service.get_mine(user_id)
    return _to_response(doc) if doc else None


@router.post(
    "",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    payload: ReviewCreate,
    user_id: CurrentUserId,
    service: ServiceDep,
) -> ReviewResponse:
    try:
        doc = await service.create(user_id, payload.rating, payload.comment)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return _to_response(doc)
