import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { errorText } from '../api/api';
import { Api } from '../api/api';
import { PROVIDERS, PROVIDER_META, Provider, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { fmtDateTime } from '../shared/format';
import { Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { Linked, Toast } from '../state';

@Component({
  selector: 'app-connections',
  imports: [Icon, ProviderBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <p class="eyebrow">{{ t('conn.eyebrow') }}</p>
      <h1 class="h-page mt-3">{{ t('conn.title') }}</h1>
      <p class="mt-2 max-w-2xl text-ink-2">{{ t('conn.subtitle') }}</p>
    </header>

    <ul class="mt-8 grid gap-5 md:grid-cols-2">
      @for (p of providers; track p) {
        @let a = account(p);
        <li class="card flex flex-col p-5">
          <div class="flex items-center gap-3">
            <app-provider [provider]="p" [size]="40" />
            <div class="min-w-0 flex-1">
              <h2 class="text-[17px] font-medium tracking-[-0.02em]">{{ meta[p].label }}</h2>
              <p class="text-[12.5px] text-dim">{{ meta[p].oauth }}</p>
            </div>
            @if (a) { <span class="tag tag-ok">{{ t('conn.connected') }}</span> } @else { <span class="tag">{{ t('conn.disconnected') }}</span> }
          </div>
          @if (a) {
            <dl class="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
              <dt class="text-dim">{{ t('conn.as') }}</dt><dd class="clamp-1">{{ a.provider_display_name }}</dd>
              <dt class="text-dim">{{ t('conn.userId') }}</dt><dd class="clamp-1 mono text-[12px]">{{ a.provider_user_id }}</dd>
              <dt class="text-dim">{{ t('conn.since') }}</dt><dd>{{ date(a.created_at) }}</dd>
              <dt class="text-dim">{{ t('conn.token') }}</dt><dd>{{ t('conn.tokenText', { when: date(a.expires_at) }) }}</dd>
            </dl>
            <button type="button" class="btn btn-danger btn-sm mt-5 self-start" [disabled]="busy() === p" (click)="unlink(p)"><app-icon name="unlink" [size]="15" /> {{ t('conn.unlink') }}</button>
          } @else {
            <p class="mt-4 text-[13.5px] text-ink-2">{{ t('conn.connectHint', { service: meta[p].label }) }}</p>
            <button type="button" class="btn btn-primary btn-sm mt-5 self-start" [disabled]="busy() === p" (click)="connect(p)"><app-icon name="link" [size]="15" /> {{ t('conn.connect') }}</button>
          }
        </li>
      }
    </ul>

    <section class="dark-panel mt-10 p-6 sm:p-8" aria-labelledby="fluxo">
      <p class="eyebrow text-plum-ink/80">OAuth2 · Authorization Code</p>
      <h2 id="fluxo" class="mt-3 text-[22px] font-medium tracking-[-0.02em] text-white">{{ t('conn.flowTitle') }}</h2>
      <ol class="mt-6 grid gap-4 md:grid-cols-4">
        @for (s of ['f1', 'f2', 'f3', 'f4']; track s; let i = $index) {
          <li class="rounded-xl border border-white/10 bg-white/5 p-4">
            <p class="mono text-[11px] text-accent-lite">0{{ i + 1 }}</p>
            <p class="mt-2 text-[13.5px] leading-relaxed text-plum-ink">{{ t('conn.' + s) }}</p>
          </li>
        }
      </ol>
    </section>
  `,
})
export class Connections {
  protected t = inject(I18n).t;
  private i18n = inject(I18n);
  private api = inject(Api);
  private toast = inject(Toast);
  protected linked = inject(Linked);
  protected readonly providers = PROVIDERS;
  protected readonly meta = PROVIDER_META;
  protected busy = signal<Provider | null>(null);

  constructor() {
    inject(Seo).set({ title: `Conexões | ${SITE_NAME}`, description: 'Contas de streaming vinculadas na demo do ITransferMusic, com OAuth simulado: nenhuma credencial real.', path: '/conexoes/', noindex: true });
    this.linked.load().catch(() => undefined);
  }

  protected account = (p: Provider) => this.linked.list().find((a) => a.provider === p);
  protected date = (iso: string | null) => fmtDateTime(iso, this.i18n.locale(), true);

  async connect(p: Provider) {
    this.busy.set(p);
    try { await this.linked.connect(p, '/conexoes'); } catch (e) { this.toast.say(errorText(e, this.t('conn.failed'))); }
    this.busy.set(null);
  }

  async unlink(p: Provider) {
    this.busy.set(p);
    try {
      await this.api.unlink(p);
      await this.linked.load();
      this.toast.say(this.t('conn.unlinked', { service: PROVIDER_META[p].label }));
    } catch (e) { this.toast.say(errorText(e, this.t('conn.failed'))); }
    this.busy.set(null);
  }
}
