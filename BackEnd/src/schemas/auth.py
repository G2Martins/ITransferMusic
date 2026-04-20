from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    # bcrypt suporta ate 72 bytes; limitamos no schema para falhar cedo com mensagem clara.
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class OAuthAuthorizeResponse(BaseModel):
    authorize_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    code: str = Field(min_length=1)
    state: str = Field(min_length=1)


class OAuthCallbackResponse(BaseModel):
    status: str
    provider: str
    provider_user_id: str | None = None
    provider_display_name: str | None = None


class MeResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    timezone_offset_minutes: int = -180


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    timezone_offset_minutes: int | None = Field(default=None, ge=-720, le=840)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=10, description="id_token do Google Identity Services")
