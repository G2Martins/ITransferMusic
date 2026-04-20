from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.models.common import Provider, PyObjectId


class SyncStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"


class PlaylistSyncDocument(BaseModel):
    """Mantem duas playlists (origem e destino) em sincronia periodica."""

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    id: PyObjectId | None = Field(default=None, alias="_id")
    user_id: PyObjectId

    source_provider: Provider
    source_playlist_id: str
    source_playlist_name: str | None = None

    target_provider: Provider
    target_playlist_id: str
    target_playlist_name: str | None = None

    status: SyncStatus = SyncStatus.ACTIVE
    last_synced_at: datetime | None = None
    last_error: str | None = None
    tracks_added_last_run: int = 0

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_mongo(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data
