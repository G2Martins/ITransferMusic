from datetime import datetime

from fastapi import APIRouter, status
from pydantic import BaseModel

from src.dependencies import AccountServiceDep, CurrentUserId
from src.models.common import Provider

router = APIRouter()


class LinkedAccountView(BaseModel):
    provider: Provider
    provider_user_id: str | None = None
    provider_display_name: str | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LinkAccountRequest(BaseModel):
    """Payload temporario enquanto o OAuth code-flow nao esta completo.

    Quando o flow OAuth estiver pronto, este endpoint sera substituido por
    `/auth/oauth/{provider}/callback` que recebe apenas o `code`.
    """

    provider: Provider
    access_token: str
    refresh_token: str | None = None
    provider_user_id: str | None = None
    provider_display_name: str | None = None
    expires_at: datetime | None = None
    scope: str | None = None


@router.get("", response_model=list[LinkedAccountView])
async def list_accounts(
    user_id: CurrentUserId,
    service: AccountServiceDep,
) -> list[LinkedAccountView]:
    return [LinkedAccountView(**doc) for doc in await service.list_for_user(user_id)]


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def link_account(
    payload: LinkAccountRequest,
    user_id: CurrentUserId,
    service: AccountServiceDep,
) -> None:
    await service.upsert(
        user_id=user_id,
        provider=payload.provider,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        provider_user_id=payload.provider_user_id,
        provider_display_name=payload.provider_display_name,
        expires_at=payload.expires_at,
        scope=payload.scope,
    )


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_account(
    provider: Provider,
    user_id: CurrentUserId,
    service: AccountServiceDep,
) -> None:
    await service.unlink(user_id, provider)
