from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.models.common import Provider, PyObjectId


class LinkedAccountDocument(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: PyObjectId
    provider: Provider
    provider_user_id: str | None = None
    provider_display_name: str | None = None

    access_token_encrypted: str
    refresh_token_encrypted: str | None = None
    expires_at: datetime | None = None
    scope: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_mongo(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data
