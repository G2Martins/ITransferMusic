import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  ApiService,
  PlaylistSync,
  SyncStatus,
  TransferResponse,
} from '../../../core/services/api.service';
import { formatApiError } from '../../../core/utils/format-error';
import { providerIcon, providerLabel } from '../../../core/utils/playlist-url';
import {
  SyncSetupInput,
  SyncSetupModalComponent,
} from '../../../shared/sync-setup-modal/sync-setup-modal.component';

@Component({
  selector: 'app-account-syncs',
  standalone: true,
  imports: [DatePipe, SyncSetupModalComponent, TranslocoPipe],
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
      <button type="button" class="btn-primary" (click)="openPicker()">
        {{ 'syncs.newSync' | transloco }}
      </button>
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

    <!-- Picker: escolhe uma transferência ativa -->
    @if (pickerOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        (click)="closePicker()"
      >
        <div
          class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-surface-mutedDark"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between">
            <h3 class="text-xl font-bold text-brand dark:text-white">
              {{ 'syncs.pickerTitle' | transloco }}
            </h3>
            <button
              type="button"
              (click)="closePicker()"
              class="rounded-full p-1 text-brand/60 hover:text-brand-accent dark:text-white/60"
              aria-label="Fechar"
            >
              <iconify-icon icon="ph:x-bold" class="text-xl"></iconify-icon>
            </button>
          </div>
          <p class="mt-2 text-sm text-muted">
            {{ 'syncs.pickerSubtitle' | transloco }}
          </p>

          @if (loadingTransfers()) {
            <p class="mt-6 text-sm text-muted">Carregando...</p>
          } @else if (eligibleTransfers().length === 0) {
            <div class="empty-box mt-6 min-h-[180px]">
              <iconify-icon icon="ph:arrows-left-right-duotone" class="mb-3 text-4xl text-brand/40 dark:text-white/40"></iconify-icon>
              <p class="text-sm text-muted">{{ 'syncs.pickerEmpty' | transloco }}</p>
            </div>
          } @else {
            <div class="mt-4 max-h-96 space-y-2 overflow-y-auto pr-2">
              @for (t of eligibleTransfers(); track t.id) {
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-xl surface-border p-3 text-left transition-colors hover:border-brand-accent"
                  (click)="chooseTransfer(t)"
                >
                  <iconify-icon [attr.icon]="icon(t.source_provider)" class="text-2xl text-brand dark:text-white"></iconify-icon>
                  <iconify-icon icon="ph:arrow-right-bold" class="text-brand/40 dark:text-white/40"></iconify-icon>
                  <iconify-icon [attr.icon]="icon(t.target_provider)" class="text-2xl text-brand dark:text-white"></iconify-icon>
                  <div class="flex-1 min-w-0">
                    <p class="truncate text-sm font-semibold text-brand dark:text-white">
                      {{ t.target_playlist_name }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ t.matched_tracks }}/{{ t.total_tracks }} faixas
                    </p>
                  </div>
                  <iconify-icon icon="ph:caret-right-bold" class="text-brand/40 dark:text-white/40"></iconify-icon>
                </button>
              }
            </div>
          }
        </div>
      </div>
    }

    <app-sync-setup-modal
      [data]="syncModalData()"
      (closed)="closeSyncModal()"
      (created)="onSyncCreated()"
    />
  `,
})
export class AccountSyncsComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly syncs = signal<PlaylistSync[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly pickerOpen = signal(false);
  readonly loadingTransfers = signal(false);
  readonly eligibleTransfers = signal<TransferResponse[]>([]);

  readonly syncModalData = signal<SyncSetupInput | null>(null);

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

  openPicker(): void {
    this.pickerOpen.set(true);
    this.loadingTransfers.set(true);
    this.api.listTransfers().subscribe({
      next: (list) => {
        const candidates = list.filter((t) => t.target_playlist_id);
        if (candidates.length === 0) {
          this.eligibleTransfers.set([]);
          this.loadingTransfers.set(false);
          return;
        }
        const checks = candidates.map((t) =>
          this.api.checkTransferAlive(t.id).pipe(
            map((r) => ({ t, alive: r.alive })),
            catchError(() => of({ t, alive: true })),
          ),
        );
        forkJoin(checks).subscribe((results) => {
          this.eligibleTransfers.set(results.filter((r) => r.alive).map((r) => r.t));
          this.loadingTransfers.set(false);
        });
      },
      error: () => {
        this.loadingTransfers.set(false);
        this.eligibleTransfers.set([]);
      },
    });
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  chooseTransfer(t: TransferResponse): void {
    this.pickerOpen.set(false);
    this.syncModalData.set({
      name: t.target_playlist_name,
      sourceProvider: t.source_provider,
      sourcePlaylistId: t.source_playlist_id,
      targetProvider: t.target_provider,
      targetPlaylistId: t.target_playlist_id!,
      totalTracks: t.total_tracks,
    });
  }

  closeSyncModal(): void {
    this.syncModalData.set(null);
  }

  onSyncCreated(): void {
    this.load();
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
