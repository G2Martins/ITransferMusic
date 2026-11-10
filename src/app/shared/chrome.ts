import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AUTHOR, PORTFOLIO_URL, PROJECT_URL, REPO_URL } from '../data/site';
import { I18n } from '../i18n/i18n';
import { Icon, Mark } from './icon';

/** PT | EN switch (Transloco). */
@Component({
  selector: 'app-lang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="group" [attr.aria-label]="t('common.language')">
      <button type="button" lang="pt-BR" [attr.aria-pressed]="i18n.lang() === 'pt-BR'" (click)="i18n.set('pt-BR')">PT</button>
      <button type="button" lang="en" [attr.aria-pressed]="i18n.lang() === 'en'" (click)="i18n.set('en')">EN</button>
    </div>
  `,
})
export class LangSwitch {
  protected i18n = inject(I18n);
  protected t = this.i18n.t;
}

/** Wordmark: the mark + "ITransfer" + light "Music". */
@Component({
  selector: 'app-brand',
  imports: [Mark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `<app-mark [size]="28" /><span class="text-[17px] font-semibold tracking-[-0.03em]">ITransfer<span class="font-light text-accent">Music</span></span>`,
})
export class Brand {}

/** Header of the public pages (home, sobre, entrar, 404). The app has its own shell. */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, Icon, Brand, LangSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="border-b border-line/80 bg-bg/90">
      <div class="wrap flex h-16 items-center gap-3">
        <a routerLink="/" [attr.aria-label]="t('nav.homeAria')"><app-brand /></a>
        <nav class="ml-auto flex items-center gap-1 sm:gap-2" [attr.aria-label]="t('nav.main')">
          <a routerLink="/sobre" routerLinkActive="text-ink" class="btn btn-ghost hidden sm:inline-flex">{{ t('nav.about') }}</a>
          <a [href]="repo" class="btn btn-ghost hidden md:inline-flex"><app-icon name="github" [size]="16" /> {{ t('nav.code') }}</a>
          <app-lang class="hidden sm:block" />
          <a routerLink="/painel" class="btn btn-primary">{{ t('nav.openDemo') }} <app-icon name="arrow-right" [size]="16" /></a>
        </nav>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected t = inject(I18n).t;
  protected readonly repo = REPO_URL;
}

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Brand, LangSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="mt-24 border-t border-line bg-well/60">
      <div class="wrap grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <a routerLink="/" [attr.aria-label]="t('nav.homeAria')"><app-brand /></a>
          <p class="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ink-2">{{ t('footer.tagline') }}</p>
          <app-lang class="mt-5 block sm:hidden" />
        </div>
        <div>
          <p class="eyebrow">{{ t('footer.demo') }}</p>
          <ul class="mt-4 space-y-2.5 text-[14px] text-ink-2">
            <li><a routerLink="/painel" class="hover:text-ink">{{ t('footer.open') }}</a></li>
            <li><a routerLink="/transferir" class="hover:text-ink">{{ t('nav.transfer') }}</a></li>
            <li><a routerLink="/sobre" class="hover:text-ink">{{ t('nav.about') }}</a></li>
          </ul>
        </div>
        <div>
          <p class="eyebrow">{{ t('footer.project') }}</p>
          <ul class="mt-4 space-y-2.5 text-[14px] text-ink-2">
            <li><a [href]="links.portfolio" class="hover:text-ink">{{ t('footer.by', { name: links.author }) }}</a></li>
            <li><a [href]="links.project" class="hover:text-ink">{{ t('footer.inPortfolio') }}</a></li>
            <li><a [href]="links.repo" class="hover:text-ink">{{ t('footer.github') }}</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-line">
        <div class="wrap flex flex-col gap-1 py-5 text-[12px] text-dim sm:flex-row sm:justify-between">
          <p>{{ t('footer.marks') }}</p>
          <p>© {{ year }} · <a [href]="links.portfolio" class="hover:text-ink-2">{{ links.author }}</a></p>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected t = inject(I18n).t;
  protected readonly links = { author: AUTHOR, portfolio: PORTFOLIO_URL, project: PROJECT_URL, repo: REPO_URL };
  protected readonly year = new Date().getFullYear();
}
