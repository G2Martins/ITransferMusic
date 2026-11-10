import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Api, TransferResponse, errorText } from '../api/api';
import { PROVIDER_META, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { fmtDateTime, fmtRelative, pct } from '../shared/format';
import { Cover, Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { SyncSetup } from '../shared/sync-setup';
import { Job, StatusTag, TrackRow } from '../shared/tracks';
import { Jobs, Toast } from '../state';

type Filter = 'all' | 'completed' | 'partial' | 'failed';

/** Jobs in progress + history (GET /transfers), detail in a dialog (?id=), share and sync from a finished job. */
@Component({
  selector: 'app-transfers',
  imports: [RouterLink, Cover, Icon, ProviderBadge, Job, StatusTag, TrackRow, SyncSetup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">{{ t('tr.eyebrow') }}</p>
        <h1 class="h-page mt-3">{{ t('tr.title') }}</h1>
        <p class="mt-2 text-ink-2">{{ t('tr.subtitle') }}</p>
      </div>
      <a routerLink="/transferir" class="btn btn-primary"><app-icon name="transfer" [size]="17" /> {{ t('dash.newTransfer') }}</a>
    </header>

    @if (jobs.active().length) {
      <section class="mt-8" aria-labelledby="andamento">
        <h2 id="andamento" class="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em]"><span class="eq live text-accent-hi"><i></i><i></i><i></i></span> {{ t('dash.running') }}</h2>
        <ul class="mt-4 space-y-3">
          @for (j of jobs.active(); track j.id) {
            <li>
              <app-job [j]="j" />
              @if (j.results.length) {
                <p class="mt-1.5 clamp-1 pl-4 text-[12.5px] text-dim" aria-hidden="true">
                  {{ t('tr.last') }} {{ j.results[j.results.length - 1].source_name }} · {{ j.results[j.results.length - 1].matched ? t('match.found') : t('match.none') }}
                </p>
              }
            </li>
          }
        </ul>
      </section>
    }

    <section class="mt-10" aria-labelledby="historico">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="historico" class="text-[18px] font-medium tracking-[-0.02em]">{{ t('tr.history') }}</h2>
        <div class="seg" role="group" [attr.aria-label]="t('tr.filter')">
          @for (f of filters; track f) { <button type="button" [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">{{ t(f === 'all' ? 'wiz.f.all' : 'status.' + f) }}</button> }
        </div>
      </div>
      @if (!jobs.loaded()) { <p class="mt-4 text-ink-2">{{ t('common.loading') }}</p> }
      <ul class="mt-4 space-y-3">
        @for (j of history(); track j.id) {
          <li>
            <app-job [j]="j" />
            <p class="mt-1.5 pl-4 text-[12px] text-dim">{{ when(j.created_at) }}@if (j.source_playlist_id === '__generator__') { · {{ t('tr.generated') }} }@if (j.share_token) { · {{ t('tr.shared') }} }</p>
          </li>
        } @empty { @if (jobs.loaded()) { <li class="panel p-8 text-center text-ink-2">{{ t('tr.empty') }}</li> } }
      </ul>
    </section>

    <dialog #detail class="sheet w-[min(820px,calc(100vw-1.5rem))]" aria-labelledby="det-title" (close)="closeDetail()">
      @if (current(); as j) {
        <div class="p-5 sm:p-6">
          <div class="flex items-start gap-4">
            <app-cover [name]="j.source_playlist_name ?? j.target_playlist_name" [size]="64" />
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-1.5 text-[12.5px] text-dim">
                <app-provider [provider]="j.source_provider" [size]="16" /> {{ meta[j.source_provider].label }} <app-icon name="arrow-right" [size]="12" /> <app-provider [provider]="j.target_provider" [size]="16" /> {{ meta[j.target_provider].label }}
              </p>
              <h2 id="det-title" class="mt-1.5 text-[20px] font-medium leading-tight tracking-[-0.02em]">{{ j.target_playlist_name }}</h2>
              <p class="mt-1 text-[13px] text-dim">{{ t('tr.from', { name: j.source_playlist_name ?? j.source_playlist_id }) }} · {{ date(j.created_at) }}</p>
            </div>
            <button type="button" class="icon-btn -mr-2 -mt-1" [attr.aria-label]="t('common.close')" (click)="detail.close()"><app-icon name="x" /></button>
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-3">
            <app-status [status]="j.status" />
            <div class="meter min-w-[160px] flex-1" [class.ok]="j.status === 'completed'" [class.bad]="j.status === 'failed'" [style.--p]="j.total_tracks ? j.results.length / j.total_tracks : j.status === 'failed' ? 1 : 0"><i></i></div>
            <span class="mono text-[12px] text-ink-2">{{ t('common.matchedOf', { a: j.matched_tracks, b: j.total_tracks }) }} ({{ pct(j.matched_tracks, j.total_tracks) }}%)</span>
          </div>
          @if (j.error_message) { <p class="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-[14px] text-danger">{{ j.error_message }}</p> }
          @if (alive() === false && j.target_playlist_id) { <p class="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-[14px] text-warn">{{ t('tr.deleted') }}</p> }
          @if (j.target_playlist_description) { <p class="mt-4 text-[13px] leading-relaxed text-ink-2">{{ j.target_playlist_description }}</p> }

          @if ((j.status === 'completed' || j.status === 'partial') && alive() !== false) {
            <div class="mt-5 flex flex-wrap gap-2">
              <button type="button" class="btn btn-line btn-sm" (click)="share(j)"><app-icon name="share" [size]="15" /> {{ t('tr.share') }}</button>
              @if (j.source_playlist_id !== '__generator__') {
                <button type="button" class="btn btn-line btn-sm" (click)="setup.open(j)"><app-icon name="sync" [size]="15" /> {{ t('tr.sync') }}</button>
              }
              <a routerLink="/playlists" [queryParams]="{ servico: j.target_provider, playlist: j.target_playlist_id }" class="btn btn-ghost btn-sm" (click)="detail.close()"><app-icon name="list" [size]="15" /> {{ t('tr.open') }}</a>
            </div>
          }
          @if (shareUrl()) {
            <div class="mt-4 flex items-center gap-2 rounded-xl border border-line bg-well p-2 pl-3">
              <a [href]="shareUrl()" class="min-w-0 flex-1 clamp-1 mono text-[12px] text-accent">{{ shareUrl() }}</a>
              <button type="button" class="btn btn-line btn-sm" (click)="copy()"><app-icon name="copy" [size]="14" /> {{ t('tr.copy') }}</button>
            </div>
          }

          @if (j.results.length) {
            <ol class="mt-5 max-h-[50dvh] divide-y divide-line overflow-y-auto rounded-xl border border-line scroll-thin">
              @for (r of j.results; track r.source_track_id + $index; let i = $index) { <li><app-track-row [r]="r" [n]="i + 1" [target]="j.target_provider" /></li> }
            </ol>
          }
        </div>
      }
    </dialog>

    <app-sync-setup #setup (created)="synced()" />
  `,
})
export class Transfers {
  protected t = inject(I18n).t;
  private i18n = inject(I18n);
  private api = inject(Api);
  private router = inject(Router);
  private toast = inject(Toast);
  private doc = inject(DOCUMENT);
  protected jobs = inject(Jobs);
  protected readonly meta = PROVIDER_META;
  protected readonly pct = pct;
  protected readonly filters: Filter[] = ['all', 'completed', 'partial', 'failed'];
  protected filter = signal<Filter>('all');
  protected alive = signal<boolean | null>(null);
  protected shareUrl = signal('');
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('detail');
  private id = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('id'))));
  protected current = computed(() => this.jobs.list().find((j) => j.id === this.id()) ?? null);
  protected history = computed(() => {
    const f = this.filter();
    return this.jobs.list().filter((j) => j.status !== 'pending' && j.status !== 'running' && (f === 'all' || j.status === f));
  });

  constructor() {
    inject(Seo).set({ title: `Transferências | ${SITE_NAME}`, description: 'Transferências da demo do ITransferMusic: jobs com progresso simulado, histórico e resultado faixa a faixa.', path: '/transferencias/', noindex: true });
    this.jobs.load();
    // Open the dialog when ?id= points to a known job; check /alive once the job is final.
    let checked = '';
    effect(() => {
      const j = this.current();
      const dlg = this.dialog().nativeElement;
      if (j && !dlg.open) { this.shareUrl.set(''); this.alive.set(null); dlg.showModal(); }
      if (j && j.status !== 'pending' && j.status !== 'running' && checked !== j.id) {
        checked = j.id;
        this.api.alive(j.id).then((r) => this.alive.set(r.alive), () => undefined);
      }
    });
  }

  protected date = (iso: string) => fmtDateTime(iso, this.i18n.locale(), true);
  protected when = (iso: string) => fmtRelative(iso, this.i18n.locale());

  private leaving = false;
  protected closeDetail() {
    // The dialog's close event is async: after "Sincronizar" it must not cancel the navigation to /sincronizacoes/.
    if (this.id() && !this.leaving) this.router.navigate([], { queryParams: { id: null }, replaceUrl: true });
  }

  async share(j: TransferResponse) {
    try {
      const r = await this.api.share(j.id);
      // share_url is relative ("/share/{token}"), the frontend builds the full link like the original.
      this.shareUrl.set(new URL(`.${r.share_url}/`, this.doc.baseURI).href);
      await this.jobs.load();
    } catch (e) { this.toast.say(errorText(e, this.t('tr.failed'))); }
  }

  async copy() {
    try { await navigator.clipboard.writeText(this.shareUrl()); this.toast.say(this.t('tr.copied')); } catch { this.toast.say(this.shareUrl()); }
  }

  synced() {
    this.leaving = true;
    this.dialog().nativeElement.close();
    this.toast.say(this.t('setup.created'));
    this.router.navigateByUrl('/sincronizacoes');
  }
}
