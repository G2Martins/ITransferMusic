import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, SharePublic, errorText } from '../api/api';
import { PROVIDER_META, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { SiteFooter, SiteHeader } from '../shared/chrome';
import { Cover, Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { TrackRow } from '../shared/tracks';

/** Public page of a shared transfer (GET /shares/{token}, no login). In the demo it only exists in this browser. */
@Component({
  selector: 'app-share',
  imports: [RouterLink, SiteHeader, SiteFooter, Cover, Icon, ProviderBadge, TrackRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header />
    <main id="conteudo" tabindex="-1" class="wrap max-w-4xl pt-12 outline-none sm:pt-16">
      @if (data(); as d) {
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end">
          <app-cover [name]="d.playlist_name" [size]="120" />
          <div class="min-w-0">
            <p class="eyebrow">{{ t('share.eyebrow', { name: d.owner_name }) }}</p>
            <h1 class="h-display mt-3 text-[34px] sm:text-[46px]">{{ d.playlist_name }}</h1>
            <p class="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
              <app-provider [provider]="d.source_provider" [size]="20" /> <app-icon name="arrow-right" [size]="14" class="text-dim" /> <app-provider [provider]="d.target_provider" [size]="20" />
              {{ meta[d.source_provider].label }} → {{ meta[d.target_provider].label }} · {{ t('common.matchedOf', { a: d.matched_tracks, b: d.total_tracks }) }}
            </p>
          </div>
        </div>
        @if (d.playlist_description) { <p class="mt-6 max-w-3xl text-[14px] leading-relaxed text-ink-2">{{ d.playlist_description }}</p> }
        <ol class="panel mt-8 divide-y divide-line">
          @for (r of d.tracks; track r.source_track_id; let i = $index) { <li><app-track-row [r]="r" [n]="i + 1" [target]="d.target_provider" /></li> }
        </ol>
        <p class="mt-6 flex gap-2 text-[13px] text-dim"><app-icon name="info" [size]="15" class="mt-0.5" /> {{ t('share.local') }}</p>
      } @else if (error()) {
        <p class="eyebrow">404</p>
        <h1 class="h-display mt-4 text-[40px]">{{ t('share.missing') }}</h1>
        <p class="mt-4 max-w-xl text-ink-2">{{ error() }} · {{ t('share.local') }}</p>
        <a routerLink="/painel" class="btn btn-primary mt-8">{{ t('nav.openDemo') }}</a>
      } @else {
        <p class="text-ink-2">{{ t('common.loading') }}</p>
      }
    </main>
    <app-site-footer />
  `,
})
export class SharePage {
  protected t = inject(I18n).t;
  protected readonly meta = PROVIDER_META;
  protected data = signal<SharePublic | null>(null);
  protected error = signal('');

  constructor() {
    const token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
    inject(Seo).set({ title: `Playlist compartilhada | ${SITE_NAME}`, description: 'Playlist compartilhada pela demo do ITransferMusic: faixas transferidas entre serviços de streaming, simuladas no navegador.', path: `/share/${token}/`, noindex: true });
    inject(Api).shared(token).then((d) => this.data.set(d), (e) => this.error.set(errorText(e, 'Share nao encontrado')));
  }
}
