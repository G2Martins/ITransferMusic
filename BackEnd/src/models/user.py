from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.models.common import PyObjectId


class UserDocument(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    id: PyObjectId | None = Field(default=None, alias="_id")
    name: str
    email: EmailStr
    # hashed_password opcional pois usuarios criados via Google Sign-in nao tem senha local.
    hashed_password: str | None = None
    google_id: str | None = None
    avatar_url: str | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_mongo(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data
