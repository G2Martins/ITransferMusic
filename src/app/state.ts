import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Api, LinkedAccount, MeResponse, Provider, TokenResponse, TransferResponse } from './api/api';
import { DEMO, resetDemoDb } from './api/demo-api';
import { DEMO_ACCOUNT, PROVIDERS } from './data/site';
import { I18n } from './i18n/i18n';

const TOKENS_KEY = 'itransfermusic:session';
const RETURN_KEY = 'itransfermusic:oauth-return';

/** One polite live region for the whole app (see App template). */
@Injectable({ providedIn: 'root' })
export class Toast {
  readonly message = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  say(msg: string) {
    this.message.set('');
    clearTimeout(this.timer);
    // New text node on every call so screen readers announce repeats too.
    queueMicrotask(() => this.message.set(msg));
    this.timer = setTimeout(() => this.message.set(''), 4600);
  }
}

/**
 * JWT session like the original AuthService: access + refresh tokens in localStorage, `me` from GET /auth/me.
 * Browser-only: the app routes render on the client.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  private api = inject(Api);
  readonly me = signal<MeResponse | null>(null);
  readonly firstName = computed(() => this.me()?.name.split(' ')[0] ?? '');

  tokens(): TokenResponse | null {
    try {
      const t = JSON.parse(localStorage.getItem(TOKENS_KEY) ?? 'null');
      return t && typeof t.access_token === 'string' && typeof t.refresh_token === 'string' ? t : null;
    } catch { return null; }
  }
  private store(t: TokenResponse | null) {
    try { t ? localStorage.setItem(TOKENS_KEY, JSON.stringify(t)) : localStorage.removeItem(TOKENS_KEY); } catch { /* storage blocked */ }
  }

  /** "Entrar como demo": POST /auth/login with the public demo constant. The visitor never types a password. */
  async signInDemo() {
    this.store(await this.api.login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password));
    await this.loadMe();
  }

  async loadMe() {
    this.me.set(await this.api.me());
  }

  /** POST /auth/refresh with the stored refresh token. False when there is none or it was refused. */
  async refresh(): Promise<boolean> {
    const t = this.tokens();
    if (!t) return false;
    try { this.store(await this.api.refresh(t.refresh_token)); return true; } catch { this.signOut(); return false; }
  }

  signOut() {
    this.store(null);
    this.me.set(null);
  }

  /** "Restaurar dados de demonstração": seed data again and sign the demo account back in. */
  async reset() {
    if (!DEMO) return;
    await resetDemoDb();
    this.store(null);
    await this.signInDemo();
  }
}

/** Linked streaming accounts (GET /accounts), shared by the shell, dashboard, connections and the wizard. */
@Injectable({ providedIn: 'root' })
export class Linked {
  private api = inject(Api);
  readonly list = signal<LinkedAccount[]>([]);
  readonly loaded = signal(false);
  readonly providers = computed(() => PROVIDERS.filter((p) => this.list().some((a) => a.provider === p)));
  private router = inject(Router);
  has = (p: Provider) => this.list().some((a) => a.provider === p);
  async load() {
    this.list.set(await this.api.accounts());
    this.loaded.set(true);
  }

  /**
   * Starts the OAuth flow like the original: GET /auth/oauth/{provider}/authorize, then follow authorize_url. In the
   * demo that URL is the simulated consent page of this app; with the real backend it is the provider's site.
   * `back` is where the callback page returns to.
   */
  async connect(p: Provider, back: string) {
    const r = await this.api.authorize(p);
    try { sessionStorage.setItem(RETURN_KEY, back); } catch { /* storage blocked: callback falls back to /conexoes/ */ }
    if (r.authorize_url.startsWith('/')) await this.router.navigateByUrl(r.authorize_url);
    else location.href = r.authorize_url;
  }

  /** Where the OAuth callback should land (only internal paths). */
  returnTo(): string {
    let back = '/conexoes';
    try { back = sessionStorage.getItem(RETURN_KEY) ?? back; sessionStorage.removeItem(RETURN_KEY); } catch { /* storage blocked */ }
    return /^\/[a-z]/.test(back) && !back.startsWith('//') ? back : '/conexoes';
  }
}

const ACTIVE = new Set(['pending', 'running']);

/**
 * Transfer jobs (GET /transfers). Polls while any job is pending or running, like a client watching the FastAPI
 * BackgroundTask, and announces each job that finishes.
 */
@Injectable({ providedIn: 'root' })
export class Jobs {
  private api = inject(Api);
  private toast = inject(Toast);
  private i18n = inject(I18n);
  readonly list = signal<TransferResponse[]>([]);
  readonly loaded = signal(false);
  readonly active = computed(() => this.list().filter((t) => ACTIVE.has(t.status)));
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  async load() {
    const before = new Map(this.list().map((t) => [t.id, t.status]));
    let next: TransferResponse[];
    try { next = await this.api.transfers(50); } catch { return; }
    this.list.set(next);
    this.loaded.set(true);
    for (const t of next) {
      if (ACTIVE.has(before.get(t.id) ?? '') && !ACTIVE.has(t.status))
        this.toast.say(this.i18n.t(t.status === 'failed' ? 'jobs.doneFailed' : 'jobs.done', { name: t.target_playlist_name, matched: t.matched_tracks, total: t.total_tracks }));
    }
    clearTimeout(this.timer);
    if (this.active().length) this.timer = setTimeout(() => this.load(), DEMO ? 700 : 2000);
  }

  stop() { clearTimeout(this.timer); }
}
