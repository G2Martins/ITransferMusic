import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, PlaylistSummary, Track, TransferPreview, TransferTrackResult, errorText } from '../api/api';
import { PROVIDERS, PROVIDER_META, Provider, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { pct } from '../shared/format';
import { Cover, Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { TrackRow } from '../shared/tracks';
import { Jobs, Linked, Toast } from '../state';

interface Draft {
  pl: PlaylistSummary;
  tracks: Track[] | null;
  /** null = every track (the API's selected_track_ids = null). */
  picked: Set<string> | null;
  open: boolean;
  name: string;
  description: string;
  watermark: boolean;
}
type Filter = 'all' | 'review' | 'missing';
const STEPS = ['source', 'target', 'pick', 'preview', 'run'] as const;

/** The transfer wizard: source → destination → playlists/tracks → match preview → run (POST /transfers per playlist). */
@Component({
  selector: 'app-wizard',
  imports: [NgTemplateOutlet, RouterLink, Cover, Icon, ProviderBadge, TrackRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <p class="eyebrow">{{ t('wiz.eyebrow') }}</p>
      <h1 class="h-page mt-3">{{ t('wiz.title') }}</h1>
    </header>

    <!-- Stepper -->
    <ol class="mt-7 grid grid-cols-5 gap-2" [attr.aria-label]="t('wiz.steps')">
      @for (s of steps; track s; let i = $index) {
        <li>
          <button type="button" class="w-full text-left disabled:cursor-default" [disabled]="i + 1 > reachable()" [attr.aria-current]="step() === i + 1 ? 'step' : null" (click)="go(i + 1)">
            <span class="block h-1 rounded-full" [class]="step() > i + 1 ? 'bg-accent' : step() === i + 1 ? 'bg-accent-hi' : 'bg-line'"></span>
            <span class="mt-2 hidden items-center gap-1.5 text-[12.5px] sm:flex" [class.text-ink]="step() === i + 1" [class.font-medium]="step() === i + 1" [class.text-dim]="step() !== i + 1">
              <span class="mono text-[11px]">0{{ i + 1 }}</span> {{ t('wiz.step.' + s) }}
            </span>
          </button>
        </li>
      }
    </ol>
    <p class="mt-2 text-[13px] text-dim sm:hidden">{{ t('wiz.stepOf', { n: step(), total: 5 }) }} · {{ t('wiz.step.' + steps[step() - 1]) }}</p>

    <section class="mt-8" aria-labelledby="passo">
      <h2 id="passo" tabindex="-1" class="text-[20px] font-medium tracking-[-0.02em] outline-none">{{ t('wiz.h.' + steps[step() - 1], { source: label(source()), target: label(target()) }) }}</h2>
      @if (error()) { <p class="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[14px] text-danger" role="alert">{{ error() }}</p> }

      @switch (step()) {
        @case (1) { <ng-container *ngTemplateOutlet="services; context: { mode: 'source' }" /> }
        @case (2) { <ng-container *ngTemplateOutlet="services; context: { mode: 'target' }" /> }
        @case (3) {
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <label class="sr-only" for="wz-busca">{{ t('pl.search') }}</label>
            <input id="wz-busca" class="field max-w-xs" type="search" [placeholder]="t('pl.search')" [value]="query()" (input)="query.set($any($event.target).value)" />
            <label class="flex items-center gap-2 text-[14px]"><input type="checkbox" [checked]="allPicked()" (change)="pickAll($any($event.target).checked)" /> {{ t('wiz.selectAll') }}</label>
            <span class="ml-auto tag tag-accent">{{ t('wiz.counter', { p: drafts().size, n: selectedTracks() }) }}</span>
          </div>
          @if (loading()) { <p class="mt-6 text-ink-2">{{ t('common.loading') }}</p> }
          @for (group of groups(); track group.key) {
            @if (group.items.length) {
              <p class="eyebrow mt-7">{{ t(group.key) }}</p>
              <ul class="mt-3 space-y-2">
                @for (pl of group.items; track pl.id) {
                  @let d = drafts().get(pl.id);
                  <li class="panel overflow-hidden" [class.!border-accent]="!!d">
                    <div class="flex items-center gap-3 p-3">
                      <input type="checkbox" class="h-4 w-4" [id]="'pl-' + pl.id" [checked]="!!d" (change)="toggle(pl)" />
                      <label [for]="'pl-' + pl.id" class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <app-cover [name]="pl.name" [size]="42" />
                        <span class="min-w-0">
                          <span class="clamp-1 block text-[14.5px] font-medium">{{ pl.name }}</span>
                          <span class="block text-[12.5px] text-dim">{{ d ? t('wiz.ofTracks', { a: count(d), b: pl.track_count }) : t('common.tracksN', { n: pl.track_count }) }}</span>
                        </span>
                      </label>
                      @if (d) {
                        <button type="button" class="btn btn-ghost btn-sm" [attr.aria-expanded]="d.open" (click)="expand(d)">{{ t('wiz.chooseTracks') }} <app-icon name="chevron-down" [size]="15" [class.rotate-180]="d.open" /></button>
                      }
                    </div>
                    @if (d?.open) {
                      <div class="border-t border-line bg-well/50 px-3 py-3">
                        @if (!d!.tracks) { <p class="text-[13px] text-dim">{{ t('common.loading') }}</p> }
                        @else {
                          <label class="flex items-center gap-2 text-[13.5px] font-medium"><input type="checkbox" [checked]="!d!.picked || d!.picked.size === d!.tracks.length" (change)="allTracks(d!, $any($event.target).checked)" /> {{ t('wiz.allTracks') }}</label>
                          <ul class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                            @for (tr of d!.tracks; track tr.id) {
                              <li><label class="flex items-center gap-2 py-0.5 text-[13.5px]"><input type="checkbox" [checked]="!d!.picked || d!.picked.has(tr.id)" (change)="toggleTrack(d!, tr.id)" /> <span class="clamp-1">{{ tr.name }} <span class="text-dim">· {{ tr.artist }}</span></span></label></li>
                            }
                          </ul>
                        }
                      </div>
                    }
                  </li>
                }
              </ul>
            }
          }
        }
        @case (4) {
          @if (loading()) { <p class="mt-6 flex items-center gap-2 text-ink-2"><span class="eq live text-accent-hi"><i></i><i></i><i></i></span> {{ t('wiz.matching', { target: label(target()) }) }}</p> }
          @else if (previewMissing()) {
            <p class="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-[14px] text-warn">{{ t('wiz.noPreview') }}</p>
          } @else {
            <div class="mt-5 flex flex-wrap items-center gap-3">
              <div class="seg" role="group" [attr.aria-label]="t('wiz.filter')">
                @for (f of filters; track f) { <button type="button" [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">{{ t('wiz.f.' + f) }}</button> }
              </div>
              <span class="text-[13px] text-dim">{{ t('wiz.legend') }}</span>
            </div>
            <div class="mt-5 space-y-5">
              @for (d of draftList(); track d.pl.id) {
                @let p = previews().get(d.pl.id);
                @if (p) {
                  <article class="card p-4 sm:p-5">
                    <div class="flex flex-wrap items-center gap-3">
                      <app-cover [name]="d.pl.name" [size]="44" />
                      <div class="min-w-0 flex-1">
                        <h3 class="clamp-1 text-[16px] font-medium">{{ d.pl.name }}</h3>
                        <p class="text-[13px] text-ink-2">{{ t('wiz.found', { a: p.matched_tracks, b: p.total_tracks, target: label(target()) }) }}</p>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <span class="tag tag-ok">{{ t('match.high') }} {{ levels(p).high }}</span>
                        <span class="tag tag-warn">{{ t('match.medium') }} {{ levels(p).medium }}</span>
                        @if (levels(p).low) { <span class="tag tag-bad">{{ t('match.low') }} {{ levels(p).low }}</span> }
                        <span class="tag tag-bad">{{ t('match.none') }} {{ p.total_tracks - p.matched_tracks }}</span>
                      </div>
                    </div>
                    <div class="mt-4 flex items-center gap-3">
                      <div class="meter flex-1" [class.ok]="p.matched_tracks === p.total_tracks" [style.--p]="p.total_tracks ? p.matched_tracks / p.total_tracks : 0"><i></i></div>
                      <span class="mono text-[11.5px] text-ink-2">{{ pct(p.matched_tracks, p.total_tracks) }}%</span>
                    </div>
                    <ol class="mt-4 max-h-[420px] divide-y divide-line overflow-y-auto rounded-xl border border-line scroll-thin">
                      @for (r of shown(p); track r.r.source_track_id) { <li><app-track-row [r]="r.r" [n]="r.n" [target]="target()!" /></li> }
                      @empty { <li class="px-3 py-5 text-center text-[13px] text-dim">{{ t('wiz.nothing') }}</li> }
                    </ol>
                  </article>
                }
              }
            </div>
          }
        }
        @case (5) {
          <div class="mt-5 space-y-4">
            @for (d of draftList(); track d.pl.id) {
              <article class="panel p-4 sm:p-5">
                <div class="flex items-center gap-3">
                  <app-cover [name]="d.pl.name" [size]="40" />
                  <p class="min-w-0 flex-1 text-[14px]"><span class="font-medium">{{ d.pl.name }}</span> <span class="text-dim">· {{ t('wiz.ofTracks', { a: count(d), b: d.pl.track_count }) }}</span></p>
                  <span class="flex items-center gap-1.5"><app-provider [provider]="source()!" [size]="18" [labeled]="true" /><app-icon name="arrow-right" [size]="13" class="text-dim" /><app-provider [provider]="target()!" [size]="18" [labeled]="true" /></span>
                </div>
                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="label" [for]="'nm-' + d.pl.id">{{ t('wiz.name') }}</label>
                    <input class="field" [id]="'nm-' + d.pl.id" maxlength="200" [value]="d.name" (input)="edit(d, 'name', $any($event.target).value)" [attr.aria-invalid]="!d.name.trim() ? 'true' : null" />
                  </div>
                  <div>
                    <label class="label" [for]="'ds-' + d.pl.id">{{ t('wiz.description') }}</label>
                    <input class="field" [id]="'ds-' + d.pl.id" maxlength="500" [value]="d.description" (input)="edit(d, 'description', $any($event.target).value)" />
                  </div>
                </div>
                <label class="mt-4 flex items-center gap-2 text-[14px]"><input type="checkbox" [checked]="d.watermark" (change)="edit(d, 'watermark', $any($event.target).checked)" /> {{ t('wiz.watermark') }}</label>
                <p class="mt-2 text-[12.5px] text-dim">{{ t('wiz.finalName') }} <span class="mono text-ink-2">{{ d.name.trim() + (d.watermark ? ' By ITransferMusic' : '') }}</span></p>
              </article>
            }
          </div>
        }
      }

      <!-- Footer navigation -->
      <div class="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
        @if (step() > 1) { <button type="button" class="btn btn-line" (click)="go(step() - 1)"><app-icon name="arrow-left" [size]="16" /> {{ t('common.back') }}</button> } @else { <a routerLink="/painel" class="btn btn-ghost">{{ t('common.cancel') }}</a> }
        @if (step() < 5) {
          <button type="button" class="btn btn-primary" [disabled]="!canAdvance()" (click)="go(step() + 1)">{{ t('common.next') }} <app-icon name="arrow-right" [size]="16" /></button>
        } @else {
          <button type="button" class="btn btn-primary" [disabled]="busy() || !canAdvance()" (click)="start()"><app-icon name="play" [size]="15" /> {{ t('wiz.start', { n: drafts().size }) }}</button>
        }
      </div>
    </section>

    <ng-template #services let-mode="mode">
      <ul class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (p of providers; track p) {
          @let isSource = mode === 'target' && p === source();
          <li>
            @if (linked.has(p)) {
              <button type="button" class="card flex w-full items-center gap-3 p-4 text-left transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-50"
                      [disabled]="isSource" [attr.aria-pressed]="(mode === 'source' ? source() : target()) === p" [class.!border-accent]="(mode === 'source' ? source() : target()) === p"
                      (click)="choose(mode, p)">
                <app-provider [provider]="p" [size]="36" />
                <span class="flex-1"><span class="block font-medium">{{ meta[p].label }}</span><span class="text-[12.5px] text-dim">{{ isSource ? t('wiz.isSource') : t('conn.connected') }}</span></span>
                @if ((mode === 'source' ? source() : target()) === p) { <app-icon name="check" class="text-accent" /> }
              </button>
            } @else {
              <div class="panel flex items-center gap-3 border-dashed p-4">
                <app-provider [provider]="p" [size]="36" />
                <span class="flex-1"><span class="block font-medium">{{ meta[p].label }}</span><span class="text-[12.5px] text-dim">{{ t('wiz.notLinked') }}</span></span>
                <button type="button" class="btn btn-line btn-sm" (click)="connect(mode, p)">{{ t('conn.connect') }}</button>
              </div>
            }
          </li>
        }
      </ul>
    </ng-template>
  `,
})
export class Wizard {
  protected t = inject(I18n).t;
  private api = inject(Api);
  private router = inject(Router);
  private toast = inject(Toast);
  private jobs = inject(Jobs);
  protected linked = inject(Linked);
  protected readonly steps = STEPS;
  protected readonly providers = PROVIDERS;
  protected readonly meta = PROVIDER_META;
  protected readonly filters: Filter[] = ['all', 'review', 'missing'];
  protected readonly pct = pct;

  protected step = signal(1);
  protected source = signal<Provider | null>(null);
  protected target = signal<Provider | null>(null);
  protected playlists = signal<PlaylistSummary[]>([]);
  protected drafts = signal(new Map<string, Draft>());
  protected previews = signal(new Map<string, TransferPreview>());
  protected previewMissing = signal(false);
  protected filter = signal<Filter>('all');
  protected query = signal('');
  protected loading = signal(false);
  protected busy = signal(false);
  protected error = signal('');

  protected draftList = computed(() => [...this.drafts().values()]);
  protected filteredPlaylists = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.playlists().filter((p) => p.name.toLowerCase().includes(q)) : this.playlists();
  });
  protected groups = computed(() => [
    { key: 'wiz.personal', items: this.filteredPlaylists().filter((p) => p.id.startsWith('__')) },
    { key: 'wiz.playlists', items: this.filteredPlaylists().filter((p) => !p.id.startsWith('__')) },
  ]);
  protected allPicked = computed(() => this.filteredPlaylists().length > 0 && this.filteredPlaylists().every((p) => this.drafts().has(p.id)));
  protected selectedTracks = computed(() => this.draftList().reduce((s, d) => s + this.count(d), 0));
  protected reachable = computed(() => {
    if (!this.source()) return 1;
    if (!this.target()) return 2;
    if (!this.drafts().size || !this.selectedTracks()) return 3;
    return this.previews().size || this.previewMissing() ? 5 : 4;
  });
  protected canAdvance = computed(() => {
    switch (this.step()) {
      case 1: return !!this.source();
      case 2: return !!this.target() && this.target() !== this.source();
      case 3: return this.drafts().size > 0 && this.selectedTracks() > 0;
      case 4: return !this.loading();
      default: return this.draftList().every((d) => d.name.trim().length > 0) && this.drafts().size > 0;
    }
  });

  constructor() {
    inject(Seo).set({ title: `Nova transferência | ${SITE_NAME}`, description: 'Assistente de transferência da demo do ITransferMusic: origem, destino, playlists, pré-visualização do matching e execução.', path: '/transferir/', noindex: true });
    const q = inject(ActivatedRoute).snapshot.queryParamMap;
    let applied = false;
    // Preselect from ?de=&para=&playlist= (popular conversions, playlist browser, return from OAuth).
    effect(() => {
      if (applied || !this.linked.loaded()) return;
      applied = true;
      const de = q.get('de') as Provider | null, para = q.get('para') as Provider | null;
      if (de && this.linked.has(de)) this.source.set(de);
      if (para && para !== de && this.linked.has(para)) this.target.set(para);
      if (this.source() && this.target()) this.go(3, q.get('playlist'));
      else if (this.source()) this.step.set(2);
    });
  }

  protected label = (p: Provider | null) => (p ? PROVIDER_META[p].label : '');
  protected count = (d: Draft) => (d.picked ? d.picked.size : d.tracks?.length ?? d.pl.track_count ?? 0);

  protected choose(mode: 'source' | 'target', p: Provider) {
    if (mode === 'source') {
      if (this.source() !== p) { this.drafts.set(new Map()); this.previews.set(new Map()); this.playlists.set([]); }
      this.source.set(p);
      if (this.target() === p) this.target.set(null);
    } else {
      if (this.target() !== p) this.previews.set(new Map());
      this.target.set(p);
    }
  }

  protected async connect(mode: 'source' | 'target', p: Provider) {
    const params = new URLSearchParams(mode === 'source' ? { de: p } : { de: this.source() ?? '', para: p });
    try { await this.linked.connect(p, `/transferir?${params}`); } catch (e) { this.error.set(errorText(e, this.t('conn.failed'))); }
  }

  protected async go(n: number, preselect: string | null = null) {
    this.error.set('');
    this.step.set(n);
    setTimeout(() => document.getElementById('passo')?.focus());
    if (n === 3 && !this.playlists().length) await this.loadPlaylists(preselect);
    if (n === 4) await this.loadPreviews();
  }

  private async loadPlaylists(preselect: string | null) {
    this.loading.set(true);
    try {
      this.playlists.set(await this.api.playlists(this.source()!));
      const pl = this.playlists().find((p) => p.id === preselect);
      if (pl) this.toggle(pl);
    } catch (e) { this.error.set(errorText(e, this.t('pl.failed'))); }
    this.loading.set(false);
  }

  private draft(pl: PlaylistSummary): Draft {
    return { pl, tracks: null, picked: null, open: false, name: this.t('wiz.defaultName', { name: pl.name }), description: '', watermark: true };
  }
  private update(fn: (m: Map<string, Draft>) => void) {
    const m = new Map(this.drafts());
    fn(m);
    this.drafts.set(m);
    this.previews.set(new Map());
    this.previewMissing.set(false);
  }

  protected toggle(pl: PlaylistSummary) {
    this.update((m) => (m.has(pl.id) ? m.delete(pl.id) : m.set(pl.id, this.draft(pl))));
  }
  protected pickAll(on: boolean) {
    this.update((m) => { m.clear(); if (on) for (const pl of this.filteredPlaylists()) m.set(pl.id, this.drafts().get(pl.id) ?? this.draft(pl)); });
  }
  protected async expand(d: Draft) {
    this.drafts.update((m) => new Map(m).set(d.pl.id, { ...d, open: !d.open }));
    if (d.tracks) return;
    try {
      const tracks = await this.api.tracks(this.source()!, d.pl.id);
      this.drafts.update((m) => { const cur = m.get(d.pl.id); return cur ? new Map(m).set(d.pl.id, { ...cur, tracks }) : m; });
    } catch (e) { this.error.set(errorText(e, this.t('pl.failed'))); }
  }
  protected toggleTrack(d: Draft, id: string) {
    const picked = new Set(d.picked ?? d.tracks!.map((x) => x.id));
    picked.has(id) ? picked.delete(id) : picked.add(id);
    this.update((m) => m.set(d.pl.id, { ...d, picked: picked.size === d.tracks!.length ? null : picked }));
  }
  protected allTracks(d: Draft, on: boolean) {
    this.update((m) => m.set(d.pl.id, { ...d, picked: on ? null : new Set() }));
  }
  protected edit(d: Draft, key: 'name' | 'description' | 'watermark', value: string | boolean) {
    this.drafts.update((m) => new Map(m).set(d.pl.id, { ...d, [key]: value }));
  }

  private body(d: Draft) {
    return {
      source_provider: this.source()!, target_provider: this.target()!, source_playlist_id: d.pl.id, source_playlist_name: d.pl.name,
      target_playlist_name: d.name.trim(), target_playlist_description: d.description.trim() || undefined,
      selected_track_ids: d.picked ? [...d.picked] : null, apply_watermark: d.watermark,
    };
  }

  /** POST /transfers/preview per playlist (demo extension). The real FastAPI has no preview: the step says so. */
  private async loadPreviews() {
    if (this.previews().size) return;
    this.loading.set(true);
    try {
      const out = new Map<string, TransferPreview>();
      for (const d of this.draftList()) out.set(d.pl.id, await this.api.preview(this.body(d)));
      this.previews.set(out);
    } catch (e) {
      if ((e as { status?: number }).status === 404 || (e as { status?: number }).status === 405) this.previewMissing.set(true);
      else this.error.set(errorText(e, this.t('wiz.failed')));
    }
    this.loading.set(false);
  }

  protected levels(p: TransferPreview) {
    const m = p.results.filter((r) => r.matched).map((r) => (r.confidence ?? 1) * 100);
    return { high: m.filter((c) => c >= 90).length, medium: m.filter((c) => c >= 75 && c < 90).length, low: m.filter((c) => c < 75).length };
  }
  protected shown(p: TransferPreview): { r: TransferTrackResult; n: number }[] {
    const all = p.results.map((r, i) => ({ r, n: i + 1 }));
    const f = this.filter();
    if (f === 'missing') return all.filter((x) => !x.r.matched);
    if (f === 'review') return all.filter((x) => !x.r.matched || (x.r.confidence ?? 1) < 0.9);
    return all;
  }

  protected async start() {
    this.busy.set(true);
    this.error.set('');
    try {
      for (const d of this.draftList()) await this.api.createTransfer(this.body(d));
      this.toast.say(this.t('wiz.started', { n: this.drafts().size }));
      await this.jobs.load();
      await this.router.navigateByUrl('/transferencias');
    } catch (e) {
      this.error.set(errorText(e, this.t('wiz.failed')));
    }
    this.busy.set(false);
  }
}
