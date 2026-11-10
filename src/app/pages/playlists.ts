import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, PlaylistSummary, Track, errorText } from '../api/api';
import { PROVIDER_META, Provider, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { Cover, Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { Linked } from '../state';

/** Browse each linked service's library (GET /playlists/{provider}, /playlists/{provider}/{id}/tracks). */
@Component({
  selector: 'app-playlists',
  imports: [RouterLink, Cover, Icon, ProviderBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <p class="eyebrow">{{ t('pl.eyebrow') }}</p>
      <h1 class="h-page mt-3">{{ t('pl.title') }}</h1>
      <p class="mt-2 text-ink-2">{{ t('pl.subtitle') }}</p>
    </header>

    @if (linked.loaded() && !linked.providers().length) {
      <div class="panel mt-8 p-8 text-center"><p class="text-ink-2">{{ t('pl.none') }}</p><a routerLink="/conexoes" class="btn btn-primary mt-4">{{ t('nav.connections') }}</a></div>
    } @else {
      <div class="mt-7 overflow-x-auto pb-1">
        <div class="seg" role="group" [attr.aria-label]="t('pl.services')">
          @for (p of linked.providers(); track p) {
            <button type="button" [attr.aria-pressed]="provider() === p" (click)="pick(p)"><app-provider [provider]="p" [size]="16" /> {{ meta[p].label }}</button>
          }
        </div>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section [attr.aria-label]="t('pl.list')">
          <label class="sr-only" for="pl-busca">{{ t('pl.search') }}</label>
          <input id="pl-busca" class="field" type="search" [placeholder]="t('pl.search')" [value]="query()" (input)="query.set($any($event.target).value)" />
          @if (error()) { <p class="mt-4 text-[14px] text-danger" role="alert">{{ error() }}</p> }
          <ul class="mt-4 space-y-2">
            @for (pl of filtered(); track pl.id) {
              <li>
                <button type="button" class="panel flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-line-2" [class.!border-accent]="pl.id === selectedId()" [attr.aria-pressed]="pl.id === selectedId()" (click)="open(pl)">
                  <app-cover [name]="pl.name" [size]="46" />
                  <span class="min-w-0 flex-1">
                    <span class="clamp-1 block text-[14.5px] font-medium">{{ pl.name }}</span>
                    <span class="clamp-1 block text-[12.5px] text-dim">{{ pl.id.startsWith('__') ? t('pl.library') : (pl.description ?? meta[pl.provider].label) }}</span>
                  </span>
                  <span class="mono text-[12px] text-ink-2">{{ pl.track_count }}</span>
                </button>
              </li>
            } @empty { @if (!loading()) { <li class="text-[14px] text-ink-2">{{ t('pl.empty') }}</li> } }
          </ul>
        </section>

        <section class="lg:sticky lg:top-6 lg:self-start" aria-live="polite">
          @if (selected(); as pl) {
            <div class="card p-5">
              <div class="flex items-center gap-4">
                <app-cover [name]="pl.name" [size]="72" />
                <div class="min-w-0 flex-1">
                  <p class="eyebrow text-[10px]">{{ meta[pl.provider].label }}</p>
                  <h2 class="mt-2 text-[20px] font-medium leading-tight tracking-[-0.02em]">{{ pl.name }}</h2>
                  <p class="mt-1 text-[13px] text-dim">{{ t('common.tracksN', { n: pl.track_count }) }}</p>
                </div>
              </div>
              <a routerLink="/transferir" [queryParams]="{ de: pl.provider, playlist: pl.id }" class="btn btn-primary btn-sm mt-4"><app-icon name="transfer" [size]="15" /> {{ t('pl.transfer') }}</a>
              <ol class="mt-5 max-h-[520px] divide-y divide-line overflow-y-auto rounded-xl border border-line scroll-thin">
                @for (tr of tracks(); track tr.id; let i = $index) {
                  <li class="flex items-center gap-3 px-3 py-2">
                    <span class="tracknum">{{ (i + 1).toString().padStart(2, '0') }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="clamp-1 block text-[14px]">{{ tr.name }}</span>
                      <span class="clamp-1 block text-[12px] text-dim">{{ tr.artist }} · {{ tr.album }}</span>
                    </span>
                  </li>
                } @empty { <li class="px-3 py-6 text-center text-[13px] text-dim">{{ t('common.loading') }}</li> }
              </ol>
            </div>
          } @else {
            <div class="panel grid min-h-[240px] place-items-center p-8 text-center text-[14px] text-ink-2">{{ t('pl.pick') }}</div>
          }
        </section>
      </div>
    }
  `,
})
export class Playlists {
  protected t = inject(I18n).t;
  private api = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected linked = inject(Linked);
  protected readonly meta = PROVIDER_META;
  protected provider = signal<Provider | null>(null);
  protected playlists = signal<PlaylistSummary[]>([]);
  protected tracks = signal<Track[]>([]);
  protected selectedId = signal<string | null>(null);
  protected query = signal('');
  protected loading = signal(false);
  protected error = signal('');
  protected selected = computed(() => this.playlists().find((p) => p.id === this.selectedId()) ?? null);
  protected filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.playlists().filter((p) => p.name.toLowerCase().includes(q)) : this.playlists();
  });

  constructor() {
    inject(Seo).set({ title: `Playlists | ${SITE_NAME}`, description: 'Bibliotecas de playlists de cada serviço vinculado na demo do ITransferMusic, com as faixas de cada uma.', path: '/playlists/', noindex: true });
    const q = this.route.snapshot.queryParamMap;
    // Pick the service from the URL, or the first linked one once accounts are loaded.
    effect(() => {
      if (this.provider() || !this.linked.loaded()) return;
      const want = q.get('servico') as Provider | null;
      const p = want && this.linked.has(want) ? want : this.linked.providers()[0];
      if (p) this.pick(p, q.get('playlist'));
    });
  }

  async pick(p: Provider, playlist: string | null = null) {
    this.provider.set(p);
    this.selectedId.set(null);
    this.tracks.set([]);
    this.loading.set(true);
    this.error.set('');
    this.router.navigate([], { queryParams: { servico: p, playlist }, replaceUrl: true });
    try {
      this.playlists.set(await this.api.playlists(p));
      const pl = this.playlists().find((x) => x.id === playlist);
      if (pl) this.open(pl);
    } catch (e) { this.error.set(errorText(e, this.t('pl.failed'))); }
    this.loading.set(false);
  }

  async open(pl: PlaylistSummary) {
    this.selectedId.set(pl.id);
    this.tracks.set([]);
    this.router.navigate([], { queryParams: { servico: pl.provider, playlist: pl.id }, replaceUrl: true });
    try { this.tracks.set(await this.api.tracks(pl.provider, pl.id)); } catch (e) { this.error.set(errorText(e, this.t('pl.failed'))); }
  }
}
