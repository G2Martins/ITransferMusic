import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-5xl px-6 py-10">
      <!-- Abas -->
      <nav
        class="mb-8 flex flex-wrap gap-1 border-b border-gray-200 dark:border-white/10"
      >
        <a
          [routerLink]="['/account/profile']"
          routerLinkActive="tab-link-active"
          class="tab-link"
        >
          <iconify-icon icon="ph:gear-duotone" class="text-lg"></iconify-icon>
          {{ 'account.tabs.profile' | transloco }}
        </a>
        <a
          [routerLink]="['/account/syncs']"
          routerLinkActive="tab-link-active"
          class="tab-link"
        >
          <iconify-icon icon="ph:arrows-clockwise-duotone" class="text-lg"></iconify-icon>
          {{ 'account.tabs.syncs' | transloco }}
        </a>
        <a
          [routerLink]="['/account/history']"
          routerLinkActive="tab-link-active"
          class="tab-link"
        >
          <iconify-icon icon="ph:clock-counter-clockwise-duotone" class="text-lg"></iconify-icon>
          {{ 'account.tabs.history' | transloco }}
        </a>
      </nav>

      <router-outlet />
    </section>
  `,
})
export class AccountLayoutComponent {}
