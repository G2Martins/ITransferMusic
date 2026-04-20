"""Gerador de playlists baseado em humor/generos/prompt.

Estrategia: monta queries de busca combinando generos + humores + prompt e
usa o search_track do provedor origem para retornar faixas reais com capas.
Deduplica por id.
"""

from __future__ import annotations

import random
from typing import Any

from src.integrations.base import ProviderAuth
from src.integrations.registry import get_provider_client
from src.models.common import Provider
from src.schemas.track import Track


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
    queries = _build_queries(prompt, genres, moods, count * 2)
    client = get_provider_client(source_provider)

    excluded = set(exclude_track_ids or [])
    seen_ids: set[str] = set(excluded)
    result: list[Track] = []
    used_queries: list[str] = []

    for q in queries:
        if len(result) >= count:
            break
        try:
            found = await client.search_track(q, auth)
        except Exception:  # noqa: BLE001
            continue
        if not found or found.id in seen_ids:
            continue
        seen_ids.add(found.id)
        result.append(found)
        used_queries.append(q)

    return result, used_queries
