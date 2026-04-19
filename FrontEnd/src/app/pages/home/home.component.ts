import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { FEATURES } from '../../shared/features.data';
import { FeatureCardComponent } from '../../shared/feature-card/feature-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, FeatureCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Hero -->
    <section
      class="bg-gradient-to-br from-brand via-brand to-brand-dark px-6 py-20 text-white md:py-28"
    >
      <div class="container mx-auto flex flex-col items-center text-center">
        <iconify-icon
          icon="ph:music-notes-plus-duotone"
          class="mb-6 text-7xl text-brand-accent"
        ></iconify-icon>
        <h1 class="max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
          {{ 'home.hero.title' | transloco }}
        </h1>
        <p class="mt-6 max-w-2xl text-lg text-white/80">
          {{ 'home.hero.subtitle' | transloco }}
        </p>
        <a [routerLink]="['/auth/register']" class="btn-primary mt-10">
          {{ 'home.hero.cta' | transloco }}
          <iconify-icon icon="ph:arrow-right-bold" class="ml-2"></iconify-icon>
        </a>
      </div>
    </section>

    <!-- Features -->
    <section class="bg-white px-6 py-20">
      <div class="container mx-auto max-w-5xl text-center">
        <h2 class="text-3xl font-bold text-brand md:text-4xl">
          {{ 'home.featuresTitle' | transloco }}
          <span class="text-brand-accent">{{ 'home.featuresHighlight' | transloco }}</span>
        </h2>

        <div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          @for (f of features; track f.slug) {
            <app-feature-card
              [slug]="f.slug"
              [icon]="f.icon"
              [titleKey]="f.titleKey"
              [descKey]="f.descKey"
            />
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent {
  readonly features = FEATURES;
}
