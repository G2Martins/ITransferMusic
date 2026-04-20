from pydantic import BaseModel, Field

from src.models.common import Provider
from src.schemas.track import Track


class GeneratorRequest(BaseModel):
    """Payload do gerador de playlists baseado em humor + gêneros + prompt."""

    source_provider: Provider
    prompt: str | None = Field(default=None, max_length=500)
    genres: list[str] = Field(default_factory=list)
    moods: list[str] = Field(default_factory=list)
    count: int = Field(default=20, ge=1, le=50)
    exclude_track_ids: list[str] = Field(default_factory=list)


class GeneratorResponse(BaseModel):
    tracks: list[Track]
    used_queries: list[str]


class GeneratorSaveRequest(BaseModel):
    target_provider: Provider
    playlist_name: str = Field(min_length=1, max_length=200)
    playlist_description: str | None = Field(default=None, max_length=500)
    # Track data (name + artist) para busca no destino.
    tracks: list[dict] = Field(default_factory=list)


class GeneratorSaveResponse(BaseModel):
    playlist_id: str
    matched_count: int
    total_count: int
