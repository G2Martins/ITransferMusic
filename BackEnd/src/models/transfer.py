from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.models.common import Provider, PyObjectId


class TransferStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class TransferTrackResult(BaseModel):
    source_track_id: str
    source_name: str
    source_artist: str
    matched_target_id: str | None = None
    matched: bool = False


class TransferDocument(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: PyObjectId

    source_provider: Provider
    target_provider: Provider
    source_playlist_id: str
    target_playlist_id: str | None = None

    target_playlist_name: str
    target_playlist_description: str | None = None
    source_playlist_name: str | None = None
    selected_track_ids: list[str] | None = None
    apply_watermark: bool = True

    status: TransferStatus = TransferStatus.PENDING
    total_tracks: int = 0
    matched_tracks: int = 0
    results: list[TransferTrackResult] = Field(default_factory=list)
    error_message: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_mongo(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data
