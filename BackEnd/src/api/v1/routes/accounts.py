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


@router.get("", response_model=list[LinkedAccountView])
async def list_accounts(
    user_id: CurrentUserId,
    service: AccountServiceDep,
) -> list[LinkedAccountView]:
    return [LinkedAccountView(**doc) for doc in await service.list_for_user(user_id)]


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_account(
    provider: Provider,
    user_id: CurrentUserId,
    service: AccountServiceDep,
) -> None:
    await service.unlink(user_id, provider)
