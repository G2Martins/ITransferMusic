import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ENDPOINTS, PORTFOLIO_URL, PROJECT_URL, PROVIDERS, PROVIDER_META, REPO_URL, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { SiteFooter, SiteHeader } from '../shared/chrome';
import { Icon, ProviderBadge } from '../shared/icon';
import { Reveal } from '../shared/reveal';
import { Seo, appNode } from '../shared/seo';

@Component({
  selector: 'app-about',
  imports: [RouterLink, Icon, Reveal, SiteHeader, SiteFooter, ProviderBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header />
    <main id="conteudo" tabindex="-1" class="wrap max-w-5xl pt-12 outline-none sm:pt-16">
      <p class="eyebrow">{{ t('about.eyebrow') }}</p>
      <h1 class="h-display mt-5 text-[44px] sm:text-[60px]">{{ t('about.title') }}</h1>
      <p class="mt-6 max-w-3xl text-[17px] leading-relaxed text-ink-2">{{ t('about.lead') }}</p>
      <div class="mt-7 flex flex-wrap gap-2">
        <a routerLink="/painel" class="btn btn-primary">{{ t('nav.openDemo') }} <app-icon name="arrow-right" [size]="16" /></a>
        <a [href]="links.repo" class="btn btn-line"><app-icon name="github" [size]="16" /> {{ t('footer.github') }}</a>
        <a [href]="links.project" class="btn btn-ghost">{{ t('footer.inPortfolio') }} <app-icon name="arrow-up-right" [size]="15" /></a>
      </div>

      @defer (hydrate on viewport) {
      <section class="mt-20" aria-labelledby="stack">
        <h2 id="stack" class="h2 text-[30px] sm:text-[36px]" reveal>{{ t('about.stackTitle') }}</h2>
        <div class="card mt-8 overflow-x-auto" reveal>
          <table class="w-full min-w-[560px] text-left text-[14px]">
            <thead class="text-[12px] text-dim">
              <tr class="border-b border-line"><th class="px-4 py-3 font-medium"></th><th class="px-4 py-3 font-medium">{{ t('about.v2') }}</th><th class="px-4 py-3 font-medium">{{ t('about.v1') }}</th></tr>
            </thead>
            <tbody>
              @for (r of stack; track r) {
                <tr class="border-b border-line last:border-0">
                  <th class="px-4 py-3 font-medium">{{ t('about.row.' + r) }}</th>
                  <td class="px-4 py-3 text-ink-2">{{ t('about.v2' + r) }}</td>
                  <td class="px-4 py-3 text-ink-2">{{ t('about.v1' + r) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      }

      @defer (hydrate on viewport) {
      <section class="mt-20" aria-labelledby="espelho">
        <div class="max-w-3xl" reveal>
          <h2 id="espelho" class="h2 text-[30px] sm:text-[36px]">{{ t('about.mirrorTitle') }}</h2>
          <p class="mt-4 text-[15.5px] leading-relaxed text-ink-2">{{ t('about.mirrorText') }}</p>
        </div>
        <div class="panel mt-8 overflow-x-auto" reveal>
          <table class="w-full min-w-[560px] text-left text-[13.5px]">
            <caption class="sr-only">{{ t('about.tableCaption') }}</caption>
            <thead class="text-[12px] text-dim"><tr class="border-b border-line"><th class="px-4 py-2.5 font-medium">{{ t('about.method') }}</th><th class="px-4 py-2.5 font-medium">{{ t('about.route') }}</th><th class="px-4 py-2.5 font-medium">{{ t('about.what') }}</th></tr></thead>
            <tbody>
              @for (e of endpoints; track e.method + e.path) {
                <tr class="border-b border-line last:border-0">
                  <td class="px-4 py-2 mono text-[12px] text-accent">{{ e.method }}</td>
                  <td class="px-4 py-2 mono text-[12px]">/api/v1{{ e.path }}</td>
                  <td class="px-4 py-2 text-ink-2">{{ e.what }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      }

      @defer (hydrate on viewport) {
      <section class="mt-20" aria-labelledby="diferencas">
        <h2 id="diferencas" class="h2 text-[30px] sm:text-[36px]" reveal>{{ t('about.diffTitle') }}</h2>
        <p class="mt-4 max-w-3xl text-[15.5px] leading-relaxed text-ink-2" reveal>{{ t('about.diffText') }}</p>
        <ol class="mt-8 grid gap-4 md:grid-cols-2">
          @for (d of diffs; track d; let i = $index) {
            <li class="panel p-5" [reveal]="i * 40">
              <p class="mono text-[11px] text-accent">{{ (i + 1).toString().padStart(2, '0') }} · {{ t('about.' + d + 'k') }}</p>
              <p class="mt-2 text-[14.5px] leading-relaxed">{{ t('about.' + d) }}</p>
            </li>
          }
        </ol>
      </section>
      }

      @defer (hydrate on viewport) {
      <section class="mt-20" aria-labelledby="servicos">
        <h2 id="servicos" class="h2 text-[30px] sm:text-[36px]" reveal>{{ t('about.servicesTitle') }}</h2>
        <ul class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (p of providers; track p) {
            <li class="panel flex items-center gap-3 p-4" reveal>
              <app-provider [provider]="p" [size]="30" />
              <div><p class="font-medium">{{ meta[p].label }}</p><p class="text-[12.5px] text-dim">{{ meta[p].oauth }}</p></div>
            </li>
          }
        </ul>
        <p class="mt-4 text-[13px] text-dim">{{ t('footer.marks') }}</p>
      </section>
      }

      @defer (hydrate on viewport) {
      <section class="mt-20" aria-labelledby="faq">
        <h2 id="faq" class="h2 text-[30px] sm:text-[36px]" reveal>{{ t('about.faqTitle') }}</h2>
        <div class="mt-8 divide-y divide-line border-y border-line">
          @for (q of faq; track q) {
            <details class="group py-4">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                {{ t('faq.' + q) }} <app-icon name="chevron-down" class="text-dim transition-transform group-open:rotate-180" />
              </summary>
              <p class="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-2">{{ t('faq.' + q + 'a') }}</p>
            </details>
          }
        </div>
      </section>
      }

      <p class="mt-16 text-[14px] text-ink-2">{{ t('about.by') }} <a [href]="links.portfolio" class="font-medium text-accent hover:text-accent-2">Gustavo Martins Gripaldi</a>.</p>
    </main>
    @defer (hydrate on viewport) { <app-site-footer /> }
  `,
})
export class About {
  protected t = inject(I18n).t;
  protected readonly links = { repo: REPO_URL, project: PROJECT_URL, portfolio: PORTFOLIO_URL };
  protected readonly endpoints = ENDPOINTS;
  protected readonly providers = PROVIDERS;
  protected readonly meta = PROVIDER_META;
  protected readonly stack = ['front', 'back', 'data', 'auth', 'jobs'];
  protected readonly diffs = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];
  protected readonly faq = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

  constructor() {
    inject(Seo).set({
      title: `Sobre o projeto | ${SITE_NAME}`,
      description: 'Como a demo do ITransferMusic espelha a API FastAPI no navegador: rotas, matching de faixas, jobs, agendador e as correções assumidas.',
      path: '/sobre/',
      jsonLd: [appNode()],
    });
  }
}
