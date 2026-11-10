import { ChangeDetectionStrategy, Component, WritableSignal, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, Track, errorText } from '../api/api';
import { PROVIDER_META, Provider, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { Cover, Icon } from '../shared/icon';
import { Seo } from '../shared/seo';
import { Jobs, Linked, Toast } from '../state';

// Same vocabularies as the original generator page.
const GENRES = ['Pop', 'Rock', 'Rap', 'Country', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'Blues', 'Reggae', 'Metal', 'Folk', 'Punk', 'Indie', 'Soul', 'R&B'];
const MOODS = ['Happy', 'Sad', 'Angry', 'Relaxed', 'Energetic', 'Romantic'];
const NAMES = ['Trap Royalty', 'Midnight Drip', 'Bassline Rebellion', 'Crown of the Streets', 'Luxe Vibes & Hard Knocks', 'Urban Anthems Unleashed', 'Hustle & Flow', 'Echoes of the Block'];

/** POST /generator/tracks (genres + moods + prompt) and POST /generator/save. */
@Component({
  selector: 'app-generator',
  imports: [RouterLink, Cover, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <p class="eyebrow">{{ t('gen.eyebrow') }}</p>
      <h1 class="h-page mt-3">{{ t('gen.title') }}</h1>
      <p class="mt-2 max-w-2xl text-ink-2">{{ t('gen.subtitle') }}</p>
    </header>

    <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <form class="card self-start p-5 sm:p-6" (submit)="generate($event, true)">
        <label class="label" for="gen-src">{{ t('gen.source') }}</label>
        <select id="gen-src" class="field" (change)="source.set($any($event.target).value)">
          @for (p of linked.providers(); track p) { <option [value]="p" [selected]="p === source()">{{ meta[p].label }}</option> }
        </select>

        <fieldset class="mt-5">
          <legend class="label">{{ t('gen.genres') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (g of genres; track g) { <button type="button" class="tag !px-2.5 !py-1 !text-[12px]" [class.tag-accent]="picked().has(g)" [attr.aria-pressed]="picked().has(g)" (click)="flip(picked, g)">{{ g }}</button> }
          </div>
        </fieldset>
        <fieldset class="mt-5">
          <legend class="label">{{ t('gen.moods') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (m of moods; track m) { <button type="button" class="tag !px-2.5 !py-1 !text-[12px]" [class.tag-accent]="feel().has(m)" [attr.aria-pressed]="feel().has(m)" (click)="flip(feel, m)">{{ t('gen.mood.' + m) }}</button> }
          </div>
        </fieldset>

        <label class="label mt-5" for="gen-prompt">{{ t('gen.prompt') }}</label>
        <input id="gen-prompt" class="field" maxlength="500" [placeholder]="t('gen.promptHint')" [value]="prompt()" (input)="prompt.set($any($event.target).value)" />

        <label class="label mt-5" for="gen-count">{{ t('gen.count') }}</label>
        <div class="seg" role="group" id="gen-count">
          @for (n of counts; track n) { <button type="button" [attr.aria-pressed]="count() === n" (click)="count.set(n)">{{ n }}</button> }
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary" [disabled]="busy() || !source()"><app-icon name="sparkle" [size]="16" /> {{ t(tracks().length ? 'gen.regenerate' : 'gen.generate') }}</button>
          @if (tracks().length) { <button type="button" class="btn btn-line" [disabled]="busy()" (click)="generate($event, false)"><app-icon name="plus" [size]="16" /> {{ t('gen.more') }}</button> }
        </div>
        <p class="mt-3 min-h-5 text-[13px] text-danger" role="alert">{{ error() }}</p>
      </form>

      <section aria-labelledby="sugestoes" aria-live="polite">
        <div class="flex items-center justify-between gap-3">
          <h2 id="sugestoes" class="text-[18px] font-medium tracking-[-0.02em]">{{ t('gen.results', { n: tracks().length }) }}</h2>
          @if (busy()) { <span class="eq live text-accent-hi" aria-hidden="true"><i></i><i></i><i></i></span> }
        </div>
        @if (queries().length) {
          <p class="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-dim">{{ t('gen.queries') }} @for (q of queries(); track q) { <span class="tag">{{ q }}</span> }</p>
        }
        @if (tracks().length) {
          <ol class="panel mt-4 max-h-[460px] divide-y divide-line overflow-y-auto scroll-thin">
            @for (tr of tracks(); track tr.id; let i = $index) {
              <li class="flex items-center gap-3 px-3 py-2">
                <span class="tracknum">{{ (i + 1).toString().padStart(2, '0') }}</span>
                <app-cover [name]="tr.album ?? tr.name" [size]="34" />
                <span class="min-w-0 flex-1"><span class="clamp-1 block text-[14px] font-medium">{{ tr.name }}</span><span class="clamp-1 block text-[12px] text-dim">{{ tr.artist }} · {{ tr.album }}</span></span>
                <button type="button" class="icon-btn h-8 w-8" [attr.aria-label]="t('gen.remove', { name: tr.name })" (click)="drop(tr.id)"><app-icon name="x" [size]="15" /></button>
              </li>
            }
          </ol>

          <form class="card mt-6 p-5" (submit)="save($event)">
            <h3 class="text-[16px] font-medium">{{ t('gen.saveTitle') }}</h3>
            <label class="label mt-4" for="gen-name">{{ t('wiz.name') }}</label>
            <input id="gen-name" class="field" maxlength="200" required [value]="name()" (input)="name.set($any($event.target).value)" />
            <div class="mt-2 flex flex-wrap gap-1.5">
              @for (n of names; track n) { <button type="button" class="tag hover:border-accent" (click)="name.set(n)">{{ n }}</button> }
            </div>
            <label class="label mt-4" for="gen-target">{{ t('gen.target') }}</label>
            <select id="gen-target" class="field" (change)="target.set($any($event.target).value)">
              @for (p of linked.providers(); track p) { <option [value]="p" [selected]="p === target()">{{ meta[p].label }}</option> }
            </select>
            <button type="submit" class="btn btn-primary mt-5" [disabled]="busy() || !name().trim()"><app-icon name="check" [size]="16" /> {{ t('gen.save', { service: label(target()) }) }}</button>
            @if (saved(); as s) {
              <p class="mt-4 rounded-lg bg-ok-soft px-3 py-2 text-[14px] text-ok">{{ t('gen.saved', { a: s.matched_count, b: s.total_count, service: label(target()) }) }} <a routerLink="/transferencias" class="font-medium underline">{{ t('nav.transfers') }}</a></p>
            }
          </form>
        } @else {
          <div class="panel mt-4 grid min-h-[260px] place-items-center p-8 text-center text-[14px] text-ink-2">{{ t('gen.emptyHint') }}</div>
        }
      </section>
    </div>
  `,
})
export class Generator {
  protected t = inject(I18n).t;
  private api = inject(Api);
  private toast = inject(Toast);
  private jobs = inject(Jobs);
  protected linked = inject(Linked);
  protected readonly meta = PROVIDER_META;
  protected readonly genres = GENRES;
  protected readonly moods = MOODS;
  protected readonly names = NAMES;
  protected readonly counts = [10, 20, 30];
  protected source = signal<Provider | null>(null);
  protected target = signal<Provider | null>(null);
  protected picked = signal(new Set<string>(['Rock']));
  protected feel = signal(new Set<string>(['Energetic']));
  protected prompt = signal('');
  protected count = signal(20);
  protected tracks = signal<Track[]>([]);
  protected queries = signal<string[]>([]);
  protected name = signal('Minha Playlist Gerada');
  protected busy = signal(false);
  protected error = signal('');
  protected saved = signal<{ matched_count: number; total_count: number } | null>(null);
  protected label = (p: Provider | null) => (p ? PROVIDER_META[p].label : '');

  constructor() {
    inject(Seo).set({ title: `Gerador de playlists | ${SITE_NAME}`, description: 'Gerador de playlists da demo do ITransferMusic: gêneros, humores e um prompt livre viram faixas reais do catálogo de exemplo.', path: '/gerador/', noindex: true });
    effect(() => {
      const first = this.linked.providers()[0];
      if (first && !this.source()) { this.source.set(first); this.target.set(first); }
    });
  }

  protected flip(sig: WritableSignal<Set<string>>, v: string) {
    const s = new Set(sig());
    s.has(v) ? s.delete(v) : s.add(v);
    sig.set(s);
  }
  protected drop(id: string) { this.tracks.update((l) => l.filter((x) => x.id !== id)); }

  /** replace=false is "Gerar mais": keeps the list and sends it as exclude_track_ids, like the original. */
  async generate(ev: Event, replace: boolean) {
    ev.preventDefault();
    this.busy.set(true);
    this.error.set('');
    this.saved.set(null);
    try {
      const r = await this.api.generate({
        source_provider: this.source()!, prompt: this.prompt().trim() || undefined, genres: [...this.picked()], moods: [...this.feel()],
        count: this.count(), exclude_track_ids: replace ? [] : this.tracks().map((x) => x.id),
      });
      this.tracks.set(replace ? r.tracks : [...this.tracks(), ...r.tracks]);
      this.queries.set(r.used_queries);
      if (!r.tracks.length) this.error.set(this.t('gen.noMore'));
    } catch (e) { this.error.set(errorText(e, this.t('gen.failed'))); }
    this.busy.set(false);
  }

  async save(ev: Event) {
    ev.preventDefault();
    this.busy.set(true);
    try {
      const r = await this.api.saveGenerated({
        target_provider: this.target()!, playlist_name: this.name().trim(),
        tracks: this.tracks().map(({ id, name, artist, album }) => ({ id, name, artist, album })),
      });
      this.saved.set(r);
      this.toast.say(this.t('gen.saved', { a: r.matched_count, b: r.total_count, service: this.label(this.target()) }));
      this.jobs.load();
    } catch (e) { this.error.set(errorText(e, this.t('gen.failed'))); }
    this.busy.set(false);
  }
}
