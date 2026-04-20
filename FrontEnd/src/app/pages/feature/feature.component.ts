import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { FEATURES, FeatureDef } from '../../shared/features.data';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (feature(); as f) {
      <section class="container mx-auto max-w-4xl px-6 py-16">
        <a
          [routerLink]="['/']"
          class="mb-8 inline-flex items-center gap-2 text-brand/70 transition-colors hover:text-brand-accent dark:text-white/70"
        >
          <iconify-icon icon="ph:arrow-left-bold"></iconify-icon>
          Home
        </a>

        <div class="flex flex-col items-center text-center">
          <div class="card flex h-28 w-28 items-center justify-center">
            <iconify-icon
              [attr.icon]="f.icon"
              class="text-5xl text-brand-accent"
            ></iconify-icon>
          </div>
          <h1 class="mt-6 text-4xl font-bold text-brand dark:text-white">
            {{ f.titleKey | transloco }}
          </h1>
          <p class="mt-4 max-w-2xl text-lg text-brand/70 dark:text-white/70">
            {{ f.descKey | transloco }}
          </p>
          <button
            type="button"
            (click)="goToCta(f)"
            class="btn-primary mt-8"
          >
            {{ 'home.hero.cta' | transloco }}
          </button>
        </div>
      </section>
    } @else {
      <section class="container mx-auto px-6 py-24 text-center">
        <h1 class="text-3xl font-bold text-brand dark:text-white">
          Funcionalidade não encontrada.
        </h1>
        <a [routerLink]="['/']" class="btn-primary mt-8 inline-flex">Voltar</a>
      </section>
    }
  `,
})
export class FeatureComponent {
  readonly slug = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly feature = computed<FeatureDef | undefined>(() =>
    FEATURES.find((f) => f.slug === this.slug()),
  );

  goToCta(f: FeatureDef): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { redirect: f.cta } });
      return;
    }
    this.router.navigateByUrl(f.cta);
  }
}
