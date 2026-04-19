# ITransferMusic - Frontend

SPA em Angular 19 (standalone components) com Tailwind CSS, Iconify (Phosphor Icons)
e i18n via Transloco (pt-BR / en).

## Pre-requisitos

- Node.js 20+
- Backend rodando em `http://localhost:8000` (ver `backend/README.md`)

## Como ligar o frontend

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Rodar em modo dev
npm start
# ou
npx ng serve
```

App disponivel em: http://localhost:4200

## Configuracao

API base URL fica em [src/environments/environment.ts](src/environments/environment.ts).
Padrao: `http://localhost:8000/api/v1`.

## Estrutura

```
src/app/
├── core/
│   ├── guards/          # authGuard
│   ├── interceptors/    # authInterceptor, errorInterceptor
│   ├── i18n/            # Transloco loader
│   └── services/        # AuthService, ApiService
├── layout/
│   ├── menu-bar/        # Logo -> home, dropdown Features, seletor de idioma
│   └── footer/
├── pages/
│   ├── home/            # Hero + cards clicaveis
│   ├── feature/         # Rota /feature/:slug (compartilhada via @Input)
│   ├── help/            # FAQ
│   ├── contact/         # Formulario simples
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── oauth-callback/  # Captura code/state e vincula no backend
│   └── dashboard/       # Wizard de transferencia (guard protegido)
├── shared/
│   ├── feature-card/    # Card clicavel, ícone Phosphor, textos via @Input
│   └── features.data.ts # Fonte unica das features (usada no home + dropdown)
├── app.component.ts     # Shell (menubar + outlet + footer)
├── app.config.ts        # Providers (router, http, transloco, animations)
└── app.routes.ts        # Rotas lazy-loaded
```

## Rotas

| Rota                           | Descricao                                      |
| ------------------------------ | ---------------------------------------------- |
| `/`                            | Home com cards de funcionalidades              |
| `/feature/:slug`               | Detalhe da funcionalidade (transferir, etc.)   |
| `/help`                        | FAQ / central de ajuda                         |
| `/contact`                     | Formulario de contato                          |
| `/auth/login`                  | Login (cria JWT no backend)                    |
| `/auth/register`               | Registro                                       |
| `/auth/callback/:provider`     | Retorno do OAuth (Spotify/Google)              |
| `/dashboard`                   | Painel com wizard (protegido por `authGuard`)  |

## Icones (Phosphor via Iconify)

Iconify e carregado via `<script>` em `index.html` e usado como custom element:

```html
<iconify-icon icon="ph:music-notes-plus-duotone" class="text-3xl"></iconify-icon>
```

Componentes que usam `<iconify-icon>` declaram `schemas: [CUSTOM_ELEMENTS_SCHEMA]`.

## i18n

- Arquivos: [src/assets/i18n/pt-BR.json](src/assets/i18n/pt-BR.json) e
  [src/assets/i18n/en.json](src/assets/i18n/en.json)
- Troca de idioma: menu-bar (bandeirinha)

## OAuth - atencao ao redirect URI

Para o fluxo OAuth funcionar, o `redirect_uri` do backend (`.env`) precisa bater
com o que esta cadastrado no dashboard do provedor E apontar para este frontend:

- Spotify: `http://localhost:4200/auth/callback/spotify`
  (use `http`, nao `https` - Angular dev server e HTTP por padrao)
- Google/YouTube: `http://localhost:4200/auth/callback/google`

Cadastre o mesmo valor em:
- Spotify: https://developer.spotify.com/dashboard > app > Edit Settings > Redirect URIs
- Google: https://console.cloud.google.com/apis/credentials > OAuth client > Authorized redirect URIs
