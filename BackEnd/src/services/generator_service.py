"""Gerador de playlists baseado em humor/generos/prompt.

Estrategia: monta queries de busca combinando generos + humores + prompt e
usa o search_track do provedor origem para retornar faixas reais com capas.
Deduplica por id.
"""

from __future__ import annotations

import logging
import random
from typing import Any

import httpx

from src.integrations.base import ProviderAuth
from src.integrations.registry import get_provider_client
from src.models.common import Provider
from src.schemas.track import Track

logger = logging.getLogger(__name__)


class GeneratorAuthError(Exception):
    """O provedor rejeitou o token (401). Pede re-vinculacao."""


_MOOD_KEYWORDS = {
    "happy": ["happy", "feel good", "upbeat"],
    "sad": ["sad", "melancholy", "heartbreak"],
    "angry": ["angry", "aggressive", "rage"],
    "relaxed": ["relaxing", "chill", "calm"],
    "energetic": ["energetic", "workout", "hype"],
    "romantic": ["romantic", "love", "slow dance"],
}


def _build_queries(
    prompt: str | None,
    genres: list[str],
    moods: list[str],
    count: int,
) -> list[str]:
    """Combina termos em queries de busca. Deduplica e limita ao `count`."""
    queries: list[str] = []
    prompt = (prompt or "").strip()

    genres_norm = [g.strip().lower() for g in genres if g.strip()]
    moods_norm = [m.strip().lower() for m in moods if m.strip()]

    # Queries cruzadas
    for g in genres_norm or [""]:
        for m in moods_norm or [""]:
            parts = [p for p in [prompt, g, _mood_term(m)] if p]
            if parts:
                queries.append(" ".join(parts))

    # Queries isoladas como fallback
    if prompt:
        queries.append(prompt)
    for g in genres_norm:
        queries.append(g)
    for m in moods_norm:
        queries.append(_mood_term(m))

    # Remove duplicatas preservando ordem
    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        key = q.lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(q)

    if not unique:
        unique = ["top hits"]

    # Multiplica para ter queries suficientes (1 track por query)
    random.shuffle(unique)
    while len(unique) < count:
        unique.extend(unique[: count - len(unique)])
    return unique[:count]


def _mood_term(mood: str) -> str:
    if not mood:
        return ""
    bag = _MOOD_KEYWORDS.get(mood, [mood])
    return random.choice(bag)


async def generate_tracks(
    *,
    source_provider: Provider,
    auth: ProviderAuth,
    prompt: str | None,
    genres: list[str],
    moods: list[str],
    count: int,
    exclude_track_ids: list[str],
) -> tuple[list[Track], list[str]]:
    queries = _build_queries(prompt, genres, moods, count)
    client = get_provider_client(source_provider)

    excluded = set(exclude_track_ids or [])
    seen_ids: set[str] = set(excluded)
    result: list[Track] = []
    used_queries: list[str] = []

    unique_queries = list(dict.fromkeys(q.lower() for q in queries))
    unique_query_count = len(unique_queries) or 1
    # Em Dev Mode o Spotify /search rejeita limit > 10; manter defensivo.
    per_query_limit = max(5, min(10, (count * 2) // unique_query_count))

    # Se o usuario ja tem faixas (segundo clique em "Gerar"), comecamos com
    # offset aleatorio para trazer novidades. Se e a primeira geracao, offset=0
    # garante os resultados top.
    first_pass_offset = random.randint(5, 40) if excluded else 0

    # Flag de rate-limit: assim que o provedor sinaliza 429, abortamos as
    # tentativas seguintes (continuar so agrava o throttling).
    rate_limited = False

    async def _pass(offset: int) -> None:
        nonlocal result, rate_limited
        for q in queries:
            if len(result) >= count or rate_limited:
                return
            try:
                found_list = await client.search_tracks(
                    q, auth, limit=per_query_limit, offset=offset
                )
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code == 401:
                    raise GeneratorAuthError(
                        f"Token do {source_provider} foi rejeitado (401). "
                        "Revincule a conta em Configuracoes."
                    ) from exc
                if status_code == 429:
                    retry_after = exc.response.headers.get("Retry-After")
                    logger.warning(
                        "generator search_tracks rate limited (429): provider=%s "
                        "query=%r offset=%s retry_after=%s. Abortando retries.",
                        source_provider,
                        q,
                        offset,
                        retry_after,
                    )
                    rate_limited = True
                    return
                logger.warning(
                    "generator search_tracks HTTP %s: provider=%s query=%r offset=%s",
                    status_code,
                    source_provider,
                    q,
                    offset,
                )
                continue
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "generator search_tracks falhou: provider=%s query=%r offset=%s err=%s",
                    source_provider,
                    q,
                    offset,
                    exc,
                )
                continue
            added = False
            for found in found_list:
                if len(result) >= count:
                    return
                if not found or found.id in seen_ids:
                    continue
                seen_ids.add(found.id)
                result.append(found)
                added = True
            if added and q not in used_queries:
                used_queries.append(q)

    await _pass(first_pass_offset)

    # Fallback progressivo com offsets variados ate alcancar `count`.
    for extra_offset in (0, 20, 50, 80):
        if len(result) >= count or rate_limited:
            break
        if extra_offset == first_pass_offset:
            continue
        await _pass(extra_offset)

    return result, used_queries
