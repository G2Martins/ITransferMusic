from pydantic import BaseModel

from src.models.common import Provider


class PlaylistSummary(BaseModel):
    id: str
    name: str
    description: str | None = None
    image_url: str | None = None
    track_count: int | None = None
    provider: Provider
