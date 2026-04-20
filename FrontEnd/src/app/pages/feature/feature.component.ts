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

interface Step {
  icon: string;
  titleKey: string;
  descKey: string;
}

interface Benefit {
  icon: string;
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (feature(); as f) {
      <section class="bg-gradient-to-br from-brand via-brand to-brand-dark px-6 py-20 text-white md:py-28">
        <div class="container mx-auto max-w-5xl">
          <a
            [routerLink]="['/']"
            class="mb-8 inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
          >
            <iconify-icon icon="ph:arrow-left-bold"></iconify-icon>
            Home
          </a>

          <div class="flex flex-col items-center gap-10 text-center md:flex-row md:text-left">
            <div class="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-3xl bg-white/10 backdrop-blur">
              <iconify-icon
                [attr.icon]="f.icon"
                class="text-6xl text-brand-accent"
              ></iconify-icon>
            </div>
            <div class="flex-1">
              <h1 class="text-4xl font-extrabold leading-tight md:text-5xl">
                {{ 'features.' + f.slug + '.heroTitle' | transloco }}
              </h1>
              <p class="mt-4 text-lg text-white/80">
                {{ 'features.' + f.slug + '.heroSubtitle' | transloco }}
              </p>
              <button type="button" (click)="goToCta(f)" class="btn-primary mt-8">
                {{ 'home.hero.cta' | transloco }}
                <iconify-icon icon="ph:arrow-right-bold" class="ml-2"></iconify-icon>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Como funciona -->
      <section class="bg-white px-6 py-20 dark:bg-surface-dark">
        <div class="container mx-auto max-w-5xl">
          <h2 class="text-center text-3xl font-bold text-brand dark:text-white md:text-4xl">
            {{ 'features.howItWorks' | transloco }}
          </h2>
          <div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            @for (step of steps(); track $index; let i = $index) {
              <div class="card relative">
                <div
                  class="absolute -top-4 -left-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-lg font-bold text-white"
                >
                  {{ i + 1 }}
                </div>
                <iconify-icon
                  [attr.icon]="step.icon"
                  class="text-4xl text-brand-accent"
                ></iconify-icon>
                <h3 class="mt-4 text-xl font-bold text-brand dark:text-white">
                  {{ step.titleKey | transloco }}
                </h3>
                <p class="mt-2 text-sm text-brand/70 dark:text-white/70">
                  {{ step.descKey | transloco }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Beneficios -->
      <section class="bg-surface-muted px-6 py-20 dark:bg-brand-dark">
        <div class="container mx-auto max-w-5xl">
          <h2 class="text-center text-3xl font-bold text-brand dark:text-white md:text-4xl">
            {{ 'features.benefits' | transloco }}
          </h2>
          <div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            @for (b of benefits(); track b.titleKey) {
              <div class="card flex items-start gap-4">
                <div
                  class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-accent/10"
                >
                  <iconify-icon
                    [attr.icon]="b.icon"
                    class="text-2xl text-brand-accent"
                  ></iconify-icon>
                </div>
                <div>
                  <h3 class="font-bold text-brand dark:text-white">
                    {{ b.titleKey | transloco }}
                  </h3>
                  <p class="mt-1 text-sm text-brand/70 dark:text-white/70">
                    {{ b.descKey | transloco }}
                  </p>
                </div>
              </div>
            }
          </div>

          <div class="mt-12 text-center">
            <button type="button" (click)="goToCta(f)" class="btn-primary">
              {{ 'home.hero.cta' | transloco }}
            </button>
          </div>
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

  readonly steps = computed<Step[]>(() => {
    const f = this.feature();
    if (!f) return [];
    const prefix = `features.${f.slug}.steps`;
    if (f.slug === 'transferir') {
      return [
        { icon: 'ph:plug-duotone', titleKey: `${prefix}.s1t`, descKey: `${prefix}.s1d` },
        { icon: 'ph:list-checks-duotone', titleKey: `${prefix}.s2t`, descKey: `${prefix}.s2d` },
        { icon: 'ph:arrow-square-in-duotone', titleKey: `${prefix}.s3t`, descKey: `${prefix}.s3d` },
      ];
    }
    if (f.slug === 'sincronizar') {
      return [
        { icon: 'ph:plug-duotone', titleKey: `${prefix}.s1t`, descKey: `${prefix}.s1d` },
        { icon: 'ph:git-branch-duotone', titleKey: `${prefix}.s2t`, descKey: `${prefix}.s2d` },
        { icon: 'ph:clock-clockwise-duotone', titleKey: `${prefix}.s3t`, descKey: `${prefix}.s3d` },
      ];
    }
    if (f.slug === 'gerador') {
      return [
        { icon: 'ph:sparkle-duotone', titleKey: `${prefix}.s1t`, descKey: `${prefix}.s1d` },
        { icon: 'ph:sliders-duotone', titleKey: `${prefix}.s2t`, descKey: `${prefix}.s2d` },
        { icon: 'ph:cloud-arrow-up-duotone', titleKey: `${prefix}.s3t`, descKey: `${prefix}.s3d` },
      ];
    }
    return [
      { icon: 'ph:link-duotone', titleKey: `${prefix}.s1t`, descKey: `${prefix}.s1d` },
      { icon: 'ph:share-network-duotone', titleKey: `${prefix}.s2t`, descKey: `${prefix}.s2d` },
      { icon: 'ph:heart-duotone', titleKey: `${prefix}.s3t`, descKey: `${prefix}.s3d` },
    ];
  });

  readonly benefits = computed<Benefit[]>(() => {
    const f = this.feature();
    if (!f) return [];
    const prefix = `features.${f.slug}.benefits`;
    return [
      { icon: 'ph:lightning-duotone', titleKey: `${prefix}.b1t`, descKey: `${prefix}.b1d` },
      { icon: 'ph:shield-check-duotone', titleKey: `${prefix}.b2t`, descKey: `${prefix}.b2d` },
      { icon: 'ph:infinity-duotone', titleKey: `${prefix}.b3t`, descKey: `${prefix}.b3d` },
      { icon: 'ph:smiley-duotone', titleKey: `${prefix}.b4t`, descKey: `${prefix}.b4d` },
    ];
  });

  goToCta(f: FeatureDef): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { redirect: f.cta } });
      return;
    }
    this.router.navigateByUrl(f.cta);
  }
}
