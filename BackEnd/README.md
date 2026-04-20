<div align="center">

# ITransferMusic - Backend API

### API REST para a Plataforma de Transferência e Geração de Playlists ITransferMusic

<br>

<p>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/MongoDB-4.4+-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <br><br>
  <img src="https://img.shields.io/badge/Auth-JWT_+_OAuth2-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT + OAuth2">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Docs-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Scheduler-APScheduler-F7931E?style=for-the-badge&logo=python&logoColor=white" alt="APScheduler">
</p>

</div>

---

## Sobre

API REST assíncrona da plataforma ITransferMusic, responsável pela autenticação local, pelo fluxo OAuth2 com provedores de streaming, pela persistência criptografada de tokens de terceiros e pela orquestração de transferências, sincronizações e geração de playlists. Construída em FastAPI e MongoDB em arquitetura modular em camadas, com operações assíncronas em todo o stack via Motor e httpx.

---

## Stack Tecnológico

| Componente | Tecnologia | Versão |
|:---|:---|:---|
| Linguagem | Python | 3.11+ |
| Framework Web | FastAPI | 0.115+ |
| Servidor ASGI | Uvicorn | 0.30+ |
| Driver Async BD | Motor | 3.6+ |
| Validação | Pydantic | 2.8+ |
| Configuração | pydantic-settings | 2.4+ |
| Autenticação Local | python-jose (JWT) | 3.3+ |
| Hash de Senha | bcrypt | 4.2+ |
| Criptografia de Tokens | Fernet (cryptography) | 43+ |
| Cliente HTTP | httpx | 0.27+ |
| Scheduler | APScheduler | 3.10+ |
| Banco de Dados | MongoDB | 4.4+ |

---

## Instalação e Configuração

### 1. Pré-requisitos

- Python 3.11+ instalado e disponível no PATH
- MongoDB 4.4+ (local ou Atlas Cloud)
- pip (gerenciador de pacotes Python)
- Credenciais OAuth de ao menos um provedor (Spotify, Google) para testar integrações

### 2. Ambiente Virtual

**Windows (Git Bash):**
```bash
cd BackEnd
python -m venv .venv
source .venv/Scripts/activate
```

**Linux / macOS:**
```bash
cd BackEnd
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Dependências

```bash
pip install -r requirements.txt
```

### 4. Variáveis de Ambiente

Crie um arquivo `.env` na raiz de `BackEnd/` com base no `.env.example`:

```env
# App
APP_NAME="ITransferMusic API"
API_V1_PREFIX="/api/v1"
BACKEND_CORS_ORIGINS=["http://localhost:4200"]

# MongoDB
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB_NAME="itransfermusic"

# JWT local
JWT_SECRET_KEY="gere_uma_chave_segura_com_64_caracteres"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Criptografia de tokens OAuth (obrigatório)
PROVIDER_TOKEN_ENCRYPTION_KEY="chave_fernet_base64_url_safe"

# OAuth - Spotify
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
SPOTIFY_REDIRECT_URI="http://localhost:4200/auth/callback/spotify"

# OAuth - Google / YouTube
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:4200/auth/callback/google"
```

**Gerando os segredos obrigatórios:**

```bash
# JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"

# PROVIDER_TOKEN_ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> **Importante:** nunca versione o arquivo `.env`. Ele já está no `.gitignore`.

### 5. MongoDB

Escolha **uma** das opções:

**Opção A - MongoDB Atlas (cloud, recomendado):**

1. Crie uma conta gratuita em https://www.mongodb.com/cloud/atlas
2. Crie um cluster free tier (M0)
3. Em **Database Access** crie um usuário
4. Em **Network Access** libere seu IP (ou `0.0.0.0/0` em desenvolvimento)
5. Copie a connection string em **Connect > Drivers** e cole em `MONGODB_URI`

**Opção B - MongoDB local:**

1. Instale o MongoDB Community Server (https://www.mongodb.com/try/download/community)
2. No Windows, marque a opção **Install MongoDB as a Service** no instalador
3. Mantenha o padrão `MONGODB_URI=mongodb://localhost:27017`

### 6. Iniciar o Servidor

```bash
uvicorn src.main:app --reload
```

| Recurso | URL |
|:---|:---|
| **API Base** | `http://localhost:8000/api/v1` |
| **Swagger UI** | `http://localhost:8000/docs` |
| **ReDoc** | `http://localhost:8000/redoc` |
| **Healthcheck** | `http://localhost:8000/api/v1/health` |

---

## Arquitetura de Pastas

```
BackEnd/
│
├── src/                          # Código-fonte principal
│   │
│   ├── main.py                   # Entry point: cria FastAPI, registra routers, lifespan e CORS
│   ├── dependencies.py           # Injeções FastAPI (CurrentUserId, DbDep, Services)
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py         # Agrega todos os routers de domínio sob /api/v1
│   │       └── routes/           # Endpoints organizados por domínio de negócio
│   │           ├── health.py     # Liveness probe para monitoramento
│   │           ├── auth.py       # Registro, login, refresh e callback OAuth
│   │           ├── accounts.py   # Listagem e desvinculação de contas de provedores
│   │           ├── playlists.py  # Listagem de playlists e faixas por provedor
│   │           ├── transfers.py  # Criação, consulta e liveness de transferências
│   │           ├── generator.py  # Geração e salvamento de playlists via humor/gênero/prompt
│   │           ├── syncs.py      # CRUD de sincronizações periódicas
│   │           ├── shares.py     # Compartilhamento público via token
│   │           └── reviews.py    # Avaliações da plataforma
│   │
│   ├── core/                     # Infraestrutura central compartilhada
│   │   ├── config.py             # Settings via pydantic-settings (lê .env)
│   │   ├── db.py                 # Conexão assíncrona com MongoDB via Motor
│   │   ├── security.py           # JWT, hash bcrypt e Fernet (encrypt/decrypt de tokens OAuth)
│   │   └── scheduler.py          # APScheduler para rodar sincronizações periódicas
│   │
│   ├── integrations/             # Clients HTTP de APIs externas
│   │   ├── base.py               # MusicProviderClient (interface abstrata) e ProviderAuth
│   │   ├── registry.py           # Fábrica que resolve Provider → Client
│   │   ├── spotify.py            # Cliente Spotify: playlists, busca, criação, matching
│   │   ├── youtube.py            # Cliente YouTube Data API v3
│   │   ├── apple_music.py        # Stub Apple Music (MusicKit pendente)
│   │   ├── amazon_music.py       # Stub Amazon Music (API restrita)
│   │   └── oauth/                # Fluxo OAuth2 Authorization Code
│   │       ├── base.py           # OAuthProvider (interface) e OAuthTokenResponse
│   │       ├── registry.py       # Fábrica que resolve Provider → OAuthProvider
│   │       ├── spotify.py        # Authorize URL, troca de code e refresh do Spotify
│   │       └── google.py         # Authorize URL, troca de code e refresh do Google
│   │
│   ├── models/                   # Documentos MongoDB (Pydantic v2)
│   │   ├── common.py             # Provider enum, PyObjectId
│   │   ├── user.py               # UserDocument (e-mail, password_hash)
│   │   ├── linked_account.py     # Conta de provedor vinculada (tokens criptografados, scope)
│   │   ├── transfer.py           # Transferência com status, tracks, matched e share_token
│   │   ├── sync.py               # Sincronização periódica (frequency, run_hour, next_run_at)
│   │   └── review.py             # Avaliação da plataforma
│   │
│   ├── schemas/                  # DTOs de request e response
│   │   ├── auth.py               # LoginRequest, RegisterRequest, TokenResponse
│   │   ├── user.py               # UserResponse
│   │   ├── playlist.py           # PlaylistSummary
│   │   ├── track.py              # Track (id, name, artist, album, image_url, provider)
│   │   ├── transfer.py           # PlaylistTransferCreate, TransferResponse
│   │   ├── sync.py               # SyncCreate, SyncUpdate, SyncResponse
│   │   ├── share.py              # ShareResponse, ShareEditPayload
│   │   ├── generator.py          # GeneratorRequest, GeneratorSaveRequest/Response
│   │   └── review.py             # ReviewCreate, ReviewResponse, ReviewStats
│   │
│   └── services/                 # Camada de lógica de negócio (desacoplada dos endpoints)
│       ├── auth_service.py       # Registro, login, verificação e emissão de tokens
│       ├── account_service.py    # Upsert de contas vinculadas, refresh automático de token
│       ├── playlist_transfer_service.py  # Orquestra transferências em background
│       ├── generator_service.py  # Monta queries e busca faixas no provedor de origem
│       ├── sync_service.py       # CRUD de sincronizações agendadas
│       ├── sync_runner.py        # Executor usado pelo APScheduler a cada tick
│       └── review_service.py     # CRUD e agregação de avaliações
│
├── .env.example                  # Template de variáveis de ambiente (sem credenciais reais)
├── pyproject.toml                # Configurações de build e linters
├── requirements.txt              # Dependências Python com versões mínimas
└── README.md                     # Este arquivo
```

---

## Modelo de Dados

O banco segue um modelo orientado a documentos com separação clara entre **dimensões** (referências) e **fatos** (eventos):

- **`users`** - usuários locais da plataforma (e-mail, senha hash).
- **`linked_accounts`** - contas de provedores vinculadas; guarda `access_token` e `refresh_token` criptografados com Fernet, além do `scope` concedido.
- **`transfers`** - cada transferência executada (status, contagens, resultados por faixa e `share_token` opcional).
- **`syncs`** - sincronizações periódicas configuradas (origem, destino, frequência, próxima execução).
- **`reviews`** - avaliações da plataforma com nota e comentário.

---

## Endpoints Principais

### Autenticação Local e OAuth

| Método | Rota | Descrição | Acesso |
|:---|:---|:---|:---|
| `POST` | `/api/v1/auth/register` | Cria usuário local e retorna JWT | Público |
| `POST` | `/api/v1/auth/login` | Login por e-mail e senha, retorna JWT | Público |
| `POST` | `/api/v1/auth/refresh` | Renova access token via refresh token | Público |
| `GET` | `/api/v1/auth/oauth/{provider}/authorize` | Gera URL de consentimento do provedor | Autenticado |
| `POST` | `/api/v1/auth/oauth/{provider}/callback` | Troca `code` por tokens e vincula conta | Autenticado |
| `GET` | `/api/v1/auth/me` | Retorna dados do usuário autenticado | Autenticado |

### Contas Vinculadas

| Método | Rota | Descrição |
|:---|:---|:---|
| `GET` | `/api/v1/accounts` | Lista contas de provedores vinculadas |
| `DELETE` | `/api/v1/accounts/{provider}` | Desvincula conta do provedor |

### Playlists e Transferências

| Método | Rota | Descrição |
|:---|:---|:---|
| `GET` | `/api/v1/playlists/{provider}` | Playlists do usuário no provedor |
| `GET` | `/api/v1/playlists/{provider}/{id}/tracks` | Faixas de uma playlist |
| `POST` | `/api/v1/transfers` | Cria transferência (executa em background) |
| `GET` | `/api/v1/transfers` | Histórico de transferências do usuário |
| `GET` | `/api/v1/transfers/{id}` | Detalhe e status de uma transferência |
| `GET` | `/api/v1/transfers/{id}/alive` | Verifica se a playlist destino ainda existe |

### Gerador de Playlists

| Método | Rota | Descrição |
|:---|:---|:---|
| `POST` | `/api/v1/generator/tracks` | Gera faixas a partir de humor, gênero e prompt |
| `POST` | `/api/v1/generator/save` | Salva a playlist gerada no provedor escolhido |

### Sincronizações, Compartilhamento e Avaliações

| Método | Rota | Descrição |
|:---|:---|:---|
| `POST` | `/api/v1/syncs` | Cria sincronização periódica |
| `GET` | `/api/v1/syncs` | Lista sincronizações do usuário |
| `PATCH` | `/api/v1/syncs/{id}` | Atualiza frequência ou pausa |
| `DELETE` | `/api/v1/syncs/{id}` | Remove sincronização |
| `POST` | `/api/v1/shares/{transfer_id}` | Gera share token público |
| `GET` | `/api/v1/shares/{token}` | Consulta pública da playlist compartilhada |
| `GET` | `/api/v1/reviews` | Lista avaliações públicas |
| `POST` | `/api/v1/reviews` | Cria ou atualiza avaliação do usuário |

---

## Autenticação e Segurança

### JWT Local

1. `POST /auth/login` retorna `access_token` (HS256) e `refresh_token`.
2. O cliente envia o access token em cada requisição: `Authorization: Bearer <token>`.
3. Quando expira, `POST /auth/refresh` emite novo par de tokens.

### OAuth2 Authorization Code (Provedores)

1. Frontend solicita URL de autorização em `GET /auth/oauth/{provider}/authorize`.
2. Usuário autoriza no provedor e é redirecionado para `/auth/callback/{provider}` no frontend.
3. Frontend envia o `code` para `POST /auth/oauth/{provider}/callback`.
4. Backend troca o `code` por `access_token` e `refresh_token`, criptografa com Fernet e persiste em `linked_accounts`.
5. O campo `scope` é armazenado para validação preventiva em operações de escrita.

### Criptografia de Tokens

Todos os tokens de provedor são criptografados com **Fernet** antes de persistir. A chave `PROVIDER_TOKEN_ENCRYPTION_KEY` é separada do segredo JWT, permitindo rotacionar uma sem invalidar a outra. Ao ler para uso, o token é descriptografado apenas na memória do processo.

### Refresh Automático

O `AccountService` faz refresh automático do access token quando próximo de expirar (margem de 60 segundos) e em resposta a 401 do provedor. Se o refresh falha, o cliente recebe erro orientando a revincular a conta.

---

## Scheduler (Sincronizações Periódicas)

O módulo `core/scheduler.py` inicializa um `AsyncIOScheduler` no lifespan da aplicação e dispara `sync_runner.run_due_syncs()` a cada minuto. O runner consulta sincronizações com `next_run_at <= now`, executa a transferência e reagenda conforme a frequência configurada (diária, semanal ou mensal).

---

## Documentação Interativa

Com o servidor em execução:

| Interface | URL |
|:---|:---|
| **Swagger UI** | `http://localhost:8000/docs` |
| **ReDoc** | `http://localhost:8000/redoc` |

Para testar endpoints autenticados no Swagger: clique em **Authorize**, cole o JWT retornado pelo login e confirme.

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|:---|:---|:---|
| `Failed to connect to MongoDB` | Connection string inválida ou IP não liberado | Verifique `MONGODB_URI` e o whitelist no Atlas |
| `401 Unauthorized` em rotas locais | Access token expirado ou ausente | Chame `/auth/refresh` ou reautentique |
| `401` em chamadas ao provedor | Token OAuth expirado ou revogado | Desvincule e revincule a conta pelo frontend |
| `403 Forbidden` ao criar playlist Spotify | Conta não está em Users and Access (Dev Mode) ou escopo ausente | Adicione em Dashboard > Users and Access e revincule |
| `HTTP 429` do Spotify | Rate limit atingido | Aguarde o tempo indicado em `Retry-After` |
| `quotaExceeded` do YouTube | Cota diária da YouTube Data API esgotada | Aguarde reset diário ou solicite aumento no Cloud Console |
| `422 Unprocessable Entity` | Payload fora do schema Pydantic | Consulte o Swagger para a estrutura esperada |
| `PROVIDER_TOKEN_ENCRYPTION_KEY` inválida | Chave regerada sem migrar dados | Use a mesma chave que criptografou os tokens ou force relink |

---

<div align="center">
  <br>
  &copy; 2026 ITransferMusic. Todos os direitos reservados.
  <br><br>
  Desenvolvido por <strong>Gustavo Martins Gripaldi</strong>
</div>
