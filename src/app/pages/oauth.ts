import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errorText } from '../api/api';
import { PROVIDERS, PROVIDER_META, Provider, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { Brand } from '../shared/chrome';
import { Icon, Mark, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { Linked, Toast } from '../state';

const asProvider = (v: string | null): Provider | null => (PROVIDERS.includes(v as Provider) ? (v as Provider) : null);

/**
 * The simulated consent screen (authorize_url of the demo API). It says it is simulated, asks for nothing and
 * never leaves the app: "Autorizar" redirects to the callback route with a demo code, like a provider would.
 */
@Component({
  selector: 'app-consent',
  imports: [Icon, Mark, ProviderBadge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="conteudo" tabindex="-1" class="wrap max-w-lg py-12 outline-none sm:py-16">
      @if (provider(); as p) {
        <div class="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13.5px] text-warn" role="note">
          <p class="flex items-center gap-2 font-semibold"><app-icon name="alert" [size]="16" /> {{ t('consent.simulated') }}</p>
          <p class="mt-1 leading-relaxed">{{ t('consent.simulatedText', { service: meta[p].label }) }}</p>
        </div>

        <div class="card mt-8 p-6 sm:p-8">
          <div class="flex items-center justify-center gap-4">
            <app-provider [provider]="p" [size]="48" />
            <span class="route live w-16"><i></i></span>
            <span class="grid h-12 w-12 place-items-center rounded-[12px] border border-line bg-panel"><app-mark [size]="30" /></span>
          </div>
          <h1 class="mt-6 text-center text-[22px] font-medium tracking-[-0.02em]">{{ t('consent.title', { app: 'ITransferMusic', service: meta[p].label }) }}</h1>
          <p class="mt-2 text-center text-[14px] text-ink-2">{{ t('consent.account', { service: meta[p].label }) }}</p>
          <p class="eyebrow mt-7">{{ t('consent.scopes') }}</p>
          <ul class="mt-3 space-y-2.5 text-[14px]">
            @for (s of ['s1', 's2', 's3']; track s) {
              <li class="flex gap-2.5"><app-icon name="check" [size]="16" class="mt-0.5 text-ok" /> {{ t('consent.' + s) }}</li>
            }
          </ul>
          <p class="mt-5 rounded-lg bg-well px-3 py-2 mono text-[11.5px] leading-relaxed text-ink-2 break-all">state={{ shortState() }}</p>
          <div class="mt-7 grid gap-2 sm:grid-cols-2">
            <button type="button" class="btn btn-line" (click)="deny()">{{ t('common.cancel') }}</button>
            <button type="button" class="btn btn-primary" (click)="allow()">{{ t('consent.allow') }}</button>
          </div>
        </div>
        <p class="mt-6 text-center text-[12.5px] text-dim">{{ t('consent.real') }}</p>
      } @else {
        <h1 class="h-page">{{ t('consent.invalid') }}</h1>
        <a routerLink="/conexoes" class="btn btn-line mt-6">{{ t('nav.connections') }}</a>
      }
    </main>
  `,
})
export class Consent {
  protected t = inject(I18n).t;
  private router = inject(Router);
  private q = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly meta = PROVIDER_META;
  private state = this.q.get('state') ?? '';
  private redirect = this.q.get('redirect_uri') ?? '';
  /** Only our own callback route is accepted as redirect_uri (no open redirect). */
  protected provider = signal(this.state && this.redirect === `/auth/callback/${this.q.get('provider')}/` ? asProvider(this.q.get('provider')) : null);
  protected shortState = computed(() => (this.state.length > 28 ? this.state.slice(0, 28) + '...' : this.state));

  constructor() {
    inject(Seo).set({ title: `Autorização simulada | ${SITE_NAME}`, description: 'Tela de consentimento OAuth simulada da demo do ITransferMusic. Nenhum dado é enviado a serviço de streaming algum.', path: '/oauth/simulado/', noindex: true });
  }

  allow() {
    const code = 'demo-' + Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => (b % 36).toString(36)).join('');
    this.router.navigateByUrl(`${this.redirect}?${new URLSearchParams({ code, state: this.state })}`);
  }
  deny() {
    this.router.navigateByUrl(`${this.redirect}?${new URLSearchParams({ error: 'access_denied', state: this.state })}`);
  }
}

/** /auth/callback/:provider/ (the redirect URI of the original): posts code + state, then goes back. */
@Component({
  selector: 'app-callback',
  imports: [Brand, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="conteudo" tabindex="-1" class="wrap max-w-lg py-20 text-center outline-none">
      <app-brand class="justify-center" />
      @if (error()) {
        <h1 class="h-page mt-8">{{ t('callback.failed') }}</h1>
        <p class="mt-3 text-ink-2" role="alert">{{ error() }}</p>
        <a routerLink="/conexoes" class="btn btn-line mt-6">{{ t('nav.connections') }}</a>
      } @else {
        <h1 class="h-page mt-8">{{ t('callback.linking') }}</h1>
        <p class="mt-3 flex items-center justify-center gap-2 text-ink-2"><app-icon name="refresh" class="spin" /> POST /auth/oauth/{{ provider }}/callback</p>
      }
    </main>
  `,
})
export class Callback {
  protected t = inject(I18n).t;
  private api = inject(Api);
  private router = inject(Router);
  private toast = inject(Toast);
  private linked = inject(Linked);
  private route = inject(ActivatedRoute).snapshot;
  protected provider = this.route.paramMap.get('provider') ?? '';
  protected error = signal('');

  constructor() {
    inject(Seo).set({ title: `Vinculando conta | ${SITE_NAME}`, description: 'Retorno do fluxo OAuth simulado da demo do ITransferMusic: a conta é vinculada no navegador.', path: `/auth/callback/${this.provider}/`, noindex: true });
    this.finish();
  }

  private async finish() {
    const q = this.route.queryParamMap;
    const p = asProvider(this.provider);
    const back = this.linked.returnTo();
    if (!p) return this.error.set(this.t('consent.invalid'));
    if (q.get('error')) {
      this.toast.say(this.t('callback.denied', { service: PROVIDER_META[p].label }));
      await this.router.navigateByUrl(back);
      return;
    }
    try {
      await this.api.callback(p, q.get('code') ?? '', q.get('state') ?? '');
      await this.linked.load().catch(() => undefined);
      this.toast.say(this.t('callback.linked', { service: PROVIDER_META[p].label }));
      await this.router.navigateByUrl(back);
    } catch (e) {
      this.error.set(errorText(e, this.t('callback.failed')));
    }
  }
}
