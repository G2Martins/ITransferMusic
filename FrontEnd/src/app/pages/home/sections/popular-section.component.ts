import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

interface Conversion {
  from: string;
  to: string;
  fromIcon: string;
  toIcon: string;
  label: string;
}

@Component({
  selector: 'app-popular-section',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="bg-gray-50 px-6 py-20 dark:bg-brand-dark">
      <div class="container mx-auto max-w-3xl">
        <h2 class="text-center text-3xl font-bold text-brand dark:text-white md:text-4xl">
          <span class="text-brand-accent">{{ 'popular.titleHighlight' | transloco }}</span>
          {{ 'popular.title' | transloco }}
        </h2>

        <div class="mt-10 space-y-4">
          @for (c of conversions; track c.label) {
            <div
              class="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm
                     transition-shadow hover:shadow-md dark:bg-surface-mutedDark dark:shadow-black/40"
            >
              <div class="flex items-center gap-3">
                <iconify-icon
                  [attr.icon]="c.fromIcon"
                  class="text-2xl text-brand dark:text-white"
                ></iconify-icon>
                <iconify-icon
                  icon="ph:arrow-right-bold"
                  class="text-xl text-brand/40 dark:text-white/40"
                ></iconify-icon>
                <iconify-icon
                  [attr.icon]="c.toIcon"
                  class="text-2xl text-brand dark:text-white"
                ></iconify-icon>
                <span class="font-medium text-brand dark:text-white">
                  {{ c.from }} {{ 'popular.toWord' | transloco }} {{ c.to }}
                </span>
              </div>
              <a
                [routerLink]="['/dashboard']"
                class="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white
                       transition-transform hover:scale-105 hover:bg-brand-accentDark"
              >
                {{ 'popular.convert' | transloco }}
              </a>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class PopularSectionComponent {
  readonly conversions: Conversion[] = [
    {
      from: 'Spotify',
      to: 'YouTube',
      fromIcon: 'simple-icons:spotify',
      toIcon: 'simple-icons:youtube',
      label: 'spotify-youtube',
    },
    {
      from: 'YouTube',
      to: 'Spotify',
      fromIcon: 'simple-icons:youtube',
      toIcon: 'simple-icons:spotify',
      label: 'youtube-spotify',
    },
  ];
}
