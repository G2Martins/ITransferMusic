import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, PlaylistSync, SchedulerView } from '../api/api';
import { PROVIDERS, PROVIDER_META, Provider, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { fmtRelative } from '../shared/format';
import { Icon, ProviderBadge } from '../shared/icon';
import { Seo } from '../shared/seo';
import { Job } from '../shared/tracks';
import { Jobs, Linked, Session } from '../state';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, ProviderBadge, Job],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">{{ t('dash.eyebrow') }}</p>
        <h1 class="h-page mt-3">{{ t('dash.hello', { name: session.firstName() || '...' }) }}</h1>
        <p class="mt-2 text-ink-2">{{ t('dash.subtitle') }}</p>
      </div>
      <a routerLink="/transferir" class="btn btn-primary"><app-icon name="transfer" [size]="17" /> {{ t('dash.newTransfer') }}</a>
    </header>

    <ul class="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      @for (s of stats(); track s.key) {
        <li class="card p-4">
          <p class="eyebrow text-[10px]">{{ t('dash.stat.' + s.key) }}</p>
          <p class="mt-3 text-[30px] font-light tracking-[-0.04em]">{{ s.value }}</p>
          <p class="text-[12.5px] text-dim">{{ s.hint }}</p>
        </li>
      }
    </ul>

    @if (jobs.active().length) {
      <section class="mt-10" aria-labelledby="ativos">
        <h2 id="ativos" class="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em]"><span class="eq live text-accent-hi"><i></i><i></i><i></i></span> {{ t('dash.running') }}</h2>
        <ul class="mt-4 space-y-3">@for (j of jobs.active(); track j.id) { <li><app-job [j]="j" /></li> }</ul>
      </section>
    }

    <div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section aria-labelledby="minhas">
        <div class="flex items-center justify-between">
          <h2 id="minhas" class="text-[18px] font-medium tracking-[-0.02em]">{{ t('dash.myPlaylists') }}</h2>
          <a routerLink="/transferencias" class="text-[14px] font-medium text-accent hover:text-accent-2">{{ t('dash.viewAll') }}</a>
        </div>
        @if (!jobs.loaded()) { <p class="mt-4 text-ink-2">{{ t('common.loading') }}</p> }
        @else if (!recent().length) {
          <div class="panel mt-4 p-8 text-center text-ink-2">{{ t('dash.empty') }}</div>
        } @else {
          <ul class="mt-4 space-y-3">@for (j of recent(); track j.id) { <li><app-job [j]="j" /></li> }</ul>
        }
      </section>

      <div class="space-y-8">
        <section aria-labelledby="contas">
          <div class="flex items-center justify-between">
            <h2 id="contas" class="text-[18px] font-medium tracking-[-0.02em]">{{ t('dash.linked') }}</h2>
            <a routerLink="/conexoes" class="text-[14px] font-medium text-accent hover:text-accent-2">{{ t('dash.manage') }}</a>
          </div>
          <ul class="panel mt-4 divide-y divide-line">
            @for (p of providers; track p) {
              <li class="flex items-center gap-3 px-4 py-3">
                <app-provider [provider]="p" [size]="24" />
                <span class="flex-1 text-[14px] font-medium">{{ meta[p].label }}</span>
                @if (linked.has(p)) { <span class="tag tag-ok">{{ t('conn.connected') }}</span> }
                @else { <button type="button" class="btn btn-line btn-sm" (click)="connect(p)">{{ t('conn.connect') }}</button> }
              </li>
            }
          </ul>
        </section>

        <section aria-labelledby="proximas">
          <div class="flex items-center justify-between">
            <h2 id="proximas" class="text-[18px] font-medium tracking-[-0.02em]">{{ t('dash.nextSyncs') }}</h2>
            <a routerLink="/sincronizacoes" class="text-[14px] font-medium text-accent hover:text-accent-2">{{ t('dash.viewAll') }}</a>
          </div>
          <ul class="panel mt-4 divide-y divide-line">
            @for (s of syncs(); track s.id) {
              <li class="px-4 py-3">
                <p class="clamp-1 text-[14px] font-medium">{{ s.source_playlist_name }}</p>
                <p class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-dim">
                  <app-provider [provider]="s.source_provider" [size]="15" [labeled]="true" /> <app-icon name="sync" [size]="12" /> <app-provider [provider]="s.target_provider" [size]="15" [labeled]="true" />
                  {{ s.status === 'active' ? t('sync.nextAt', { when: next(s.id) }) : t('status.' + s.status) }}
                </p>
              </li>
            } @empty { <li class="px-4 py-6 text-center text-[14px] text-ink-2">{{ t('sync.empty') }}</li> }
          </ul>
        </section>

        <a routerLink="/gerador" class="dark-panel flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-accent-hi"><app-icon name="sparkle" [size]="20" /></span>
          <span class="flex-1"><span class="block font-medium text-white">{{ t('nav.generator') }}</span><span class="text-[13px] text-plum-ink/80">{{ t('dash.generatorText') }}</span></span>
          <app-icon name="arrow-right" class="text-plum-ink" />
        </a>
      </div>
    </div>
  `,
})
export class Dashboard {
  protected t = inject(I18n).t;
  private i18n = inject(I18n);
  private api = inject(Api);
  protected session = inject(Session);
  protected jobs = inject(Jobs);
  protected linked = inject(Linked);
  protected readonly providers = PROVIDERS;
  protected readonly meta = PROVIDER_META;
  protected syncs = signal<PlaylistSync[]>([]);
  private sched = signal<SchedulerView | null>(null);
  protected recent = computed(() => this.jobs.list().filter((j) => j.status !== 'pending' && j.status !== 'running').slice(0, 5));
  protected stats = computed(() => {
    const list = this.jobs.list();
    const done = list.filter((j) => j.status === 'completed' || j.status === 'partial');
    return [
      { key: 'linked', value: `${this.linked.list().length}/5`, hint: this.linked.providers().map((p) => PROVIDER_META[p].label).join(', ') },
      { key: 'transfers', value: String(list.length), hint: this.t('dash.hintDone', { n: done.length }) },
      { key: 'tracks', value: String(done.reduce((s, j) => s + j.matched_tracks, 0)), hint: this.t('dash.hintTracks', { n: done.reduce((s, j) => s + j.total_tracks, 0) }) },
      { key: 'syncs', value: String(this.syncs().filter((s) => s.status === 'active').length), hint: this.t('dash.hintSyncs', { n: this.syncs().length }) },
    ];
  });

  constructor() {
    inject(Seo).set({ title: `Painel | ${SITE_NAME}`, description: 'Painel da demo do ITransferMusic: contas vinculadas, transferências em andamento e próximas sincronizações.', path: '/painel/', noindex: true });
    this.api.syncs().then((s) => this.syncs.set(s), () => undefined);
    this.api.scheduler().then((s) => this.sched.set(s), () => undefined);
  }

  protected next(id: string) {
    const at = this.sched()?.next_runs.find((n) => n.sync_id === id)?.next_run_at ?? null;
    return at ? fmtRelative(at, this.i18n.locale()) : '...';
  }

  protected connect(p: Provider) {
    this.linked.connect(p, '/painel');
  }
}
