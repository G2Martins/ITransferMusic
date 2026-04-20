import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ApiService,
  LinkedAccount,
  Provider,
  TransferResponse,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatApiError } from '../../core/utils/format-error';
import { providerIcon, providerLabel } from '../../core/utils/playlist-url';

interface ProviderMeta {
  id: Provider;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-5xl px-6 py-12">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-brand dark:text-white md:text-4xl">
          {{ 'dashboard.greeting' | transloco }}, {{ auth.firstName() || '...' }}!
        </h1>
        <p class="mt-2 text-brand/60 dark:text-white/60">
          {{ 'dashboard.subtitle' | transloco }}
        </p>
      </header>

      <!-- CTA principal -->
      <a
        [routerLink]="['/transfer/new']"
        class="block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-accent to-brand-accentDark p-10 text-white shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
      >
        <div class="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm uppercase tracking-wider text-white/70">
              {{ 'dashboard.ctaLabel' | transloco }}
            </p>
            <h2 class="mt-2 text-3xl font-extrabold md:text-4xl">
              {{ 'dashboard.ctaTitle' | transloco }}
            </h2>
            <p class="mt-3 max-w-xl text-white/80">
              {{ 'dashboard.ctaDesc' | transloco }}
            </p>
          </div>
          <div class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <iconify-icon
              icon="ph:arrows-left-right-duotone"
              class="text-5xl"
            ></iconify-icon>
          </div>
        </div>
      </a>

      <!-- Atalhos -->
      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
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

      <!-- Contas vinculadas (resumo) -->
      <div class="mt-10">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-xl font-semibold text-brand dark:text-white">
            {{ 'dashboard.linkedShort' | transloco }}
          </h3>
          <a
            [routerLink]="['/account/profile']"
            class="text-sm font-semibold text-brand-accent hover:underline"
          >
            {{ 'dashboard.manage' | transloco }} →
          </a>
        </div>
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          @for (p of providers; track p.id) {
            <div
              class="flex items-center gap-2 rounded-xl border p-3 text-sm"
              [class.border-brand-accent]="isLinked(p.id)"
              [class.border-gray-200]="!isLinked(p.id)"
              [class.dark:border-white/10]="!isLinked(p.id)"
            >
              <iconify-icon [attr.icon]="p.icon" class="text-2xl"></iconify-icon>
              <span class="truncate font-medium">{{ p.label }}</span>
              @if (isLinked(p.id)) {
                <iconify-icon
                  icon="ph:check-circle-fill"
                  class="ml-auto text-lg text-green-500"
                ></iconify-icon>
              }
            </div>
          }
        </div>
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

  // referenciado apenas indiretamente via template
  protected readonly formatApiError = formatApiError;
}
