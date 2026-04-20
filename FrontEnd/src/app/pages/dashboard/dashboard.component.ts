import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  ApiService,
  LinkedAccount,
  Provider,
  SyncFrequency,
  SyncMethod,
  TransferResponse,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  playlistUrl,
  providerIcon,
  providerLabel,
} from '../../core/utils/playlist-url';
import { formatApiError } from '../../core/utils/format-error';

interface ProviderMeta {
  id: Provider;
  label: string;
  icon: string;
}

interface PlaylistCard {
  id: string;
  name: string;
  sourceProvider: Provider;
  targetProvider: Provider;
  targetIcon: string;
  sourceIcon: string;
  tracks: number;
  totalTracks: number;
  status: string;
  createdAt: string;
  url: string | null;
  sourcePlaylistId: string;
  targetPlaylistId: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, FormsModule, NgClass, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-5xl px-6 py-12">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-brand dark:text-white md:text-4xl">
          {{ 'dashboard.greeting' | transloco }}, {{ auth.firstName() || '...' }}!
        </h1>
        <p class="mt-2 text-brand/60 dark:text-white/60">
          {{ 'dashboard.subtitle' | transloco }}
        </p>
      </header>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <a
          [routerLink]="['/transfer/new']"
          class="card flex items-center gap-4 bg-brand-accent text-white shadow-xl transition-transform hover:-translate-y-1 hover:bg-brand-accentDark dark:bg-brand-accent"
        >
          <iconify-icon icon="ph:arrows-left-right-duotone" class="text-4xl"></iconify-icon>
          <div>
            <p class="font-semibold">{{ 'dashboard.ctaTitle' | transloco }}</p>
            <p class="text-xs text-white/80">{{ 'dashboard.ctaShort' | transloco }}</p>
          </div>
        </a>

        <a
          [routerLink]="['/account/syncs']"
          class="card flex items-center gap-4 hover:-translate-y-1"
        >
          <iconify-icon icon="ph:arrows-clockwise-duotone" class="text-4xl text-brand-accent"></iconify-icon>
          <div>
            <p class="font-semibold">{{ 'dashboard.quick.syncs' | transloco }}</p>
            <p class="text-xs text-brand/60 dark:text-white/60">
              {{ 'dashboard.quick.syncsDesc' | transloco }}
            </p>
          </div>
        </a>
        <a
          [routerLink]="['/account/history']"
          class="card flex items-center gap-4 hover:-translate-y-1"
        >
          <iconify-icon icon="ph:clock-counter-clockwise-duotone" class="text-4xl text-brand-accent"></iconify-icon>
          <div>
            <p class="font-semibold">{{ 'dashboard.quick.history' | transloco }}</p>
            <p class="text-xs text-brand/60 dark:text-white/60">
              {{ totalTransfers() }} {{ 'dashboard.quick.historyDesc' | transloco }}
            </p>
          </div>
        </a>
        <a
          [routerLink]="['/account/profile']"
          class="card flex items-center gap-4 hover:-translate-y-1"
        >
          <iconify-icon icon="ph:gear-duotone" class="text-4xl text-brand-accent"></iconify-icon>
          <div>
            <p class="font-semibold">{{ 'dashboard.quick.account' | transloco }}</p>
            <p class="text-xs text-brand/60 dark:text-white/60">
              {{ totalLinked() }} {{ 'dashboard.quick.accountDesc' | transloco }}
            </p>
          </div>
        </a>
      </div>

      <!-- Minhas playlists (gerenciamento) -->
      <div class="mt-12">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-xl font-semibold text-brand dark:text-white">
            {{ 'dashboard.myPlaylists' | transloco }}
          </h3>
          <a
            [routerLink]="['/account/history']"
            class="text-sm font-semibold text-brand-accent hover:underline"
          >
            {{ 'dashboard.viewAll' | transloco }} →
          </a>
        </div>

        @if (cards().length === 0) {
          <div class="empty-box min-h-[180px]">
            <iconify-icon
              icon="ph:music-notes-duotone"
              class="mb-4 text-5xl text-brand/40 dark:text-white/40"
            ></iconify-icon>
            <p class="text-brand/60 dark:text-white/60">
              {{ 'dashboard.myPlaylistsEmpty' | transloco }}
            </p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (c of cards(); track c.id) {
              <div
                class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-surface-mutedDark"
              >
                <div class="flex items-center gap-5">
                  <div class="flex items-center gap-2 text-brand dark:text-white">
                    <iconify-icon [attr.icon]="c.sourceIcon" class="text-3xl"></iconify-icon>
                    <iconify-icon icon="ph:arrow-right-bold" class="text-lg text-gray-400"></iconify-icon>
                    <iconify-icon [attr.icon]="c.targetIcon" class="text-3xl"></iconify-icon>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-baseline gap-4">
                      <span class="text-xl font-bold text-brand dark:text-white">
                        {{ c.tracks }}/{{ c.totalTracks }}
                      </span>
                      <span class="text-xs text-brand/60 dark:text-white/60">
                        {{ 'history.tracksProcessed' | transloco }}
                      </span>
                    </div>
                    <p class="text-xs text-brand/40 dark:text-white/40">
                      {{ c.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                    </p>
                  </div>
                  <span
                    [ngClass]="{
                      'badge-success': c.status === 'completed',
                      'badge-warning': c.status === 'partial' || c.status === 'running',
                      'badge-neutral': c.status === 'pending',
                      'badge-danger': c.status === 'failed'
                    }"
                  >
                    {{ c.status }}
                  </span>
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 dark:border-white/10">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-accent/10"
                    >
                      <iconify-icon
                        icon="ph:music-notes-duotone"
                        class="text-2xl text-brand-accent"
                      ></iconify-icon>
                    </div>
                    <div>
                      <p class="font-semibold text-brand dark:text-white">{{ c.name }}</p>
                      <p class="text-xs text-brand/60 dark:text-white/60">
                        {{ 'dashboard.listOfTracks' | transloco }} · {{ c.totalTracks }}
                      </p>
                    </div>
                  </div>

                  <div class="ml-auto flex flex-wrap items-center gap-2">
                    @if (c.url) {
                      <a
                        [href]="c.url"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand-accent hover:text-brand-accent dark:border-white/15 dark:text-white"
                      >
                        <iconify-icon icon="ph:arrow-square-out-duotone" class="text-lg"></iconify-icon>
                        {{ 'history.open' | transloco }}
                      </a>
                    }
                    <button
                      type="button"
                      (click)="share(c)"
                      class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand-accent hover:text-brand-accent dark:border-white/15 dark:text-white"
                    >
                      <iconify-icon icon="ph:share-network-duotone" class="text-lg"></iconify-icon>
                      {{ 'dashboard.share' | transloco }}
                    </button>
                    <button
                      type="button"
                      (click)="openSyncModal(c)"
                      class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand-accent hover:text-brand-accent dark:border-white/15 dark:text-white"
                    >
                      <iconify-icon icon="ph:arrows-clockwise-duotone" class="text-lg"></iconify-icon>
                      {{ 'dashboard.sync' | transloco }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>

    @if (syncModalCard(); as c) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        (click)="closeSyncModal()"
      >
        <div
          class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-surface-mutedDark"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <iconify-icon
                icon="ph:arrows-clockwise-duotone"
                class="text-3xl text-brand-accent"
              ></iconify-icon>
              <h3 class="text-2xl font-bold text-brand dark:text-white">
                {{ 'syncModal.title' | transloco }}
              </h3>
            </div>
            <button
              type="button"
              (click)="closeSyncModal()"
              class="rounded-full p-1 text-brand/60 hover:text-brand-accent dark:text-white/60"
              aria-label="Fechar"
            >
              <iconify-icon icon="ph:x-bold" class="text-xl"></iconify-icon>
            </button>
          </div>

          @if (syncCreated()) {
            <div class="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">
              <p class="font-semibold">{{ 'syncModal.successTitle' | transloco }}</p>
              <p class="mt-1">{{ 'syncModal.successBody' | transloco }}</p>
            </div>
            <div class="mt-6 flex justify-end">
              <button type="button" class="btn-primary" (click)="closeSyncModal()">
                {{ 'syncModal.close' | transloco }}
              </button>
            </div>
          } @else {
            <p class="mt-3 text-sm text-brand/70 dark:text-white/70">
              {{ 'syncModal.description' | transloco }}
              <a
                [routerLink]="['/feature/sincronizar']"
                class="font-semibold text-brand-accent hover:underline"
              >
                {{ 'syncModal.learnMore' | transloco }}
              </a>
            </p>

            <!-- Playlist -->
            <p class="mt-5 text-sm font-semibold text-brand dark:text-white">
              {{ 'syncModal.playlistLabel' | transloco }}
            </p>
            <div class="mt-2 flex items-center gap-3 rounded-xl surface-border p-3">
              <iconify-icon
                [attr.icon]="c.sourceIcon"
                class="text-2xl text-brand dark:text-white"
              ></iconify-icon>
              <iconify-icon
                icon="ph:arrow-right-bold"
                class="text-lg text-brand/40 dark:text-white/40"
              ></iconify-icon>
              <iconify-icon
                [attr.icon]="c.targetIcon"
                class="text-2xl text-brand dark:text-white"
              ></iconify-icon>
              <div class="flex-1">
                <p class="text-sm font-semibold text-brand dark:text-white">{{ c.name }}</p>
                <p class="text-xs text-muted">{{ c.totalTracks }} tracks</p>
              </div>
            </div>

            <!-- Frequência -->
            <p class="mt-5 text-sm font-semibold text-brand dark:text-white">
              {{ 'syncModal.frequencyLabel' | transloco }}
            </p>
            <div class="mt-2 grid grid-cols-2 gap-3">
              <select
                class="input-base"
                [ngModel]="syncFrequency()"
                (ngModelChange)="syncFrequency.set($event)"
                name="freq"
              >
                <option value="daily">{{ 'syncModal.daily' | transloco }}</option>
                <option value="weekly">{{ 'syncModal.weekly' | transloco }}</option>
              </select>
              <select
                class="input-base"
                [ngModel]="syncRunHour()"
                (ngModelChange)="syncRunHour.set(+$event)"
                name="hour"
              >
                @for (h of hourOptions; track h) {
                  <option [value]="h">{{ formatHour(h) }}</option>
                }
              </select>
            </div>

            <!-- Método -->
            <p class="mt-5 text-sm font-semibold text-brand dark:text-white">
              {{ 'syncModal.methodLabel' | transloco }}
            </p>
            <div class="mt-2 space-y-2">
              <label
                class="flex cursor-pointer items-start gap-3 rounded-xl surface-border p-3"
                [ngClass]="syncMethod() === 'add_only' ? 'border-brand-accent' : ''"
              >
                <input
                  type="radio"
                  name="method"
                  class="mt-1 accent-brand-accent"
                  [checked]="syncMethod() === 'add_only'"
                  (change)="syncMethod.set('add_only')"
                />
                <div>
                  <p class="text-sm font-semibold text-brand dark:text-white">
                    {{ 'syncModal.addOnly' | transloco }}
                  </p>
                  <p class="text-xs text-muted">{{ 'syncModal.addOnlyDesc' | transloco }}</p>
                </div>
              </label>
              <label
                class="flex cursor-pointer items-start gap-3 rounded-xl surface-border p-3"
                [ngClass]="syncMethod() === 'mirror' ? 'border-brand-accent' : ''"
              >
                <input
                  type="radio"
                  name="method"
                  class="mt-1 accent-brand-accent"
                  [checked]="syncMethod() === 'mirror'"
                  (change)="syncMethod.set('mirror')"
                />
                <div>
                  <p class="text-sm font-semibold text-brand dark:text-white">
                    {{ 'syncModal.mirror' | transloco }}
                  </p>
                  <p class="text-xs text-muted">{{ 'syncModal.mirrorDesc' | transloco }}</p>
                </div>
              </label>
            </div>

            @if (syncError()) {
              <p class="alert-error mt-4">{{ syncError() }}</p>
            }

            <button
              type="button"
              class="btn-primary mt-6 w-full"
              (click)="confirmCreateSync()"
              [disabled]="creatingSync()"
            >
              {{ 'syncModal.confirm' | transloco }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly providers: ProviderMeta[] = [
    { id: 'spotify', label: providerLabel('spotify'), icon: providerIcon('spotify') },
    { id: 'youtube', label: providerLabel('youtube'), icon: providerIcon('youtube') },
    { id: 'apple_music', label: providerLabel('apple_music'), icon: providerIcon('apple_music') },
    { id: 'amazon_music', label: providerLabel('amazon_music'), icon: providerIcon('amazon_music') },
  ];

  readonly linked = signal<LinkedAccount[]>([]);
  readonly transfers = signal<TransferResponse[]>([]);
  /** IDs de transferências cujo playlist destino foi removido do provedor. */
  readonly deadTransferIds = signal<Set<string>>(new Set());

  readonly totalLinked = computed(() => this.linked().length);
  readonly totalTransfers = computed(() => this.transfers().length);

  readonly cards = computed<PlaylistCard[]>(() => {
    const dead = this.deadTransferIds();
    return this.transfers()
      .filter((t) => t.target_playlist_id && !dead.has(t.id))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.target_playlist_name,
        sourceProvider: t.source_provider,
        targetProvider: t.target_provider,
        sourceIcon: providerIcon(t.source_provider),
        targetIcon: providerIcon(t.target_provider),
        tracks: t.matched_tracks,
        totalTracks: t.total_tracks,
        status: t.status,
        createdAt: t.created_at,
        url: playlistUrl(t.target_provider, t.target_playlist_id),
        sourcePlaylistId: t.source_playlist_id,
        targetPlaylistId: t.target_playlist_id!,
      }));
  });

  // --- Modal de sincronização ---
  readonly syncModalCard = signal<PlaylistCard | null>(null);
  readonly syncFrequency = signal<SyncFrequency>('weekly');
  readonly syncRunHour = signal<number>(13); // 13:00 UTC (default)
  readonly syncMethod = signal<SyncMethod>('add_only');
  readonly creatingSync = signal(false);
  readonly syncError = signal<string | null>(null);
  readonly syncCreated = signal(false);

  ngOnInit(): void {
    this.auth.hydrate();
    this.api.listLinkedAccounts().subscribe({
      next: (a) => this.linked.set(a),
      error: () => this.linked.set([]),
    });
    this.api.listTransfers().subscribe({
      next: (t) => {
        this.transfers.set(t);
        this.checkAliveStatuses(t);
      },
      error: () => this.transfers.set([]),
    });
  }

  private checkAliveStatuses(transfers: TransferResponse[]): void {
    const candidates = transfers.filter((t) => t.target_playlist_id).slice(0, 5);
    if (candidates.length === 0) return;
    const checks = candidates.map((t) =>
      this.api.checkTransferAlive(t.id).pipe(
        map((r) => ({ id: t.id, alive: r.alive })),
        catchError(() => of({ id: t.id, alive: true })),
      ),
    );
    forkJoin(checks).subscribe((results) => {
      const dead = new Set<string>();
      for (const r of results) {
        if (!r.alive) dead.add(r.id);
      }
      if (dead.size) this.deadTransferIds.set(dead);
    });
  }

  isLinked(p: Provider): boolean {
    return this.linked().some((a) => a.provider === p);
  }

  share(c: PlaylistCard): void {
    if (!c.url) return;
    if (navigator.share) {
      navigator.share({ title: c.name, url: c.url }).catch(() => void 0);
    } else {
      navigator.clipboard.writeText(c.url).catch(() => void 0);
    }
  }

  openSyncModal(c: PlaylistCard): void {
    this.syncModalCard.set(c);
    this.syncFrequency.set('weekly');
    this.syncRunHour.set(13);
    this.syncMethod.set('add_only');
    this.syncError.set(null);
    this.syncCreated.set(false);
  }

  closeSyncModal(): void {
    this.syncModalCard.set(null);
  }

  readonly hourOptions = Array.from({ length: 24 }, (_, i) => i);

  formatHour(h: number): string {
    return `${h.toString().padStart(2, '0')}:00 UTC`;
  }

  confirmCreateSync(): void {
    const c = this.syncModalCard();
    if (!c) return;
    this.creatingSync.set(true);
    this.syncError.set(null);
    this.api
      .createSync({
        source_provider: c.sourceProvider,
        source_playlist_id: c.sourcePlaylistId,
        source_playlist_name: c.name,
        target_provider: c.targetProvider,
        target_playlist_id: c.targetPlaylistId,
        target_playlist_name: c.name,
        frequency: this.syncFrequency(),
        run_hour: this.syncRunHour(),
        method: this.syncMethod(),
      })
      .subscribe({
        next: () => {
          this.creatingSync.set(false);
          this.syncCreated.set(true);
        },
        error: (err) => {
          this.creatingSync.set(false);
          this.syncError.set(formatApiError(err, 'Falha ao criar sincronização'));
        },
      });
  }
}
