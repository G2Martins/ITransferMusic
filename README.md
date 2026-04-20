<div align="center">

# ITransferMusic

### Plataforma de Transferência e Geração de Playlists entre Serviços de Streaming

<br>

<p>
  <img src="https://img.shields.io/badge/Frontend-Angular_19-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Styling-Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/i18n-Transloco-8B5CF6?style=for-the-badge&logo=angular&logoColor=white" alt="Transloco">
  <br><br>
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Auth-JWT_+_OAuth2-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT + OAuth2">
</p>

</div>

---

## Sobre o Projeto

O **ITransferMusic** é uma plataforma web que permite ao usuário transferir, gerar e sincronizar playlists entre os principais serviços de streaming de música do mercado. Em vez de reconstruir manualmente suas bibliotecas ao migrar de provedor, o usuário vincula suas contas via OAuth2 e delega à aplicação o trabalho de ler a playlist de origem, encontrar correspondências no destino e criar a nova playlist preservando o conteúdo original.

Além da transferência simples, a plataforma oferece um gerador de playlists baseado em humor, gênero e descrição livre, sincronizações periódicas que mantêm playlists espelhadas entre provedores, páginas públicas de compartilhamento e um sistema de avaliações.

### Objetivos

- Eliminar o atrito da migração entre serviços de streaming.
- Centralizar o gerenciamento de playlists multi-provedor em uma única interface.
- Oferecer recomendações musicais através de geração inteligente baseada em humor e gênero.
- Permitir sincronização periódica automática para quem mantém playlists em mais de um provedor.

---

## Arquitetura da Solução

O sistema é composto por duas aplicações independentes que se comunicam via API REST:

```
ITransferMusic/
├── BackEnd/     - API REST em Python/FastAPI com MongoDB e integrações OAuth
└── FrontEnd/    - SPA (Single Page Application) em Angular 19 com Tailwind CSS
```

**Fluxo de funcionamento:**

1. O usuário acessa o frontend Angular via navegador e autentica-se localmente (e-mail e senha, JWT).
2. No dashboard, vincula uma ou mais contas de provedores via OAuth2 (Spotify, YouTube, etc.).
3. Os tokens de provedor são criptografados com Fernet antes de persistidos no MongoDB.
4. Em uma transferência, o backend lê as faixas da playlist de origem, faz matching por busca no provedor de destino e cria a nova playlist assinada com a marca d'água ITransferMusic.
5. Sincronizações agendadas rodam em background via APScheduler.

---

## Funcionalidades

| Status | Funcionalidade |
|:---:|:---|
| OK | Autenticação local com JWT e refresh token |
| OK | Vinculação de contas via OAuth2 (Spotify, YouTube/Google) |
| OK | Listagem de playlists, álbuns e artistas salvos por provedor |
| OK | Transferência de playlists entre provedores com matching por busca |
| OK | Gerador de playlists por humor, gênero e prompt livre |
| OK | Sincronização periódica (diária/semanal/mensal) entre provedores |
| OK | Compartilhamento público de playlists via share token |
| OK | Sistema de avaliações (reviews) da plataforma |
| OK | Dashboard com histórico e status das transferências |
| OK | Interface multi-idioma (Português do Brasil e Inglês) |
| OK | Tema claro e escuro |
| Parcial | Apple Music (stub aguardando MusicKit JS e Developer Token) |
| Parcial | Amazon Music (stub, API restrita) |
| Fora de escopo | Deezer |

---

## Provedores Suportados

| Provedor | OAuth | Leitura | Escrita | Observação |
|:---|:---:|:---:|:---:|:---|
| **Spotify** | Sim | Sim | Sim | Dev Mode: usuário precisa estar em Users and Access |
| **YouTube / YouTube Music** | Sim | Sim | Sim | Requer canal YouTube ativo na conta Google |
| **Apple Music** | Pendente | Pendente | Pendente | MusicKit JS + Apple Developer Token |
| **Amazon Music** | Pendente | Pendente | Pendente | API restrita a parceiros |

---

## Módulos do Projeto

### Backend - API REST (FastAPI + MongoDB)

Instruções de instalação, configuração de OAuth, estrutura e endpoints da API:
[Documentação do Backend](./BackEnd/README.md)

### Frontend - Interface Web (Angular 19 + Tailwind)

Instruções de instalação, execução, rotas e convenções de desenvolvimento:
[Documentação do Frontend](./FrontEnd/README.md)

---

## Início Rápido

### Pré-requisitos

- Python 3.11+ e pip
- Node.js 20+ e npm
- Instância MongoDB (local ou Atlas)
- Credenciais OAuth (ao menos Spotify ou Google) para testar as integrações

### 1. Iniciar o Backend

```bash
cd BackEnd
python -m venv .venv
source .venv/Scripts/activate       # Windows (Git Bash)
# source .venv/bin/activate          # Linux / macOS
pip install -r requirements.txt
cp .env.example .env                 # Preencher JWT, Fernet e credenciais OAuth
uvicorn src.main:app --reload
```

API disponível em `http://localhost:8000` | Swagger em `http://localhost:8000/docs`

### 2. Iniciar o Frontend

```bash
cd FrontEnd
npm install
npm start
```

Aplicação disponível em `http://localhost:4200`

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|:---|:---|:---|
| Framework Frontend | Angular (standalone components) | 19+ |
| Estilização | Tailwind CSS | 3.4+ |
| Ícones | Iconify (Phosphor Icons) | - |
| Internacionalização | Transloco | 7.5+ |
| Framework Backend | FastAPI | 0.115+ |
| Servidor ASGI | Uvicorn | 0.30+ |
| Banco de Dados | MongoDB | 4.4+ |
| Driver Async BD | Motor | 3.6+ |
| Validação de Dados | Pydantic | 2.8+ |
| Autenticação Local | JWT (python-jose) | 3.3+ |
| Hash de Senha | bcrypt | 4.2+ |
| Criptografia de Tokens OAuth | Fernet (cryptography) | 43+ |
| Agendador de Tarefas | APScheduler | 3.10+ |
| Cliente HTTP Assíncrono | httpx | 0.27+ |

---

## Segurança

- **Senhas**: hash com bcrypt, salt por senha.
- **Sessão**: JWT de acesso curto + refresh token para renovação.
- **Tokens de provedor**: armazenados criptografados com Fernet. A chave de criptografia é separada do segredo JWT e nunca sai do backend.
- **CORS**: configurado por variável de ambiente, restrito ao domínio do frontend.
- **Escopos OAuth**: mínimos necessários para leitura e escrita de playlists no provedor.

---

<div align="center">
  <br>
  &copy; 2026 ITransferMusic. Todos os direitos reservados.
  <br><br>
  Desenvolvido por <strong>Gustavo Martins Gripaldi</strong>
</div>
