import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { FEATURES, FeatureDef } from '../../shared/features.data';

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
          class="mb-8 inline-flex items-center gap-2 text-brand/70 transition-colors hover:text-brand-accent"
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
          <h1 class="mt-6 text-4xl font-bold text-brand">
            {{ f.titleKey | transloco }}
          </h1>
          <p class="mt-4 max-w-2xl text-lg text-brand/70">
            {{ f.descKey | transloco }}
          </p>
          <a [routerLink]="['/auth/login']" class="btn-primary mt-8">
            {{ 'home.hero.cta' | transloco }}
          </a>
        </div>
      </section>
    } @else {
      <section class="container mx-auto px-6 py-24 text-center">
        <h1 class="text-3xl font-bold text-brand">Funcionalidade não encontrada.</h1>
        <a [routerLink]="['/']" class="btn-primary mt-8 inline-flex">Voltar</a>
      </section>
    }
  `,
})
export class FeatureComponent {
  readonly slug = input<string>();

  readonly feature = computed<FeatureDef | undefined>(() =>
    FEATURES.find((f) => f.slug === this.slug()),
  );
}
