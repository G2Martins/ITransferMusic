# ITransferMusic — Backend

FastAPI + Motor (async MongoDB) service that transfers user playlists between music streaming providers.

## Supported providers

| Provider       | Status              | Docs |
|----------------|---------------------|------|
| Spotify        | Implemented         | https://developer.spotify.com/documentation/web-api |
| YouTube Music  | Implemented         | https://developers.google.com/youtube/v3 |
| Apple Music    | Implemented         | https://developer.apple.com/documentation/applemusicapi/ |
| Amazon Music   | Stub                | TBD |
| Deezer         | Stub (deprioritized) | TBD |

## Layout

```
src/
├── api/v1/routes/      HTTP routers (auth, accounts, playlists, transfers)
├── core/               config, db lifecycle, security, DI helpers
├── integrations/       async httpx clients per provider + registry
├── models/             Pydantic models for MongoDB documents
├── schemas/            Request/response DTOs
└── services/           Business logic (auth, accounts, playlist transfer)
```

## Setup

```bash
# Python 3.11+
python -m venv .venv
.venv/Scripts/activate            # Windows
# source .venv/bin/activate       # Unix

pip install -e ".[dev]"

cp .env.example .env
# Fill in TOKEN_ENCRYPTION_KEY, provider client IDs/secrets, Apple .p8 path, etc.

# Generate an encryption key:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Run

```bash
uvicorn src.main:app --reload --port 8000
```

OpenAPI docs at http://localhost:8000/docs

## MongoDB

Requires a local or remote MongoDB reachable at `MONGO_URI`. No Docker orchestration is shipped with this backend; bring your own instance.
