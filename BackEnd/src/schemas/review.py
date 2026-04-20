from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_serializer


def _ser_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)


class ReviewResponse(BaseModel):
    id: str
    user_name: str
    rating: int
    comment: str | None = None
    created_at: datetime

    @field_serializer("created_at")
    def _ser(self, dt: datetime) -> str:
        return _ser_dt(dt)


class ReviewStats(BaseModel):
    total: int
    average: float
    distribution: dict[int, int]
