from enum import StrEnum
from typing import Annotated, Any

from bson import ObjectId
from pydantic import BeforeValidator


class Provider(StrEnum):
    SPOTIFY = "spotify"
    YOUTUBE = "youtube"
    APPLE_MUSIC = "apple_music"
    AMAZON_MUSIC = "amazon_music"
    DEEZER = "deezer"


def _validate_object_id(value: Any) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str) and ObjectId.is_valid(value):
        return ObjectId(value)
    raise ValueError(f"ObjectId invalido: {value!r}")


PyObjectId = Annotated[ObjectId, BeforeValidator(_validate_object_id)]
