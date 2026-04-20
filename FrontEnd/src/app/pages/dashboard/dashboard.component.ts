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

import {
  ApiService,
  LinkedAccount,
  Provider,
  TransferResponse,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  playlistUrl,
  providerIcon,
  providerLabel,
} from '../../core/utils/playlist-url';

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
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, NgClass, RouterLink, TranslocoPipe],
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
          <div
            class="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-white/15"
          >
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
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="{
                      'bg-green-100 text-green-700': c.status === 'completed',
                      'bg-yellow-100 text-yellow-700': c.status === 'partial' || c.status === 'running',
                      'bg-gray-100 text-gray-700': c.status === 'pending',
                      'bg-red-100 text-red-700': c.status === 'failed'
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
                    <a
                      [routerLink]="['/account/syncs']"
                      class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand transition-colors hover:border-brand-accent hover:text-brand-accent dark:border-white/15 dark:text-white"
                    >
                      <iconify-icon icon="ph:arrows-clockwise-duotone" class="text-lg"></iconify-icon>
                      {{ 'dashboard.sync' | transloco }}
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>
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

  readonly totalLinked = computed(() => this.linked().length);
  readonly totalTransfers = computed(() => this.transfers().length);

  readonly cards = computed<PlaylistCard[]>(() =>
    this.transfers()
      .filter((t) => t.target_playlist_id)
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
      })),
  );

  ngOnInit(): void {
    this.auth.hydrate();
    this.api.listLinkedAccounts().subscribe({
      next: (a) => this.linked.set(a),
      error: () => this.linked.set([]),
    });
    this.api.listTransfers().subscribe({
      next: (t) => this.transfers.set(t),
      error: () => this.transfers.set([]),
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
}
