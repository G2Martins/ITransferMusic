import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, PlaylistSync, SchedulerView, TransferResponse, errorText } from '../api/api';
import { DEMO } from '../api/demo-api';
import { PROVIDER_META, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { TIMEZONES, clockAt, fmtDateTime, fmtOffset, fmtRelative, pad2, utcToLocal } from '../shared/format';
import { Cover, Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { SyncSetup } from '../shared/sync-setup';
import { StatusTag } from '../shared/tracks';
import { Jobs, Session, Toast } from '../state';

/** Syncs (GET/POST/PATCH/DELETE /syncs, POST /syncs/{id}/run) and the simulated APScheduler job behind them. */
@Component({
  selector: 'app-syncs',
  imports: [RouterLink, Cover, Icon, ProviderBadge, StatusTag, SyncSetup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">{{ t('sync.eyebrow') }}</p>
        <h1 class="h-page mt-3">{{ t('sync.title') }}</h1>
        <p class="mt-2 max-w-2xl text-ink-2">{{ t('sync.subtitle') }}</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openPicker()"><app-icon name="plus" [size]="17" /> {{ t('sync.new') }}</button>
    </header>

    <div class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section aria-labelledby="lista">
        <h2 id="lista" class="sr-only">{{ t('sync.list') }}</h2>
        <ul class="space-y-4">
          @for (s of syncs(); track s.id) {
            <li class="card p-4 sm:p-5">
              <div class="flex flex-wrap items-center gap-3">
                <app-cover [name]="s.source_playlist_name ?? s.source_playlist_id" [size]="44" />
                <div class="min-w-0 flex-1">
                  <p class="clamp-1 text-[15px] font-medium">{{ s.source_playlist_name ?? s.source_playlist_id }}</p>
                  <p class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-dim">
                    <app-provider [provider]="s.source_provider" [size]="16" [labeled]="true" /> <app-icon name="sync" [size]="12" /> <app-provider [provider]="s.target_provider" [size]="16" [labeled]="true" />
                    <span class="clamp-1">{{ s.target_playlist_name }}</span>
                  </p>
                </div>
                <app-status [status]="s.status" />
                <label class="switch" [attr.title]="t(s.status === 'active' ? 'sync.pause' : 'sync.resume')">
                  <input type="checkbox" [checked]="s.status === 'active'" [attr.aria-label]="t('sync.toggle', { name: s.source_playlist_name })" (change)="toggle(s)" />
                  <span></span>
                </label>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                <div><dt class="text-dim">{{ t('sync.when') }}</dt><dd>{{ t('setup.' + s.frequency) }} · {{ local(s) }}</dd></div>
                <div><dt class="text-dim">{{ t('setup.method') }}</dt><dd>{{ t('setup.' + s.method) }}</dd></div>
                <div><dt class="text-dim">{{ t('sync.last') }}</dt><dd>{{ s.last_synced_at ? rel(s.last_synced_at) : t('sync.never') }}@if (s.last_synced_at) { · +{{ s.tracks_added_last_run }} }</dd></div>
                <div><dt class="text-dim">{{ t('sync.next') }}</dt><dd>{{ next(s) }}</dd></div>
              </dl>
              @if (s.last_error) { <p class="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">{{ s.last_error }}</p> }
              <div class="mt-4 flex flex-wrap gap-2">
                <button type="button" class="btn btn-line btn-sm" [disabled]="busy() === s.id" (click)="run(s)"><app-icon name="play" [size]="14" /> {{ t('sync.runNow') }}</button>
                <button type="button" class="btn btn-ghost btn-sm" [attr.aria-label]="t('sync.remove', { name: s.source_playlist_name })" (click)="remove(s)"><app-icon name="trash" [size]="15" /> {{ t('sync.removeShort') }}</button>
              </div>
            </li>
          } @empty {
            <li class="panel p-8 text-center">
              <p class="font-medium">{{ t('sync.empty') }}</p>
              <p class="mx-auto mt-2 max-w-md text-[14px] text-ink-2">{{ t('sync.emptyHint') }}</p>
            </li>
          }
        </ul>
      </section>

      <!-- The scheduler, as the server would see it -->
      <aside class="dark-panel self-start p-5 sm:p-6" aria-labelledby="agendador">
        <div class="flex items-center justify-between gap-3">
          <p class="eyebrow text-plum-ink/80">APScheduler · AsyncIOScheduler</p>
          <span class="live-dot h-2 w-2 rounded-full bg-accent-hi" aria-hidden="true"></span>
        </div>
        <h2 id="agendador" class="mt-3 text-[20px] font-medium tracking-[-0.02em] text-white">{{ t('sync.schedTitle') }}</h2>
        @if (sched(); as v) {
          @for (j of v.jobs; track j.id) {
            <dl class="mt-5 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-[12px]">
              <div class="flex justify-between gap-3"><dt class="text-plum-ink/60">id</dt><dd class="text-white">{{ j.id }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-plum-ink/60">func</dt><dd class="clamp-1 text-plum-ink">{{ j.func }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-plum-ink/60">trigger</dt><dd class="text-accent-lite">{{ j.trigger }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-plum-ink/60">timezone</dt><dd class="text-plum-ink">{{ j.timezone }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-plum-ink/60">next_run_time</dt><dd class="text-white">{{ clock(j.next_run_time) }} <span class="text-plum-ink/70">({{ countdown() }})</span></dd></div>
              <div class="flex justify-between gap-3"><dt class="text-plum-ink/60">last_run</dt><dd class="text-plum-ink">{{ j.last_run_time ? clock(j.last_run_time) : '-' }}</dd></div>
            </dl>
          }
          <p class="mt-3 text-[12.5px] leading-relaxed text-plum-ink/75">{{ t(demo ? 'sync.schedNote' : 'sync.schedNoteApi') }}</p>
          <h3 class="mt-6 text-[13px] font-medium text-white">{{ t('sync.log') }}</h3>
          <ol class="mt-3 space-y-2">
            @for (r of v.runs.slice(0, 8); track r.at + r.sync_id) {
              <li class="flex gap-3 text-[12.5px]">
                <span class="mono w-[84px] shrink-0 text-plum-ink/60">{{ short(r.at) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="clamp-1 block text-plum-ink">{{ r.label }}</span>
                  <span class="text-plum-ink/60">{{ r.trigger === 'cron' ? 'cron' : t('sync.manual') }} · @if (r.ok) { +{{ r.added }}@if (r.removed) { / -{{ r.removed }} } } @else { <span class="text-accent-lite">{{ t('status.error') }}</span> }</span>
                </span>
              </li>
            } @empty { <li class="text-[12.5px] text-plum-ink/60">{{ t('sync.noRuns') }}</li> }
          </ol>
        } @else {
          <p class="mt-4 text-[13px] text-plum-ink/75">{{ t(demo ? 'common.loading' : 'sync.schedNoteApi') }}</p>
        }
        <div class="mt-6 border-t border-white/10 pt-4">
          <label class="text-[12.5px] text-plum-ink/80" for="tz">{{ t('sync.tz') }}</label>
          <select id="tz" class="field mt-1.5 !border-white/15 !bg-plum-2 !text-white" (change)="setTz(+$any($event.target).value)">
            @for (z of zones; track z.label) { <option [value]="z.offset" [selected]="z.offset === offset()">{{ z.label }}</option> }
          </select>
        </div>
      </aside>
    </div>

    <dialog #picker class="sheet" aria-labelledby="pick-title">
      <div class="p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 id="pick-title" class="text-[20px] font-medium tracking-[-0.02em]">{{ t('sync.pickTitle') }}</h2>
            <p class="mt-1 text-[14px] text-ink-2">{{ t('sync.pickText') }}</p>
          </div>
          <button type="button" class="icon-btn" [attr.aria-label]="t('common.close')" (click)="picker.close()"><app-icon name="x" /></button>
        </div>
        <ul class="mt-5 max-h-[55dvh] space-y-2 overflow-y-auto scroll-thin">
          @for (j of eligible(); track j.id) {
            <li>
              <button type="button" class="panel flex w-full items-center gap-3 p-3 text-left hover:border-accent" (click)="picker.close(); setup.open(j)">
                <app-provider [provider]="j.source_provider" [size]="20" [labeled]="true" /><app-icon name="arrow-right" [size]="13" class="text-dim" /><app-provider [provider]="j.target_provider" [size]="20" [labeled]="true" />
                <span class="min-w-0 flex-1"><span class="clamp-1 block text-[14px] font-medium">{{ j.target_playlist_name }}</span><span class="text-[12.5px] text-dim">{{ t('common.matchedOf', { a: j.matched_tracks, b: j.total_tracks }) }}</span></span>
                <app-icon name="chevron-right" class="text-dim" />
              </button>
            </li>
          } @empty {
            <li class="panel p-6 text-center text-[14px] text-ink-2">{{ t('sync.pickEmpty') }} <a routerLink="/transferir" class="font-medium text-accent" (click)="picker.close()">{{ t('dash.newTransfer') }}</a></li>
          }
        </ul>
      </div>
    </dialog>

    <app-sync-setup #setup (created)="created()" />
  `,
})
export class Syncs {
  protected t = inject(I18n).t;
  private i18n = inject(I18n);
  private api = inject(Api);
  private toast = inject(Toast);
  private session = inject(Session);
  private jobs = inject(Jobs);
  protected readonly demo = DEMO;
  protected readonly zones = TIMEZONES;
  protected syncs = signal<PlaylistSync[]>([]);
  protected sched = signal<SchedulerView | null>(null);
  protected busy = signal<string | null>(null);
  protected now = signal(Date.now());
  protected offset = computed(() => this.session.me()?.timezone_offset_minutes ?? -180);
  private picker = viewChild.required<ElementRef<HTMLDialogElement>>('picker');
  private alive = signal(new Set<string>());
  protected eligible = computed(() => this.jobs.list().filter((j) => (j.status === 'completed' || j.status === 'partial') && j.target_playlist_id && j.source_playlist_id !== '__generator__' && this.alive().has(j.id)));
  protected countdown = computed(() => {
    const at = this.sched()?.jobs[0]?.next_run_time;
    const s = at ? Math.max(0, Math.round((Date.parse(at) - this.now()) / 1000)) : 0;
    return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
  });

  constructor() {
    inject(Seo).set({ title: `Sincronizações | ${SITE_NAME}`, description: 'Sincronizações agendadas da demo do ITransferMusic e o agendador APScheduler simulado que as executa a cada 15 minutos.', path: '/sincronizacoes/', noindex: true });
    this.load();
    // Each second: the countdown. Each 15 s, or when the tick is due: ask the "server" again (that runs the scan).
    const timer = setInterval(() => {
      this.now.set(Date.now());
      const at = Date.parse(this.sched()?.jobs[0]?.next_run_time ?? '');
      if (this.now() % 15000 < 1000 || this.now() > at + 1500) this.load();
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  async load() {
    try {
      const [s, v] = await Promise.all([this.api.syncs(), this.api.scheduler().catch(() => null)]);
      this.syncs.set(s);
      this.sched.set(v);
    } catch (e) { this.toast.say(errorText(e, this.t('sync.failed'))); }
  }

  protected local(s: PlaylistSync) {
    const l = utcToLocal(s.run_hour, s.run_minute, this.offset());
    return `${pad2(l.hour)}:${pad2(l.minute)} (${fmtOffset(this.offset())})`;
  }
  protected rel = (iso: string) => fmtRelative(iso, this.i18n.locale(), this.now());
  protected short = (iso: string) => new Intl.DateTimeFormat(this.i18n.locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  protected clock = (iso: string) => clockAt(iso, this.offset());
  protected next(s: PlaylistSync) {
    if (s.status !== 'active') return '-';
    const at = this.sched()?.next_runs.find((n) => n.sync_id === s.id)?.next_run_at;
    return at ? fmtDateTime(at, this.i18n.locale()) : '...';
  }

  async toggle(s: PlaylistSync) {
    try {
      await this.api.setSync(s.id, s.status === 'active' ? 'paused' : 'active');
      this.toast.say(this.t(s.status === 'active' ? 'sync.paused' : 'sync.resumed', { name: s.source_playlist_name }));
    } catch (e) { this.toast.say(errorText(e, this.t('sync.failed'))); }
    await this.load();
  }

  async run(s: PlaylistSync) {
    this.busy.set(s.id);
    try {
      await this.api.runSync(s.id);
      await this.load();
      const after = this.syncs().find((x) => x.id === s.id);
      this.toast.say(after?.last_error ? after.last_error : this.t('sync.ran', { n: after?.tracks_added_last_run ?? 0, name: s.target_playlist_name }));
    } catch (e) { this.toast.say(errorText(e, this.t('sync.failed'))); }
    this.busy.set(null);
  }

  async remove(s: PlaylistSync) {
    try { await this.api.deleteSync(s.id); this.toast.say(this.t('sync.removed')); } catch (e) { this.toast.say(errorText(e, this.t('sync.failed'))); }
    await this.load();
  }

  async setTz(offset: number) {
    try { this.session.me.set(await this.api.updateMe({ timezone_offset_minutes: offset })); this.toast.say(this.t('sync.tzSaved', { tz: fmtOffset(offset) })); }
    catch (e) { this.toast.say(errorText(e, this.t('sync.failed'))); }
  }

  /** Like the original picker: finished transfers whose destination playlist still exists (GET /transfers/{id}/alive). */
  async openPicker() {
    this.picker().nativeElement.showModal();
    await this.jobs.load();
    const ids = new Set<string>();
    for (const j of this.jobs.list().filter((x) => x.target_playlist_id))
      if (await this.api.alive(j.id).then((r) => r.alive, () => true)) ids.add(j.id);
    this.alive.set(ids);
  }

  async created() {
    this.toast.say(this.t('setup.created'));
    await this.load();
  }
}
