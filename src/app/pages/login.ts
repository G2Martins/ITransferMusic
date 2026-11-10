import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { errorText } from '../api/api';
import { DEMO } from '../api/demo-api';
import { DEMO_ACCOUNT, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { SiteFooter, SiteHeader } from '../shared/chrome';
import { Icon } from '../shared/icon';
import { Seo } from '../shared/seo';
import { Session } from '../state';

@Component({
  selector: 'app-login',
  imports: [Icon, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header />
    <main id="conteudo" tabindex="-1" class="wrap max-w-3xl pt-14 outline-none sm:pt-20">
      <p class="eyebrow">{{ t('login.eyebrow') }}</p>
      <h1 class="h-display mt-4 text-[40px] sm:text-[54px]">{{ t('login.title') }}</h1>
      <p class="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">{{ t('login.lead') }}</p>

      <div class="card ticks mt-10 p-6 sm:p-8">
        <div class="flex items-center gap-4">
          <span class="avatar h-12 w-12 text-[15px]">LM</span>
          <div class="min-w-0">
            <p class="text-[17px] font-medium">{{ account.name }}</p>
            <p class="mono text-[12.5px] text-dim">{{ account.email }}</p>
          </div>
          <span class="tag tag-accent ml-auto hidden sm:inline-flex">{{ t('common.demoSession') }}</span>
        </div>
        <ul class="mt-6 grid gap-2 text-[14px] text-ink-2 sm:grid-cols-3">
          <li class="flex gap-2"><app-icon name="link" [size]="16" class="mt-0.5 text-accent" /> {{ t('login.p1') }}</li>
          <li class="flex gap-2"><app-icon name="history" [size]="16" class="mt-0.5 text-accent" /> {{ t('login.p2') }}</li>
          <li class="flex gap-2"><app-icon name="sync" [size]="16" class="mt-0.5 text-accent" /> {{ t('login.p3') }}</li>
        </ul>
        <button type="button" class="btn btn-primary mt-7 h-12 w-full text-[15px] sm:w-auto sm:px-6" [disabled]="busy()" (click)="enter()">
          {{ t('home.cta') }} <app-icon name="arrow-right" [size]="17" />
        </button>
        <p class="mt-3 min-h-5 text-[13px] text-danger" role="alert">{{ error() }}</p>
        <p class="mt-1 flex gap-2 text-[13px] text-dim"><app-icon name="shield" [size]="15" class="mt-0.5" /> {{ t(demo ? 'login.how' : 'login.howApi') }}</p>
      </div>
    </main>
    <app-site-footer />
  `,
})
export class Login {
  protected t = inject(I18n).t;
  private session = inject(Session);
  private router = inject(Router);
  private next = inject(ActivatedRoute).snapshot.queryParamMap.get('next');
  protected readonly account = DEMO_ACCOUNT;
  protected readonly demo = DEMO;
  protected busy = signal(false);
  protected error = signal('');

  constructor() {
    inject(Seo).set({ title: `Entrar | ${SITE_NAME}`, description: 'Entre na sessão de demonstração do ITransferMusic: contas e transferências simuladas, dados só no navegador.', path: '/entrar/', noindex: true });
  }

  async enter() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.session.signInDemo();
      // Only internal paths: never follow ?next= to another origin.
      await this.router.navigateByUrl(this.next && /^\/[a-z]/.test(this.next) ? this.next : '/painel');
    } catch (e) {
      this.error.set(errorText(e, this.t('login.failed')));
    }
    this.busy.set(false);
  }
}
