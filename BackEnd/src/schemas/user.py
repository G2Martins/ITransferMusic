from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime
