from datetime import datetime

from pydantic import BaseModel, Field

from src.models.common import Provider
from src.models.transfer import TransferStatus, TransferTrackResult


class PlaylistTransferCreate(BaseModel):
    source_provider: Provider
    target_provider: Provider
    source_playlist_id: str = Field(min_length=1)
    source_playlist_name: str | None = Field(default=None, max_length=200)
    target_playlist_name: str = Field(min_length=1, max_length=200)
    target_playlist_description: str | None = Field(default=None, max_length=500)
    # Se None, transfere todas as faixas. Se lista, filtra para esses track IDs.
    selected_track_ids: list[str] | None = None
    # Se True, aplica o texto pre-formatado "By ITransferMusic" no nome/desc.
    apply_watermark: bool = True


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
