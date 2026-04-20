from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_serializer

from src.models.common import Provider
from src.models.transfer import TransferStatus, TransferTrackResult


def _serialize_utc(dt: datetime) -> str:
    """Garante timezone UTC com sufixo Z para o frontend interpretar corretamente."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


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

    @field_serializer("created_at", "updated_at")
    def _ser_dt(self, dt: datetime) -> str:
        return _serialize_utc(dt)
