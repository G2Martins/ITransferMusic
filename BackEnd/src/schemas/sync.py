from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_serializer

from src.models.common import Provider
from src.models.sync import SyncFrequency, SyncMethod, SyncStatus


def _ser_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


class PlaylistSyncCreate(BaseModel):
    source_provider: Provider
    source_playlist_id: str = Field(min_length=1)
    source_playlist_name: str | None = None

    target_provider: Provider
    target_playlist_id: str = Field(min_length=1)
    target_playlist_name: str | None = None

    frequency: SyncFrequency = SyncFrequency.DAILY
    run_hour: int = Field(default=2, ge=0, le=23)
    run_minute: int = Field(default=0, ge=0, le=59)
    method: SyncMethod = SyncMethod.ADD_ONLY


class PlaylistSyncResponse(BaseModel):
    id: str
    source_provider: Provider
    source_playlist_id: str
    source_playlist_name: str | None = None
    target_provider: Provider
    target_playlist_id: str
    target_playlist_name: str | None = None
    frequency: SyncFrequency
    run_hour: int
    run_minute: int
    method: SyncMethod
    status: SyncStatus
    last_synced_at: datetime | None = None
    last_error: str | None = None
    tracks_added_last_run: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at", "last_synced_at")
    def _ser(self, dt: datetime | None) -> str | None:
        return _ser_dt(dt)


class PlaylistSyncToggle(BaseModel):
    status: SyncStatus
