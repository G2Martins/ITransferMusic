"""Rotas de compartilhamento publico de playlists transferidas.

- `POST /transfers/{id}/share` (autenticada) gera/retorna o share_token
- `GET /shares/{token}` publico — devolve dados da playlist + tracks
- `PATCH /shares/{token}` autenticada para o dono editar nome/descricao

Implementadas num unico router montado em /shares.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from src.core.db import get_database
from src.dependencies import CurrentUserId, PlaylistTransferServiceDep
from src.schemas.share import (
    SharePublicResponse,
    ShareTokenResponse,
    ShareUpdateRequest,
)

router = APIRouter()


@router.get("/{token}", response_model=SharePublicResponse)
async def get_share(
    token: str,
    service: PlaylistTransferServiceDep,
) -> SharePublicResponse:
    doc = await service.get_by_share_token(token)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share nao encontrado"
        )
    # Busca nome do dono na colecao de users
    db = get_database()
    owner_doc = await db["users"].find_one({"_id": ObjectId(str(doc.user_id))})
    owner_name = (owner_doc or {}).get("name", "Usuario ITransferMusic")
    return SharePublicResponse(
        token=token,
        owner_name=owner_name,
        owner_id=str(doc.user_id),
        playlist_name=doc.target_playlist_name,
        playlist_description=doc.target_playlist_description,
        playlist_image_url=doc.source_playlist_image_url,
        source_provider=doc.source_provider,
        source_playlist_id=doc.source_playlist_id,
        target_provider=doc.target_provider,
        target_playlist_id=doc.target_playlist_id,
        total_tracks=doc.total_tracks,
        matched_tracks=doc.matched_tracks,
        tracks=doc.results,
    )


@router.patch("/{token}", response_model=SharePublicResponse)
async def update_share(
    token: str,
    payload: ShareUpdateRequest,
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
) -> SharePublicResponse:
    # Busca a transfer por token e checa se o user e o dono.
    doc = await service.get_by_share_token(token)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share nao encontrado"
        )
    if str(doc.user_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o dono pode editar este share",
        )
    updated = await service.update_share_metadata(
        user_id=user_id,
        transfer_id=str(doc.id),
        name=payload.playlist_name,
        description=payload.playlist_description,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transfer nao encontrado"
        )
    # Reutiliza o endpoint de leitura
    return await get_share(token, service)


# Endpoint para o dono gerar o link (montado no router de /transfers no main)
share_creation_router = APIRouter()


@share_creation_router.post(
    "/{transfer_id}/share",
    response_model=ShareTokenResponse,
)
async def create_share(
    transfer_id: str,
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
) -> ShareTokenResponse:
    token = await service.ensure_share_token(user_id, transfer_id)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transferencia nao encontrada",
        )
    # Montado relativamente — o frontend compoe a URL completa quando precisa.
    return ShareTokenResponse(token=token, share_url=f"/share/{token}")
