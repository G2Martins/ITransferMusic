import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

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
  imports: [RouterLink, TranslocoPipe, DatePipe],
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
      <p class="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">{{ error() }}</p>
    }

    @if (loading()) {
      <p class="mt-8 text-brand/70 dark:text-white/70">Carregando...</p>
    } @else if (rows().length === 0) {
      <div
        class="mt-10 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-surface-muted p-10 text-center dark:border-white/15 dark:bg-surface-mutedDark"
      >
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
          <div class="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <iconify-icon
                  [attr.icon]="t.sourceIcon"
                  class="text-3xl text-brand dark:text-white"
                ></iconify-icon>
                <iconify-icon
                  icon="ph:arrow-right-bold"
                  class="text-xl text-gray-400"
                ></iconify-icon>
                <iconify-icon
                  [attr.icon]="t.targetIcon"
                  class="text-3xl text-brand dark:text-white"
                ></iconify-icon>
              </div>
              <div>
                <p class="font-semibold text-brand dark:text-white">
                  {{ t.target_playlist_name }}
                </p>
                <p class="text-xs text-brand/60 dark:text-white/60">
                  {{ t.sourceLabel }} → {{ t.targetLabel }} ·
                  {{ t.matched_tracks }}/{{ t.total_tracks }}
                  {{ 'history.tracksProcessed' | transloco }}
                </p>
                <p class="mt-1 text-xs text-brand/40 dark:text-white/40">
                  {{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                [class.bg-green-100]="t.status === 'completed'"
                [class.text-green-700]="t.status === 'completed'"
                [class.bg-yellow-100]="t.status === 'partial' || t.status === 'running'"
                [class.text-yellow-700]="t.status === 'partial' || t.status === 'running'"
                [class.bg-gray-100]="t.status === 'pending'"
                [class.text-gray-700]="t.status === 'pending'"
                [class.bg-red-100]="t.status === 'failed'"
                [class.text-red-700]="t.status === 'failed'"
              >
                {{ t.status }}
              </span>

              @if (t.targetUrl) {
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
            </div>
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
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Falha ao carregar historico'));
      },
    });
  }
}
