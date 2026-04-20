import httpx
from fastapi import APIRouter, HTTPException, status

from src.core.security import create_oauth_state_token, decode_oauth_state_token
from src.dependencies import AccountServiceDep, AuthServiceDep, CurrentUserId
from src.integrations.oauth.registry import get_oauth_provider, is_oauth_supported
from src.models.common import Provider
from src.schemas.auth import (
    ChangePasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    MeResponse,
    OAuthAuthorizeResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, service: AuthServiceDep) -> TokenResponse:
    try:
        return await service.register(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/google/login", response_model=TokenResponse)
async def google_login(
    payload: GoogleLoginRequest, service: AuthServiceDep
) -> TokenResponse:
    try:
        return await service.google_login(payload.credential)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, service: AuthServiceDep) -> TokenResponse:
    try:
        return await service.login(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, service: AuthServiceDep) -> TokenResponse:
    try:
        return await service.refresh(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc


@router.get("/me", response_model=MeResponse)
async def get_me(
    user_id: CurrentUserId,
    service: AuthServiceDep,
) -> MeResponse:
    try:
        return await service.get_me(user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.patch("/me", response_model=MeResponse)
async def update_me(
    payload: UpdateProfileRequest,
    user_id: CurrentUserId,
    service: AuthServiceDep,
) -> MeResponse:
    return await service.update_profile(user_id, payload.name)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    user_id: CurrentUserId,
    service: AuthServiceDep,
) -> None:
    try:
        await service.change_password(
            user_id, payload.current_password, payload.new_password
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get(
    "/oauth/{provider}/authorize",
    response_model=OAuthAuthorizeResponse,
)
async def oauth_authorize(
    provider: Provider,
    user_id: CurrentUserId,
) -> OAuthAuthorizeResponse:
    if not is_oauth_supported(provider):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"OAuth code-flow nao suportado para '{provider.value}'. "
                "Apple Music usa MusicKit JS; Amazon Music e restrito."
            ),
        )
    try:
        oauth = get_oauth_provider(provider)
        state = create_oauth_state_token(user_id, provider.value)
        url = oauth.build_authorize_url(state)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    return OAuthAuthorizeResponse(authorize_url=url, state=state)


@router.post(
    "/oauth/{provider}/callback",
    response_model=OAuthCallbackResponse,
)
async def oauth_callback(
    provider: Provider,
    payload: OAuthCallbackRequest,
    accounts: AccountServiceDep,
) -> OAuthCallbackResponse:
    if not is_oauth_supported(provider):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provedor '{provider.value}' nao suporta code-flow",
        )

    try:
        state_payload = decode_oauth_state_token(payload.state)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"state invalido: {exc}",
        ) from exc

    if state_payload.get("provider") != provider.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="state nao corresponde ao provedor informado na URL",
        )

    user_id = state_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="state sem subject"
        )

    try:
        oauth = get_oauth_provider(provider)
        tokens = await oauth.exchange_code(payload.code)
        user_info = await oauth.fetch_user_info(tokens.access_token)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha na troca de code: {exc}",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    await accounts.upsert(
        user_id=user_id,
        provider=provider,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        provider_user_id=user_info.get("provider_user_id"),
        provider_display_name=user_info.get("display_name"),
        expires_at=tokens.expires_at,
        scope=tokens.scope,
    )
    return OAuthCallbackResponse(
        status="linked",
        provider=provider.value,
        provider_user_id=user_info.get("provider_user_id"),
        provider_display_name=user_info.get("display_name"),
    )
