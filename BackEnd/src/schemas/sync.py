from datetime import datetime

from pydantic import BaseModel, Field

from src.models.common import Provider
from src.models.sync import SyncStatus


class PlaylistSyncCreate(BaseModel):
    source_provider: Provider
    source_playlist_id: str = Field(min_length=1)
    source_playlist_name: str | None = None

    target_provider: Provider
    target_playlist_id: str = Field(min_length=1)
    target_playlist_name: str | None = None


class PlaylistSyncResponse(BaseModel):
    id: str
    source_provider: Provider
    source_playlist_id: str
    source_playlist_name: str | None = None
    target_provider: Provider
    target_playlist_id: str
    target_playlist_name: str | None = None
    status: SyncStatus
    last_synced_at: datetime | None = None
    last_error: str | None = None
    tracks_added_last_run: int
    created_at: datetime
    updated_at: datetime


class PlaylistSyncToggle(BaseModel):
    status: SyncStatus
