# ITransferMusic - Backend (FastAPI)

API assincrona para transferencia e sincronizacao de playlists entre servicos de streaming (Spotify, YouTube Music, Apple Music, Amazon Music e, futuramente, Deezer).

## Stack

- Python 3.11+
- FastAPI + Uvicorn
- Motor (driver assincrono do MongoDB)
- Pydantic v2 + pydantic-settings
- httpx (cliente HTTP assincrono)
- python-jose (JWT) + passlib[bcrypt]

## Estrutura de diretorios

```
src/
├── api/v1/routes/     # Controllers HTTP (auth, accounts, playlists, transfers)
├── core/              # Config, DB, seguranca (JWT, cifra de tokens)
├── integrations/      # Clientes httpx para APIs externas
├── models/            # Documentos Mongo (Pydantic)
├── schemas/           # DTOs de entrada/saida
├── services/          # Regras de negocio
├── dependencies.py    # Injecoes compartilhadas (get_current_user, etc.)
└── main.py            # App factory + ciclo de vida
```

## Setup local

```bash
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (Git Bash)
source .venv/Scripts/activate

pip install -e ".[dev]"

cp .env.example .env
# edite .env preenchendo as credenciais

uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Docs interativas:
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Estado das integracoes

| Provedor      | Status             |
| ------------- | ------------------ |
| Spotify       | Implementado (MVP) |
| YouTube       | Implementado (MVP) |
| Apple Music   | Stub               |
| Amazon Music  | Stub               |
| Deezer        | Fora de escopo     |
