<div align="center">

# ITransferMusic - Frontend

### Interface Web da Plataforma de Transferência e Geração de Playlists ITransferMusic

<br>

<p>
  <img src="https://img.shields.io/badge/Angular-19+-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind">
  <br><br>
  <img src="https://img.shields.io/badge/Iconify-Phosphor_Icons-1C78C0?style=for-the-badge&logo=iconify&logoColor=white" alt="Iconify">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/i18n-Transloco-8B5CF6?style=for-the-badge&logo=angular&logoColor=white" alt="Transloco">
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/RxJS-Signals-B7178C?style=for-the-badge&logo=reactivex&logoColor=white" alt="RxJS + Signals">
</p>

</div>

---

## Sobre

SPA (Single Page Application) construída em **Angular 19** com componentes **standalone**, **signals** para estado reativo e **Tailwind CSS** para estilização. Consome a API REST do backend ITransferMusic e oferece uma interface única para vincular contas de provedores de streaming, transferir playlists entre serviços, gerar novas playlists por humor e gênero, agendar sincronizações periódicas e compartilhar resultados publicamente.

A interface é totalmente internacionalizada em **Português do Brasil** e **Inglês**, possui tema **claro e escuro** com persistência de preferência do usuário, e utiliza **Phosphor Icons** via Iconify como linguagem visual.

---

## Stack Tecnológico

| Componente | Tecnologia | Versão |
|:---|:---|:---|
| Framework | Angular (standalone components) | 19+ |
| Linguagem | TypeScript | 5+ |
| Estilização | Tailwind CSS | 3.4+ |
| Ícones | Iconify (Phosphor Icons) | - |
| Formulários | Angular FormsModule + Reactive Forms | - |
| HTTP Client | Angular HttpClient + Interceptors | - |
| Roteamento | Angular Router (lazy loading) | - |
| Estado Reativo | Angular Signals | - |
| Internacionalização | Transloco | 7.5+ |
| Observables | RxJS | 7.8+ |

---

## Instalação e Execução

### 1. Pré-requisitos

- Node.js 20+ e npm instalados
- Backend ITransferMusic rodando em `http://localhost:8000` (ver [BackEnd/README.md](../BackEnd/README.md))

### 2. Instalar Dependências

```bash
cd FrontEnd
npm install
```

### 3. Iniciar em Desenvolvimento

```bash
npm start
# ou
npx ng serve
```

Aplicação disponível em **`http://localhost:4200`**.
O servidor recarrega automaticamente ao salvar qualquer arquivo fonte.

### 4. Build de Produção

```bash
npm run build
```

Artefatos otimizados gerados em `dist/`.

### 5. Watch (build contínuo)

```bash
npm run watch
```

---

## Configuração

A URL base da API fica em [src/environments/environment.ts](src/environments/environment.ts) e em `environment.development.ts`. Padrão de desenvolvimento:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
};
```

---

## Arquitetura de Pastas

```
src/
│
├── index.html                              # Ponto de entrada HTML (inclui <script> do Iconify)
├── main.ts                                 # Bootstrap Angular: registra providers e inicia o app
├── styles.scss                             # Estilos globais e diretivas Tailwind
│
├── environments/
│   ├── environment.ts                      # Configuração de produção (URL da API, flags)
│   └── environment.development.ts          # Configuração de desenvolvimento
│
├── assets/
│   └── i18n/
│       ├── pt-BR.json                      # Traduções em Português do Brasil
│       └── en.json                         # Traduções em Inglês
│
└── app/
    │
    ├── app.component.ts                    # Shell: menubar + <router-outlet> + footer
    ├── app.config.ts                       # Providers globais (Router, HttpClient, Transloco)
    ├── app.routes.ts                       # Definição de rotas com lazy loading
    │
    ├── core/                               # Infraestrutura central - sem UI
    │   │
    │   ├── guards/
    │   │   └── auth.guard.ts               # Protege rotas: redireciona para /auth/login sem JWT
    │   │
    │   ├── interceptors/
    │   │   ├── auth.interceptor.ts         # Injeta Authorization: Bearer <token> nas requisições
    │   │   └── error.interceptor.ts        # Tratamento centralizado de erros HTTP
    │   │
    │   ├── i18n/
    │   │   └── transloco.loader.ts         # Loader HTTP dos arquivos de tradução
    │   │
    │   ├── services/                       # Serviços HTTP que consomem a API do backend
    │   │   ├── api.service.ts              # Fachada com todos os endpoints tipados
    │   │   ├── auth.service.ts             # Login, logout, refresh, decodificação JWT
    │   │   └── theme.service.ts            # Alternância claro/escuro com persistência
    │   │
    │   └── utils/
    │       ├── format-error.ts             # Normaliza mensagens de erro vindas do backend
    │       ├── playlist-url.ts             # Gera deep links para playlists por provedor
    │       └── timezone.ts                 # Helpers de fuso horário para sincronizações
    │
    ├── layout/                             # Componentes estruturais da aplicação
    │   ├── menu-bar/                       # Topo: logo, dropdown de features, tema, idioma, avatar
    │   └── footer/                         # Rodapé com links institucionais
    │
    ├── pages/                              # Páginas lazy-loaded da aplicação
    │   │
    │   ├── home/                           # Landing page com hero e cards de features
    │   ├── feature/                        # Detalhe de uma feature (/feature/:slug)
    │   ├── help/                           # Central de ajuda e FAQ
    │   ├── contact/                        # Formulário de contato
    │   ├── legal/                          # Termos de uso e política de privacidade
    │   │
    │   ├── auth/
    │   │   ├── login/                      # Login local (e-mail + senha, JWT)
    │   │   ├── register/                   # Registro de nova conta
    │   │   └── oauth-callback/             # Captura code/state e finaliza vínculo no backend
    │   │
    │   ├── dashboard/                      # Painel: contas vinculadas, histórico e ações rápidas
    │   │
    │   ├── transfer/
    │   │   └── new-transfer.component.ts   # Wizard de transferência (origem -> destino -> execução)
    │   │
    │   ├── generator/                      # Gerador por humor, gênero e prompt livre
    │   │
    │   ├── account/                        # Área da conta do usuário (layout com children)
    │   │   ├── profile/                    # Dados pessoais e troca de senha
    │   │   ├── syncs/                      # Listagem e gestão de sincronizações periódicas
    │   │   └── history/                    # Histórico detalhado de transferências
    │   │
    │   ├── share/                          # Página pública de playlist compartilhada via token
    │   └── reviews/                        # Avaliações da plataforma (leitura e envio)
    │
    └── shared/                             # Componentes e dados reutilizáveis entre páginas
        ├── feature-card/                   # Card clicável com ícone Phosphor e textos via @Input
        ├── sync-setup-modal/               # Modal de criação de sincronização periódica
        └── features.data.ts                # Fonte única das features (home + dropdown do menu)
```

---

## Roteamento

Todas as rotas de feature são **lazy-loaded** para reduzir o bundle inicial. O `authGuard` protege rotas internas redirecionando para `/auth/login` quando não há JWT válido.

| Rota | Componente | Acesso |
|:---|:---|:---|
| `/` | HomeComponent | Público |
| `/feature/:slug` | FeatureComponent | Público |
| `/help` | HelpComponent | Público |
| `/contact` | ContactComponent | Público |
| `/legal/*` | LegalComponent | Público |
| `/auth/login` | LoginComponent | Público |
| `/auth/register` | RegisterComponent | Público |
| `/auth/callback/:provider` | OAuthCallbackComponent | Público |
| `/dashboard` | DashboardComponent | Autenticado |
| `/transfer/new` | NewTransferComponent | Autenticado |
| `/generator` | GeneratorComponent | Autenticado |
| `/account/profile` | AccountProfileComponent | Autenticado |
| `/account/syncs` | AccountSyncsComponent | Autenticado |
| `/account/history` | AccountHistoryComponent | Autenticado |
| `/share/:token` | ShareComponent | Público |
| `/reviews` | ReviewsComponent | Público |

---

## Autenticação no Frontend

O `AuthService` decodifica o payload JWT localmente para leitura rápida de identidade sem round-trip ao backend:

```typescript
firstName()   // Primeiro nome do usuário (signal)
email()       // E-mail (signal)
isLoggedIn()  // Status de autenticação (signal)
hydrate()     // Revalida o token contra /auth/me ao montar o shell
login(...)    // POST /auth/login e persistência local
logout()      // Limpa storage e navega para /
```

O `AuthInterceptor` adiciona automaticamente `Authorization: Bearer <token>` em toda requisição HTTP destinada à API, exceto para as rotas públicas de login e registro. O `ErrorInterceptor` captura 401 e dispara revalidação ou logout conforme o caso.

---

## Fluxo OAuth (Vinculação de Provedores)

1. Usuário autenticado clica em "Vincular Spotify/YouTube" no dashboard.
2. Frontend chama `GET /auth/oauth/{provider}/authorize` e redireciona para a URL retornada.
3. No provedor, o usuário autoriza e é redirecionado para `/auth/callback/{provider}?code=...&state=...`.
4. O `OAuthCallbackComponent` captura `code` e `state` e envia para `POST /auth/oauth/{provider}/callback`.
5. Backend troca o `code` por tokens, criptografa e persiste. Frontend exibe confirmação e volta ao dashboard.

### Atenção ao Redirect URI

O `redirect_uri` configurado no `.env` do backend precisa **exatamente** bater com o cadastrado no dashboard do provedor **e** apontar para este frontend:

| Provedor | Redirect URI (dev) |
|:---|:---|
| Spotify | `http://localhost:4200/auth/callback/spotify` |
| Google / YouTube | `http://localhost:4200/auth/callback/google` |

> Use `http`, não `https`, em desenvolvimento (o Angular dev server é HTTP por padrão).

Cadastre o mesmo valor em:

- **Spotify:** https://developer.spotify.com/dashboard > app > Edit Settings > Redirect URIs
- **Google:** https://console.cloud.google.com/apis/credentials > OAuth client > Authorized redirect URIs

---

## Internacionalização (i18n)

Traduções gerenciadas pelo **Transloco**:

- Arquivos: [src/assets/i18n/pt-BR.json](src/assets/i18n/pt-BR.json) e [src/assets/i18n/en.json](src/assets/i18n/en.json)
- Troca de idioma: disponível no menu superior (bandeirinha do país ativo)
- Uso em template: `{{ 'dashboard.greeting' | transloco }}`
- Uso no TypeScript: injetando `TranslocoService.translate('key')`

Ao adicionar nova string de UI, mantenha sempre **as duas traduções sincronizadas** pelo mesmo caminho de chave.

---

## Ícones (Phosphor via Iconify)

O Iconify é carregado via `<script>` em `index.html` e usado como custom element:

```html
<iconify-icon icon="ph:music-notes-plus-duotone" class="text-3xl"></iconify-icon>
```

Componentes que utilizam `<iconify-icon>` precisam declarar `schemas: [CUSTOM_ELEMENTS_SCHEMA]`. Galeria de ícones disponíveis: https://icon-sets.iconify.design/ph/.

---

## Tema Claro e Escuro

O `ThemeService` gerencia o tema via classe `.dark` no `<html>` e persiste a preferência em `localStorage`. Na primeira visita, herda a preferência do sistema operacional (`prefers-color-scheme`). A alternância é exposta no menu superior.

Nos estilos, use os modificadores Tailwind:

```html
<div class="bg-white text-brand dark:bg-brand-dark dark:text-white">...</div>
```

---

## Convenções de Desenvolvimento

- **Componentes standalone**: todos os componentes usam `standalone: true` - não há NgModules.
- **Signals**: estado reativo local via `signal()`, `computed()` e `effect()` ao invés de `BehaviorSubject` quando possível.
- **OnPush**: componentes usam `ChangeDetectionStrategy.OnPush` por padrão para performance.
- **CUSTOM_ELEMENTS_SCHEMA**: obrigatório nos componentes que renderizam `<iconify-icon>`.
- **Reactive Forms**: formulários complexos usam `FormBuilder` e `Validators`; forms simples podem usar `FormsModule` com `ngModel`.
- **Lazy Loading**: toda página é importada via `loadComponent()` no arquivo de rotas.
- **Tailwind CSS**: estilização exclusivamente por classes utilitárias - sem CSS customizado por componente a menos que estritamente necessário.
- **i18n desde o início**: nenhuma string de UI deve ser hard-coded - sempre usar `| transloco`.

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|:---|:---|:---|
| CORS error ao chamar a API | `BACKEND_CORS_ORIGINS` não inclui `http://localhost:4200` | Ajustar no `.env` do backend e reiniciar |
| `redirect_uri_mismatch` no OAuth | URI cadastrada no provedor diferente do `.env` do backend | Unificar os dois valores exatamente |
| Ícones não renderizam | `CUSTOM_ELEMENTS_SCHEMA` ausente no componente | Adicionar em `schemas: [CUSTOM_ELEMENTS_SCHEMA]` |
| Strings aparecem como chave (`dashboard.greeting`) | Chave ausente no arquivo de tradução | Adicionar em `pt-BR.json` e `en.json` |
| `401 Unauthorized` em loop | Refresh token expirado | Fazer logout e login novamente |
| Tema não persiste entre sessões | `localStorage` bloqueado ou em modo anônimo | Verificar permissões do navegador |

---

<div align="center">
  <br>
  &copy; 2026 ITransferMusic. Todos os direitos reservados.
  <br><br>
  Desenvolvido por <strong>Gustavo Martins Gripaldi</strong>
</div>
