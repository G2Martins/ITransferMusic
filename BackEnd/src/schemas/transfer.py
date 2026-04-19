from datetime import datetime

from pydantic import BaseModel, Field

from src.models.common import Provider
from src.models.transfer import TransferStatus, TransferTrackResult


class PlaylistTransferCreate(BaseModel):
    source_provider: Provider
    target_provider: Provider
    source_playlist_id: str = Field(min_length=1)
    target_playlist_name: str = Field(min_length=1, max_length=200)
    target_playlist_description: str | None = Field(default=None, max_length=500)


class TransferResponse(BaseModel):
    id: str
    source_provider: Provider
    target_provider: Provider
    source_playlist_id: str
    target_playlist_id: str | None = None
    target_playlist_name: str
    status: TransferStatus
    total_tracks: int
    matched_tracks: int
    results: list[TransferTrackResult]
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
