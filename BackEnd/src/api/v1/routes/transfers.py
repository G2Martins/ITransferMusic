from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from src.core.db import get_database
from src.dependencies import CurrentUserId, PlaylistTransferServiceDep
from src.models.transfer import TransferDocument
from src.schemas.transfer import PlaylistTransferCreate, TransferResponse
from src.services.account_service import AccountService, LinkedAccountNotFoundError
from src.services.playlist_transfer_service import PlaylistTransferService

router = APIRouter()


def _to_response(doc: TransferDocument) -> TransferResponse:
    return TransferResponse(
        id=str(doc.id),
        source_provider=doc.source_provider,
        target_provider=doc.target_provider,
        source_playlist_id=doc.source_playlist_id,
        target_playlist_id=doc.target_playlist_id,
        target_playlist_name=doc.target_playlist_name,
        status=doc.status,
        total_tracks=doc.total_tracks,
        matched_tracks=doc.matched_tracks,
        results=doc.results,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


async def _execute_transfer_task(user_id: str, transfer_id: str) -> None:
    """Executado em background. Instancia o service a partir do DB global."""
    db = get_database()
    accounts = AccountService(db)
    service = PlaylistTransferService(db, accounts)
    await service.execute_transfer(user_id, transfer_id)


@router.post(
    "",
    response_model=TransferResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_transfer(
    payload: PlaylistTransferCreate,
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
    background_tasks: BackgroundTasks,
) -> TransferResponse:
    try:
        doc = await service.create_transfer(user_id, payload)
    except LinkedAccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    background_tasks.add_task(_execute_transfer_task, user_id, str(doc.id))
    return _to_response(doc)


@router.get("", response_model=list[TransferResponse])
async def list_transfers(
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
    limit: int = 20,
) -> list[TransferResponse]:
    docs = await service.list_transfers(user_id, limit=limit)
    return [_to_response(d) for d in docs]


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: str,
    user_id: CurrentUserId,
    service: PlaylistTransferServiceDep,
) -> TransferResponse:
    doc = await service.get_transfer(user_id, transfer_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transferencia nao encontrada"
        )
    return _to_response(doc)
