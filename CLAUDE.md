# CLAUDE.md, ITransferMusic

> **Spec viva.** Porta de entrada lida pelo agente em toda sessão. Não duplica o [README.md](README.md), **aponta** pra ele. Atualize quando uma regra, comando, módulo ou armadilha mudar.
>
> **Última revisão:** 2026-11-10
> **Detalhes de features, contrato da API, simulação, full stack e deploy:** [README.md](README.md)

---

## 1. O que é

Plataforma para **transferir, gerar e sincronizar playlists** entre Spotify, YouTube Music, Apple Music, Amazon Music e Deezer, peça de portfólio de **Gustavo Martins Gripaldi** ([g2portfolio.grovicdata.com/projetos/itransfermusic/](https://g2portfolio.grovicdata.com/projetos/itransfermusic/)). Ao vivo: https://g2martins.github.io/ITransferMusic/ como **demo estática**: o frontend chama o mesmo contrato REST do FastAPI e um interceptor responde no navegador, com dados no `localStorage`; contas, OAuth e transferências são simulados. O backend Python continua intacto em `BackEnd/`. A versão original (Angular 19 em `FrontEnd/`) está na tag `v1-original`.

## 2. Stack + Comandos

Angular 21.2 standalone + zoneless + signals, SSG (`outputMode: "static"`) para `/` e `/sobre/` com `withIncrementalHydration()`, rotas do app só no cliente, Tailwind v4 (`@tailwindcss/postcss`), Transloco 8 (PT-BR padrão no bundle, EN lazy), Geist + Geist Mono servidas de `fonts/` (só latin), TS ~5.9, Node 22.18+ (scripts `.ts` nativos). GitHub Pages em `main:/docs`, `baseHref` `/ITransferMusic/`. Backend: Python 3.11, FastAPI, MongoDB (Motor), JWT, OAuth2, APScheduler.

```bash
npm start            # seo + ng serve, API de demonstração (http://localhost:4200/ITransferMusic/)
npm run start:api    # ng serve com DEMO_API=false: fala com o FastAPI em localhost:8000
npm test             # scripts/demo-api.test.ts: regras da API espelhada + chaves PT/EN
npm run build        # seo (sitemap/robots) + ng build com prerender
npm run check        # smoke pós-build: SEO por página, JSON-LD, barra final nos links, zero travessão longo
npm run build:pages  # test + build + check + copia para docs/ (.nojekyll, 404.html, shells das rotas do app)
npm run og           # python scripts/og.py: public/og.png + ícones via Playwright
```

## 3. Mapa de módulos

| Caminho | Responsabilidade |
|---|---|
| `src/app/api/demo-db.ts` | A API FastAPI espelhada: rotas, DTOs, services, job de transferência reproduzido contra o relógio, agendador `*/15`, seed relativo a agora. **Pura, sem imports** (o teste roda em Node); o catálogo entra por `useCatalog()`. |
| `src/app/api/engine.ts` · `demo-api.ts` | Chunk lazy com catálogo + `localStorage` · `HttpInterceptorFn` que responde `API_URL` (flag `DEMO_API`, define do `angular.json`). |
| `src/app/api/api.ts` | Uma função por rota do FastAPI (`HttpClient`) + `errorText` (detail string ou lista 422). |
| `src/app/state.ts` | `Session` (JWT no `localStorage`, login demo, refresh, reset), `Linked` (contas + `connect()` do OAuth), `Jobs` (polling enquanto há job ativo), `Toast` (`aria-live`). |
| `src/app/data/site.ts` · `catalog.ts` | Constantes, provedores, rotas públicas/app, conta demo, tabela de endpoints · músicas reais (só metadados). **Sem imports.** |
| `src/app/i18n/` | `pt.ts`, `en.ts` (mesmas chaves, o teste confere) e `i18n.ts` (Transloco atrás de um signal: templates chamam `t('chave')`). |
| `src/app/pages/` | `home`, `about` (prerender) · `login`, `oauth` (consentimento simulado + callback), `dashboard`, `connections`, `playlists`, `wizard`, `transfers`, `syncs`, `generator`, `share`, `not-found` (cliente). |
| `src/app/shared/` | `shell.ts` (layout do app), `chrome.ts`, `tracks.ts`, `sync-setup.ts`, `icon.ts` (ícones, marca, selos de serviço, capas geradas), `seo.ts`, `trailing-slash.ts`, `reveal.ts`, `format.ts`. |
| `scripts/` | `seo.ts`, `check.ts`, `pages.ts`, `demo-api.test.ts`, `og.py` + `og.html`. |
| `BackEnd/` | API original. Não editar (a demo espelha; mudou a regra lá, muda `demo-db.ts` e o README). |
| `docs/` | Saída do build publicada. Nunca editar à mão. |

## 4. Regras SEMPRE-ATIVAS

- **Contrato igual ao FastAPI.** Rotas, DTOs, mensagens (`detail`) e 422 de `demo-db.ts` seguem `BackEnd/src`. Toda divergência é deliberada, marcada "demo fix" ou "demo extension" no código e listada no README.
- **Demo honesta:** faixa de aviso de portfólio em toda página, "Sessão de demonstração" no app, nenhum campo de senha ou credencial, OAuth simulado que diz que é simulado e nunca redireciona para um provedor real; e-mails em `@demo.example`.
- **Sem arte de terceiros:** capas são geradas (gradiente + iniciais); serviços só como selos pequenos com glifos simplificados; nota de marcas no footer público e no do app. Músicas reais só como metadados.
- **SSG só no público.** APIs do browser só em `afterNextRender`, eventos ou rotas client. Rotas do app têm `noindex` (shells no `pages.ts`; recarregar responde 200). Abaixo da dobra das páginas públicas: `@defer (hydrate on viewport)`.
- **Links internos terminam em "/"** (`TrailingSlashSerializer`; o `check` falha se não). Links do portfólio também. JSON-LD `creator`/`author` = Person `https://g2portfolio.grovicdata.com/#person`.
- **i18n:** todo texto visível passa por `t()`; chave nova vai em `pt.ts` **e** `en.ts` (o `npm test` falha se faltar). Mensagens da API ficam como no original.
- **Design Valerium:** Geist + Geist Mono, eyebrow mono, card "well", ticks, dot grid, out-expo, papel claro. Cores só pelos tokens de `:root` em `styles.css`: tinta ameixa `#1E1730`, rosa da marca `#E5305E` só como sinal (pontos, rotas, marca), `#C8234F` para o que carrega texto, `#FF7A9C` para texto rosa sobre ameixa.
- **Animação só `transform`/`opacity`** (progresso é `scaleX`), com `prefers-reduced-motion`. O texto do hero é o LCP: nunca animado. Conteúdo visível sem JS (gate `.js`).
- **Zero travessão longo (U+2014)** em texto visível; usar ":", ",", "." ou "·". O `check` varre o build e o teste varre as traduções.
- **`npm run build:pages` verde** antes de publicar. `docs/` é build.

## 5. Segurança

- Segredos do backend só no `BackEnd/.env` (ignorado no `.gitignore` da raiz e do backend; `.env.example` versionado sem valores). Nunca ler, copiar ou commitar `.env`; não ecoar valores.
- O site publicado não fala com servidor nenhum: o interceptor responde tudo e o `localStorage` guarda só dados de demonstração (tokens de demo sem assinatura, porque um site estático não tem segredo).
- `demo-db.ts` trata o corpo como hostil: valida tipos, tamanhos e enums como o Pydantic, confere dono (`user_id`) em toda leitura/escrita, `isDb` valida o que vem do `localStorage`. `redirect_uri` do consentimento e `?next=` do login só aceitam caminhos internos (sem open redirect).
- Texto do usuário só via interpolação do Angular (escapado); nada de `innerHTML`. JSON-LD escapa `<`.

## 6. Common Hurdles

- **Node 22 `cpSync` sai com 127 em silêncio** no caminho com "Programação": `pages.ts` usa `cp` de `fs/promises`.
- **EBUSY** ao recriar `docs/` se um shell ou servidor estiver com cwd dentro dela.
- **Python com caminho não-ASCII via argv** chega corrompido: `og.py` usa `__file__`; scripts de QA rodam com cwd no repo e caminho relativo (`.shots/`).
- **`navigateByUrl('/x/?a=1')` não casa rota:** o `Location` tira a barra final só no carregamento da página; no `navigateByUrl` o parser lia um segmento vazio a mais. O `TrailingSlashSerializer.parse` tira a barra do path para todo mundo.
- **Evento `close` do `<dialog>` é assíncrono:** um `router.navigate([])` disparado nele cancela a navegação que o próprio clique iniciou (por isso a flag `leaving` em `transfers.ts`).
- **FNV-1a puro colide em strings parecidas** (bits baixos correlacionados): `hash()` em `demo-db.ts` passa pelo finalizador do murmur3. Sem isso, ids de faixa repetiam.
- **`[innerHTML]` em SVG é removido pelo sanitizer:** glifos dos serviços são dados de path renderizados com `@for`.
- **Selo de serviço ao lado do nome duplicava o nome acessível** ("Deezer Deezer"): o selo é decorativo por padrão; `[labeled]="true"` só quando ele sozinho identifica o serviço.
- **CLS por troca de fonte no hero:** Geist (latin) é copiada para `fonts/` por `angular.json` e pré-carregada no `index.html`; o `@font-face` usa `/ITransferMusic/fonts/...` (caminho fixo para o preload casar).
- **Kaspersky injeta script** (http, bloqueante) até no Chromium do Playwright e entrega o HTML sem gzip: Lighthouse com o Chromium do Playwright em `--remote-debugging-port=448x` + `npx lighthouse@12 --port=448x --blocked-url-patterns="*kaspersky-labs.com*"`, servidor local com gzip em `/ITransferMusic/` e 404 fora da base (senão o `robots.txt` vira HTML). O pedido bloqueado ainda conta em `is-on-https` (boas práticas 81-82 local).
- **Python em heredoc do Bash:** `"\\b"` dentro de regex virou caractere de backspace num patch; conferir com `od -c` quando um teste "passa" fácil demais.
