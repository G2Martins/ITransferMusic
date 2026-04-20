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
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  ApiService,
  Provider,
  TransferResponse,
} from '../../../core/services/api.service';
import {
  playlistUrl,
  providerIcon,
  providerLabel,
} from '../../../core/utils/playlist-url';
import { formatApiError } from '../../../core/utils/format-error';

interface Row extends TransferResponse {
  targetUrl: string | null;
  sourceLabel: string;
  targetLabel: string;
  sourceIcon: string;
  targetIcon: string;
}

@Component({
  selector: 'app-account-history',
  standalone: true,
  imports: [NgClass, RouterLink, TranslocoPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-brand dark:text-white">
          {{ 'history.title' | transloco }}
        </h1>
        <p class="mt-1 text-brand/60 dark:text-white/60">
          {{ 'history.subtitle' | transloco }}
        </p>
      </div>
      <a [routerLink]="['/transfer/new']" class="btn-primary">
        {{ 'history.newTransfer' | transloco }}
      </a>
    </div>

    @if (error()) {
      <p class="alert-error mt-6">{{ error() }}</p>
    }

    @if (loading()) {
      <p class="mt-8 text-brand/70 dark:text-white/70">Carregando...</p>
    } @else if (rows().length === 0) {
      <div class="empty-box mt-10 min-h-[220px] bg-surface-muted dark:bg-surface-mutedDark">
        <iconify-icon
          icon="ph:clock-counter-clockwise-duotone"
          class="mb-4 text-5xl text-brand/40 dark:text-white/40"
        ></iconify-icon>
        <p class="text-lg font-medium text-brand/60 dark:text-white/60">
          {{ 'history.empty' | transloco }}
        </p>
      </div>
    } @else {
      <div class="mt-8 space-y-4">
        @for (t of rows(); track t.id) {
          <div class="card">
            <!-- Cabeçalho: providers + status + acoes -->
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <iconify-icon
                  [attr.icon]="t.sourceIcon"
                  class="text-3xl text-brand dark:text-white"
                ></iconify-icon>
                <iconify-icon
                  icon="ph:arrow-right-bold"
                  class="text-xl text-brand/40 dark:text-white/40"
                ></iconify-icon>
                <iconify-icon
                  [attr.icon]="t.targetIcon"
                  class="text-3xl text-brand dark:text-white"
                ></iconify-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-brand dark:text-white truncate">
                  {{ t.target_playlist_name }}
                </p>
                <p class="text-xs text-muted">
                  {{ t.sourceLabel }} → {{ t.targetLabel }} ·
                  {{ t.matched_tracks }}/{{ t.total_tracks }}
                  {{ 'history.tracksProcessed' | transloco }}
                </p>
                <p class="mt-1 text-xs text-brand/40 dark:text-white/40">
                  {{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              </div>

              <span
                [ngClass]="{
                  'badge-success': t.status === 'completed',
                  'badge-warning': t.status === 'partial' || t.status === 'running',
                  'badge-neutral': t.status === 'pending',
                  'badge-danger': t.status === 'failed'
                }"
              >
                {{ t.status }}
              </span>

              <div class="flex flex-wrap items-center gap-2">
                <!-- Abrir so aparece se playlist ainda existir -->
                @if (t.targetUrl && !deadTransferIds().has(t.id)) {
                  <a
                    [href]="t.targetUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1 rounded-lg border border-brand-accent px-3 py-2 text-sm font-semibold text-brand-accent transition-colors hover:bg-brand-accent hover:text-white"
                  >
                    <iconify-icon icon="ph:arrow-square-out-duotone" class="text-lg"></iconify-icon>
                    {{ 'history.open' | transloco }}
                  </a>
                }
                <button
                  type="button"
                  (click)="share(t)"
                  class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand-accent hover:text-brand-accent dark:border-white/15 dark:text-white"
                >
                  <iconify-icon icon="ph:share-network-duotone" class="text-lg"></iconify-icon>
                  {{ 'dashboard.share' | transloco }}
                </button>
                <button
                  type="button"
                  (click)="toggleExpand(t.id)"
                  class="rounded-full p-2 text-brand/60 hover:text-brand-accent dark:text-white/60"
                  [attr.aria-label]="'Expandir detalhes'"
                >
                  <iconify-icon
                    [attr.icon]="expanded().has(t.id) ? 'ph:caret-up-bold' : 'ph:caret-down-bold'"
                    class="text-xl"
                  ></iconify-icon>
                </button>
              </div>
            </div>

            @if (deadTransferIds().has(t.id)) {
              <p class="mt-3 text-xs text-yellow-700 dark:text-yellow-300">
                <iconify-icon icon="ph:info-duotone" class="mr-1 text-sm"></iconify-icon>
                {{ 'history.playlistDeleted' | transloco }}
              </p>
            }

            <!-- Detalhes expandidos -->
            @if (expanded().has(t.id)) {
              <div class="mt-5 border-t border-gray-200 pt-5 dark:border-white/10">
                <div class="flex flex-wrap items-start gap-5">
                  @if (t.source_playlist_image_url) {
                    <img
                      [src]="t.source_playlist_image_url"
                      alt=""
                      class="h-28 w-28 flex-shrink-0 rounded-xl object-cover shadow-md"
                    />
                  } @else {
                    <div class="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-xl bg-brand-accent/10">
                      <iconify-icon icon="ph:music-notes-duotone" class="text-5xl text-brand-accent"></iconify-icon>
                    </div>
                  }
                  <div class="flex-1 min-w-0">
                    <p class="text-xs uppercase tracking-wider text-muted">
                      {{ 'history.generatedPlaylist' | transloco }}
                    </p>
                    <p class="mt-1 text-lg font-bold text-brand dark:text-white">
                      {{ t.target_playlist_name }}
                    </p>
                    @if (t.target_playlist_description) {
                      <p class="mt-2 whitespace-pre-line text-sm text-muted">
                        {{ t.target_playlist_description }}
                      </p>
                    }
                  </div>
                </div>

                @if (t.results && t.results.length > 0) {
                  <p class="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">
                    {{ 'history.tracks' | transloco }} ({{ t.results.length }})
                  </p>
                  <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-2">
                    @for (tr of t.results; track tr.source_track_id) {
                      <div class="flex items-center gap-3">
                        @if (tr.image_url) {
                          <img
                            [src]="tr.image_url"
                            alt=""
                            class="h-10 w-10 flex-shrink-0 rounded object-cover"
                          />
                        } @else {
                          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-brand-accent/10">
                            <iconify-icon icon="ph:music-note-duotone" class="text-lg text-brand-accent"></iconify-icon>
                          </div>
                        }
                        <div class="flex-1 min-w-0">
                          <p class="truncate text-sm font-medium text-brand dark:text-white">
                            {{ tr.source_name }}
                          </p>
                          <p class="truncate text-xs text-muted">
                            {{ tr.source_artist }}{{ tr.source_album ? ' · ' + tr.source_album : '' }}
                          </p>
                        </div>
                        @if (!tr.matched) {
                          <span class="text-xs text-yellow-700 dark:text-yellow-300">
                            sem match
                          </span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AccountHistoryComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly expanded = signal<Set<string>>(new Set());
  readonly deadTransferIds = signal<Set<string>>(new Set());
  private readonly raw = signal<TransferResponse[]>([]);

  readonly rows = computed<Row[]>(() =>
    this.raw().map((t) => ({
      ...t,
      targetUrl: playlistUrl(t.target_provider, t.target_playlist_id),
      sourceLabel: providerLabel(t.source_provider as Provider),
      targetLabel: providerLabel(t.target_provider as Provider),
      sourceIcon: providerIcon(t.source_provider as Provider),
      targetIcon: providerIcon(t.target_provider as Provider),
    })),
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.api.listTransfers().subscribe({
      next: (list) => {
        this.raw.set(list);
        this.loading.set(false);
        this.checkAlive(list);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Falha ao carregar historico'));
      },
    });
  }

  private checkAlive(transfers: TransferResponse[]): void {
    const candidates = transfers.filter((t) => t.target_playlist_id);
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

  toggleExpand(id: string): void {
    const next = new Set(this.expanded());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expanded.set(next);
  }

  share(t: Row): void {
    this.api.createShare(t.id).subscribe({
      next: (r) => {
        const url = `${window.location.origin}/share/${r.token}`;
        navigator.clipboard.writeText(url).catch(() => void 0);
        window.open(url, '_blank', 'noopener');
      },
      error: () => void 0,
    });
  }
}
