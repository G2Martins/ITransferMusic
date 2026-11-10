# ITransferMusic

Plataforma web para **transferir, gerar e sincronizar playlists** entre serviços de streaming (Spotify, YouTube Music,
Apple Music, Amazon Music e Deezer), feita por [Gustavo Martins Gripaldi](https://g2portfolio.grovicdata.com/).
Backend em Python com FastAPI + MongoDB (Motor), JWT, OAuth2 com os provedores e APScheduler; frontend em Angular.

**Ao vivo:** https://g2martins.github.io/ITransferMusic/ · **No portfólio:** https://g2portfolio.grovicdata.com/projetos/itransfermusic/

> A versão publicada é uma **demo estática**: não existe servidor. As chamadas HTTP do frontend são respondidas dentro
> do navegador por uma cópia da API FastAPI, e os dados ficam só no `localStorage` de quem abre. Contas de streaming,
> OAuth e transferências são **simulados**: nenhuma credencial é pedida e nada é enviado a provedor algum.

## O que tem

- **Sessão de demonstração** em um clique ("Entrar como demo"): `POST /auth/login` com a conta pública da demo. Não há campo de senha.
- **Conexões**: Spotify, YouTube Music e Apple Music já vinculados; Amazon Music e Deezer conectáveis por um **OAuth simulado** que segue o fluxo real (authorize, tela de consentimento, redirect para `/auth/callback/{provider}/` com `code` e `state`, `POST` do callback). A tela de consentimento diz em destaque que é simulada e não tem campo nenhum.
- **Playlists por serviço**, com a biblioteca pessoal do Spotify (Músicas Curtidas, Álbuns salvos, Artistas seguidos) como no original.
- **Assistente de transferência**: origem → destino → playlists (várias de uma vez, ou só as faixas marcadas) → **pré-visualização da correspondência** com a confiança de cada faixa (alta, média, baixa) e as não encontradas → nomes, descrição e assinatura "By ITransferMusic" → execução.
- **Jobs com progresso**: cada transferência roda "em segundo plano", faixa a faixa, contra o relógio. Recarregar a página não interrompe nada; o job continua de onde estaria. Ao terminar, o resultado vira `completed`, `partial` ou `failed` pelas mesmas regras do service.
- **Histórico** com detalhe por faixa, aviso de playlist removida no destino (`/alive`), **link público de compartilhamento** (`/share/{token}/`) e atalho para sincronizar.
- **Sincronizações agendadas** (diária ou semanal, horário no fuso do usuário, adicionar apenas ou espelho), pausar, retomar, remover e "Executar agora", com o **agendador APScheduler simulado** à vista: o job `sync_scan` com `cron[minute='*/15']`, a contagem até o próximo disparo, a próxima execução de cada sincronização e o log das execuções.
- **Gerador de playlist** por gêneros, humores e prompt livre (mesmo vocabulário e mesmas consultas do original), "Gerar mais" sem repetir faixas e salvar em qualquer serviço conectado.
- **Restaurar dados de demonstração** a qualquer momento.
- **PT-BR e EN** com Transloco (PT-BR padrão, EN carregado sob demanda).
- **Acessibilidade e SEO**: landing e "Sobre" pré-renderizadas, rotas do app `noindex`, `<dialog>` nativo, `aria-live` para cada ação, `prefers-reduced-motion`, só `transform`/`opacity` animam.

Capas são **geradas** (gradiente + iniciais): nenhuma arte de álbum. O catálogo de exemplo tem cerca de 160 músicas
reais (título, artista, álbum e ano: só metadados factuais), em [`src/app/data/catalog.ts`](src/app/data/catalog.ts).

## Como a demo espelha o backend

O frontend chama exatamente as rotas de `BackEnd/src/api/v1` (base `http://localhost:8000/api/v1`, a mesma do
frontend original), com os mesmos DTOs (`TransferResponse`, `PlaylistSyncResponse`, `Track`, `PlaylistSummary`...), as
mesmas mensagens em `detail` e o formato 422 do Pydantic. No build da demo, o interceptor
[`src/app/api/demo-api.ts`](src/app/api/demo-api.ts) responde essas chamadas com
[`src/app/api/demo-db.ts`](src/app/api/demo-db.ts), uma tradução dos services Python, e grava no `localStorage`.

| Rota | Regra espelhada |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/refresh`, `GET`/`PATCH /auth/me` | 409 "E-mail ja cadastrado", 401 "Credenciais invalidas", refresh só com token do tipo `refresh`, validação de nome e fuso |
| `GET /auth/oauth/{provider}/authorize`, `POST .../callback` | `state` assinado com `sub`, `provider` e validade de 10 min; provedor errado, `state` vencido e `code` inválido viram 400 |
| `GET /accounts`, `DELETE /accounts/{provider}` | contas sem tokens na resposta; desvincular não apaga a biblioteca do provedor |
| `GET /playlists/{provider}`, `.../{id}/tracks` | 400 "Conta do provedor 'x' nao vinculada", 422 para provedor fora do enum |
| `POST /transfers` (202), `GET /transfers`, `GET /transfers/{id}`, `/alive` | origem igual ao destino = 400; job `pending` → `running` → `completed`/`partial`/`failed` ("Playlist de origem esta vazia", "Nenhuma faixa foi encontrada no destino"); assinatura no nome e na descrição da playlist criada |
| `POST /transfers/{id}/share`, `GET /shares/{token}` | token gerado uma vez e reaproveitado; leitura pública sem login |
| `POST /generator/tracks`, `/generator/save` | `_build_queries` com as palavras de humor do original, `count` 1..50, `exclude_track_ids`; salvar grava um "transfer" sintético com `source_playlist_id = "__generator__"` |
| `POST`/`GET`/`PATCH`/`DELETE /syncs`, `POST /syncs/{id}/run` | mesma origem e destino = 400; `run_sync` copia o que falta no destino sem duplicar; espelho só remove no mesmo provedor |
| agendador | `scan_and_run_due_syncs` a cada 15 min (UTC), `_is_due` com janela de 15 min e intervalo de 1 ou 7 dias menos 1 h |

`npm test` roda [`scripts/demo-api.test.ts`](scripts/demo-api.test.ts), que confere essas regras (e que o EN tem todas as chaves do PT).

**Como a simulação funciona.** Cada provedor "tem" cada música do catálogo de forma determinística (hash do provedor +
faixa): a maioria igual, algumas como outra versão ("- Remastered", "(Ao Vivo)", "(Live)"...) e poucas ausentes
(licenciamento, região). A busca do destino é por título + artista, como o `search_track` dos clients, e a confiança é
a similaridade entre os dois títulos. O job de transferência é calculado na criação e reproduzido contra o relógio a
cada requisição (por isso sobrevive a recarregar). O agendador roda os disparos de 15 em 15 minutos entre a última
requisição e agora: o servidor real fica sempre no ar; o "servidor" da demo só existe com a aba aberta, então ao voltar
ele processa os disparos que perdeu (até 7 dias), como se nunca tivesse parado.

### Extensões da demo

- `POST /transfers/preview`: o matching do job sem rodar nada (passo de pré-visualização). Não existe no FastAPI; com o backend real, o passo avisa que não há pré-visualização.
- `GET /__demo/scheduler`: o job do APScheduler, a próxima execução de cada sincronização e o log de execuções.
- Cada `TransferTrackResult` ganha `confidence` e `matched_name`.
- Os cinco provedores têm OAuth simulado (no original, só Spotify e YouTube Music têm code flow; Apple Music e Amazon Music são stubs e Deezer está fora de escopo).

### Diferenças assumidas (bugs do original corrigidos só na demo)

O backend continua intacto em `BackEnd/`. Cada correção está comentada no código com "demo fix".

1. **Sincronização das 23:46 às 23:59 UTC nunca rodava.** `_is_due` monta o horário agendado no dia de hoje; no disparo das 00:00 ele cai no futuro e a diferença fica negativa. A demo usa a última ocorrência antes do disparo. (Com o seletor do original em passos de 5 min, 20:50 em Brasília = 23:50 UTC era um desses horários.)
2. **Transferência sem nenhuma correspondência criava playlist vazia.** `execute_transfer` chama `create_playlist` antes de decidir o status; com 0 faixas encontradas (ou origem vazia) ficava uma playlist vazia no destino e a transferência marcada como falha. A demo não cria nada quando falha.
3. **Gerador gravava `matched=True` em todas as faixas** salvas, inclusive as que não encontrou no destino, então `matched_tracks` e os resultados se contradiziam. A demo grava o resultado real.
4. **`POST /transfers` aceitava o job sem a conta vinculada.** A rota captura `LinkedAccountNotFoundError`, mas `create_transfer` nunca a levanta; o job falhava depois, em segundo plano. A demo responde 400 na hora com a mesma mensagem.
5. **`POST /syncs/{id}/run` respondia 202 `{"status": "ok"}` para sincronização inexistente.** A demo responde 404. O `PATCH /syncs/{id}` também passa a atualizar `updated_at`.
6. **`GET /transfers?limit=` sem limite.** A demo limita entre 1 e 100.

Outras notas: o README antigo do backend dizia que o agendador roda "a cada minuto" com `next_run_at` e frequência
mensal; o código roda a cada 15 minutos, sem `next_run_at`, só diária ou semanal (a demo segue o código). A resposta
pública de `/shares/{token}` inclui `owner_id` apesar do comentário "sem ids privados" (a demo mantém o DTO igual).
Não foram espelhadas, por estarem fora do roteiro da demo: login com Google, excluir conta, trocar senha, editar o
share (`PATCH /shares/{token}`) e avaliações (`/reviews`).

## Stack

| | Versão 2 (este repositório) | Versão original (tag `v1-original`) |
|---|---|---|
| Frontend | Angular 21.2 standalone, sem zone.js, signals, SSG (`outputMode: "static"`) com hidratação incremental, Tailwind CSS 4, Transloco 8 (PT-BR + EN), Geist | Angular 19 standalone, Tailwind CSS 3, Transloco 7, Iconify |
| Backend | o mesmo, intacto em `BackEnd/` | FastAPI, Uvicorn, Pydantic v2, Motor, python-jose, bcrypt, Fernet, httpx, APScheduler |
| Dados | `localStorage` (demo) ou MongoDB (full stack) | MongoDB |

Node 22.18+ (os scripts `.ts` rodam com type stripping nativo). Python 3.11+ para o backend.

## Rodar

```bash
npm install
npm start            # demo (API no navegador): http://localhost:4200/ITransferMusic/
npm test             # regras da API de demonstração + chaves de tradução
npm run build        # seo (sitemap/robots) + ng build com prerender
npm run check        # smoke pós-build: SEO por página, JSON-LD, barra final nos links, zero travessão longo
npm run build:pages  # test + build + check + copia para docs/ (.nojekyll, 404.html, shells das rotas do app)
npm run og           # python scripts/og.py: imagem de compartilhamento + ícones via Playwright
```

### Full stack (FastAPI + MongoDB + OAuth de verdade)

1. Suba um MongoDB (`docker run -d -p 27017:27017 mongo:7`, ou um cluster Atlas seu).
2. Configure e rode o backend. Os segredos vão só no `.env` (não versionado; o modelo é `BackEnd/.env.example`):
   ```bash
   cd BackEnd
   python -m venv .venv && source .venv/Scripts/activate   # Linux/macOS: source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env    # preencha JWT_SECRET_KEY, PROVIDER_TOKEN_ENCRYPTION_KEY, MONGODB_URI e as credenciais OAuth
   uvicorn src.main:app --reload    # http://localhost:8000/docs
   ```
   Como o frontend novo vive em `/ITransferMusic/`, os redirect URIs (no `.env` e no painel de cada provedor) ficam
   `http://localhost:4200/ITransferMusic/auth/callback/spotify/` e `.../auth/callback/youtube/`. O CORS padrão já
   libera `http://localhost:4200`.
3. Crie a conta que o botão "Entrar como demo" usa (no modo full stack ele faz login de verdade):
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/register -H "content-type: application/json" \
     -d '{"name":"Lia Moraes","email":"lia@demo.example","password":"demo-itransfermusic"}'
   ```
4. Rode o frontend sem a API de demonstração: `npm run start:api` (`ng serve` com `DEMO_API=false`). Conectar um
   serviço agora leva ao site real do provedor; a pré-visualização da correspondência e o painel do agendador avisam
   que são extensões da demo.

A versão original completa (Angular 19 + FastAPI) continua na tag `v1-original`: `git checkout v1-original`, depois
`FrontEnd/` com `npm install && npm start`.

## Estrutura

| Caminho | O que é |
|---|---|
| `src/app/api/` | `api.ts` (uma função por rota do FastAPI + `errorText`), `demo-db.ts` (a API espelhada, pura), `engine.ts` (catálogo + `localStorage`, chunk lazy), `demo-api.ts` (interceptor) |
| `src/app/data/` | `site.ts` (constantes, provedores, rotas, tabela de endpoints), `catalog.ts` (músicas reais, só metadados) |
| `src/app/i18n/` | `pt.ts`, `en.ts` e o wrapper do Transloco (`i18n.ts`) |
| `src/app/state.ts` | `Session` (JWT), `Linked` (contas + início do OAuth), `Jobs` (transferências com polling), `Toast` |
| `src/app/pages/` | `home`, `about` (pré-renderizadas) · `login`, `oauth` (consentimento + callback), `dashboard`, `connections`, `playlists`, `wizard`, `transfers`, `syncs`, `generator`, `share`, `not-found` (cliente) |
| `src/app/shared/` | `shell.ts` (layout do app), `chrome.ts` (header/footer públicos, PT/EN), `tracks.ts` (status, confiança, faixa, job), `sync-setup.ts`, `icon.ts` (ícones, marca, selos dos serviços, capas geradas), `seo.ts`, `trailing-slash.ts`, `reveal.ts`, `format.ts` |
| `scripts/` | `seo.ts`, `check.ts`, `pages.ts`, `demo-api.test.ts`, `og.py` + `og.html` |
| `BackEnd/` | API FastAPI original, sem alterações |
| `docs/` | site publicado (saída do build). Não editar à mão |

## Deploy

GitHub Pages servindo `main:/docs`, base `/ITransferMusic/`. `npm run build:pages` gera tudo; cada rota do app ganha
uma cópia do shell (`docs/painel/index.html`, `docs/auth/callback/deezer/index.html`...) para recarregar responder 200,
e o resto cai no `404.html`, que sobe o app (é o caso dos links `/share/{token}/`, que só existem no navegador que os criou).

## Avisos

Marcas pertencem aos respectivos donos; projeto de portfólio sem afiliação. Os nomes e cores dos serviços aparecem só
como pequenos selos de identificação, com glifos simplificados (não os logotipos oficiais). Usuário, contas e
transferências da demo são fictícios; títulos e artistas são reais e usados só como metadados.
