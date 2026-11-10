import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { SiteFooter, SiteHeader } from '../shared/chrome';
import { Seo } from '../shared/seo';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header />
    <main id="conteudo" tabindex="-1" class="wrap py-28 text-center outline-none">
      <p class="eyebrow justify-center">{{ t('nf.eyebrow') }}</p>
      <h1 class="h-display mt-4 text-[44px] sm:text-[60px]">{{ t('nf.title') }}</h1>
      <p class="mx-auto mt-4 max-w-md text-ink-2">{{ t('nf.text') }}</p>
      <div class="mt-8 flex justify-center gap-2">
        <a routerLink="/" class="btn btn-line">{{ t('nf.home') }}</a>
        <a routerLink="/painel" class="btn btn-primary">{{ t('nav.openDemo') }}</a>
      </div>
    </main>
    <app-site-footer />
  `,
})
export class NotFound {
  protected t = inject(I18n).t;
  constructor() {
    inject(Seo).set({ title: `Página não encontrada | ${SITE_NAME}`, description: 'Esta página não existe no ITransferMusic, demo de transferência de playlists entre serviços de streaming.', path: '/404/', noindex: true });
  }
}
