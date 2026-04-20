import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-account-syncs',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
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

    <div
      class="mt-10 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-surface-muted p-10 text-center dark:border-white/15 dark:bg-surface-mutedDark"
    >
      <iconify-icon
        icon="ph:arrows-clockwise-duotone"
        class="mb-4 text-5xl text-brand/40 dark:text-white/40"
      ></iconify-icon>
      <p class="text-lg font-medium text-brand/60 dark:text-white/60">
        {{ 'syncs.empty' | transloco }}
      </p>
    </div>
  `,
})
export class AccountSyncsComponent {}
