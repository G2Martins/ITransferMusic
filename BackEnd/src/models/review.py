from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.models.common import PyObjectId


class ReviewDocument(BaseModel):
    """Avaliacao (NPS 1-5 estrelas) deixada por um usuario."""

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: PyObjectId
    user_name: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_mongo(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data
