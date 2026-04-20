from pydantic import BaseModel, Field

from src.models.common import Provider
from src.schemas.transfer import TransferTrackResult


class SharePublicResponse(BaseModel):
    """Resposta publica do /shares/{token} — sem ids privados."""

    token: str
    owner_name: str
    owner_id: str

    playlist_name: str
    playlist_description: str | None = None
    playlist_image_url: str | None = None
    source_provider: Provider
    source_playlist_id: str
    target_provider: Provider
    target_playlist_id: str | None = None
    total_tracks: int
    matched_tracks: int
    tracks: list[TransferTrackResult]


class ShareTokenResponse(BaseModel):
    token: str
    share_url: str


class ShareUpdateRequest(BaseModel):
    playlist_name: str | None = Field(default=None, max_length=200)
    playlist_description: str | None = Field(default=None, max_length=500)
