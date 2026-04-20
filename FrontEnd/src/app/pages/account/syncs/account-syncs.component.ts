import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ApiService,
  PlaylistSync,
  SyncStatus,
} from '../../../core/services/api.service';
import { formatApiError } from '../../../core/utils/format-error';
import { providerIcon, providerLabel } from '../../../core/utils/playlist-url';

@Component({
  selector: 'app-account-syncs',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-brand dark:text-white">
          {{ 'syncs.title' | transloco }}
        </h1>
        <p class="mt-1 text-brand/60 dark:text-white/60">
          {{ 'syncs.subtitle' | transloco }}
        </p>
      </div>
      <a [routerLink]="['/transfer/new']" class="btn-primary">
        {{ 'syncs.newSync' | transloco }}
      </a>
    </div>

    @if (error()) {
      <p class="alert-error mt-6">{{ error() }}</p>
    }

    @if (loading()) {
      <p class="mt-8 text-brand/70 dark:text-white/70">Carregando...</p>
    } @else if (syncs().length === 0) {
      <div class="empty-box mt-10 min-h-[260px]">
        <iconify-icon
          icon="ph:arrows-clockwise-duotone"
          class="mb-4 text-5xl text-brand/40 dark:text-white/40"
        ></iconify-icon>
        <p class="text-lg font-medium text-brand/60 dark:text-white/60">
          {{ 'syncs.empty' | transloco }}
        </p>
        <p class="mt-2 max-w-md text-sm text-brand/50 dark:text-white/50">
          {{ 'syncs.emptyHint' | transloco }}
        </p>
      </div>
    } @else {
      <div class="mt-8 space-y-4">
        @for (s of syncs(); track s.id) {
          <div
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-mutedDark"
          >
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <iconify-icon
                  [attr.icon]="icon(s.source_provider)"
                  class="text-3xl text-brand dark:text-white"
                ></iconify-icon>
                <iconify-icon icon="ph:arrows-clockwise-duotone" class="text-xl text-brand-accent"></iconify-icon>
                <iconify-icon
                  [attr.icon]="icon(s.target_provider)"
                  class="text-3xl text-brand dark:text-white"
                ></iconify-icon>
              </div>

              <div class="flex-1">
                <p class="font-semibold text-brand dark:text-white">
                  {{ s.source_playlist_name || s.source_playlist_id }}
                  <span class="text-brand/40 dark:text-white/40">→</span>
                  {{ s.target_playlist_name || s.target_playlist_id }}
                </p>
                <p class="text-xs text-brand/60 dark:text-white/60">
                  {{ label(s.source_provider) }} → {{ label(s.target_provider) }}
                  @if (s.last_synced_at) {
                    · {{ 'syncs.lastSync' | transloco }}:
                    {{ s.last_synced_at | date: 'dd/MM/yyyy HH:mm' }}
                  }
                </p>
              </div>

              <label class="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="peer sr-only"
                  [checked]="s.status === 'active'"
                  (change)="toggle(s)"
                />
                <span
                  class="relative h-6 w-11 rounded-full bg-gray-300 transition-colors
                         peer-checked:bg-brand-accent dark:bg-white/15
                         after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform
                         peer-checked:after:translate-x-5"
                ></span>
                <span class="text-sm font-medium">
                  {{
                    s.status === 'active'
                      ? ('syncs.active' | transloco)
                      : ('syncs.paused' | transloco)
                  }}
                </span>
              </label>

              <button
                type="button"
                (click)="remove(s.id)"
                class="text-brand/50 transition-colors hover:text-red-600"
                [attr.aria-label]="'syncs.remove' | transloco"
              >
                <iconify-icon icon="ph:trash-duotone" class="text-xl"></iconify-icon>
              </button>
            </div>

            @if (s.last_error) {
              <p class="alert-error mt-3 p-3 text-xs">{{ s.last_error }}</p>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AccountSyncsComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly syncs = signal<PlaylistSync[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listSyncs().subscribe({
      next: (list) => {
        this.syncs.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Falha ao carregar sincronizacoes'));
      },
    });
  }

  toggle(s: PlaylistSync): void {
    const next: SyncStatus = s.status === 'active' ? 'paused' : 'active';
    this.api.toggleSync(s.id, next).subscribe({ next: () => this.load() });
  }

  remove(id: string): void {
    this.api.deleteSync(id).subscribe({ next: () => this.load() });
  }

  icon(p: string): string {
    return providerIcon(p as never);
  }
  label(p: string): string {
    return providerLabel(p as never);
  }
}
