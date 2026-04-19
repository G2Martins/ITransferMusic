from pydantic import BaseModel

from src.models.common import Provider


class Track(BaseModel):
    id: str
    name: str
    artist: str
    album: str | None = None
    uri: str
    provider: Provider
