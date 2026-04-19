# ITransferMusic - Backend

API assincrona em FastAPI para transferencia de playlists entre servicos de streaming
(Spotify, YouTube, Apple Music, Amazon Music). Deezer fora de escopo inicial.

## Pre-requisitos

- Python 3.11+
- MongoDB acessivel (local ou MongoDB Atlas)

## Como ligar o backend

```bash
# 1. Entrar na pasta
cd backend

# 2. Criar e ativar ambiente virtual
python -m venv .venv
# Windows (Git Bash):
source .venv/Scripts/activate
# Linux/macOS:
source .venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Criar arquivo .env a partir do template
cp .env.example .env

# 5. Gerar os dois segredos obrigatorios e colar no .env
python -c "import secrets; print(secrets.token_urlsafe(64))"
#   -> JWT_SECRET_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
#   -> PROVIDER_TOKEN_ENCRYPTION_KEY

# 6. Subir o MongoDB (ver secao abaixo) e ajustar MONGODB_URI no .env

# 7. Rodar o servidor
uvicorn src.main:app --reload
```

Apos subir:
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Healthcheck: http://localhost:8000/api/v1/health

## MongoDB

Escolha **uma** das opcoes:

### Opcao A - MongoDB Atlas (cloud, recomendado, sem instalar nada)

1. Cria conta gratuita em https://www.mongodb.com/cloud/atlas
2. Cria um cluster free tier (M0)
3. Em "Database Access" cria um usuario
4. Em "Network Access" libera o seu IP (ou 0.0.0.0/0 para desenvolvimento)
5. Clica em "Connect" > "Drivers" e copia a connection string
6. Cola no `.env`:
   ```
   MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=itransfermusic
   ```

### Opcao B - MongoDB local no Windows

1. Baixa o MongoDB Community Server em https://www.mongodb.com/try/download/community
2. Instala marcando "Install MongoDB as a Service"
3. O servico `MongoDB` inicia automaticamente na porta 27017
4. Mantem o default no `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```

Para verificar se esta ativo:
```bash
# Git Bash
sc query MongoDB
# ou
netstat -ano | findstr :27017
```

## Endpoints principais (v1)

| Metodo  | Rota                                     | Descricao                              |
| ------- | ---------------------------------------- | -------------------------------------- |
| GET     | `/api/v1/health`                         | Healthcheck                            |
| POST    | `/api/v1/auth/register`                  | Cria usuario e retorna JWT             |
| POST    | `/api/v1/auth/login`                     | Login, retorna JWT                     |
| POST    | `/api/v1/auth/refresh`                   | Renova access token                    |
| GET     | `/api/v1/auth/oauth/{provider}/authorize`| URL de consentimento do provedor       |
| POST    | `/api/v1/auth/oauth/{provider}/callback` | Troca `code` por tokens e vincula      |
| GET     | `/api/v1/accounts`                       | Lista contas vinculadas                |
| DELETE  | `/api/v1/accounts/{provider}`            | Desvincula conta                       |
| GET     | `/api/v1/playlists/{provider}`           | Playlists do usuario no provedor       |
| GET     | `/api/v1/playlists/{provider}/{id}/tracks` | Faixas de uma playlist               |
| POST    | `/api/v1/transfers`                      | Cria transferencia (roda em background)|
| GET     | `/api/v1/transfers`                      | Historico de transferencias            |
| GET     | `/api/v1/transfers/{id}`                 | Detalhe / status de uma transferencia  |

## Estado das integracoes

| Provedor      | Status                                         |
| ------------- | ---------------------------------------------- |
| Spotify       | OAuth + transferencia implementados            |
| YouTube       | OAuth + transferencia implementados            |
| Apple Music   | Stub (MusicKit JS + Developer Token pendentes) |
| Amazon Music  | Stub (API restrita)                            |
| Deezer        | Fora de escopo                                 |

## Estrutura de diretorios

```
src/
├── api/v1/routes/     # Controllers HTTP (auth, accounts, playlists, transfers, health)
├── core/              # Config, DB, seguranca (JWT, Fernet)
├── integrations/      # Clients httpx de APIs externas
│   └── oauth/         # Authorization Code flow (Spotify, Google)
├── models/            # Documentos MongoDB (Pydantic v2)
├── schemas/           # DTOs de request/response
├── services/          # Regras de negocio
├── dependencies.py    # Injecoes (CurrentUserId, DbDep, etc.)
└── main.py            # App factory + lifespan
```
