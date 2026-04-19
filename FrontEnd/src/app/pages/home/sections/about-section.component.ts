import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-about-section',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-white px-6 py-20">
      <div
        class="container mx-auto flex max-w-5xl flex-col items-center gap-12 md:flex-row md:items-start"
      >
        <div class="flex-shrink-0">
          <img
            src="logos/mascot.png"
            alt="ITransferMusic mascot"
            class="h-[260px] w-[260px] object-contain drop-shadow-xl"
          />
        </div>

        <div class="flex-1 text-left">
          <h2 class="text-3xl font-bold leading-tight text-brand md:text-4xl">
            {{ 'about.titlePrefix' | transloco }}<span class="text-brand-accent">{{
              'about.titleHighlight' | transloco
            }}</span
            >{{ 'about.titleSuffix' | transloco }}
          </h2>

          <p class="mt-6 text-base leading-relaxed text-brand/80 md:text-lg">
            {{ 'about.p1' | transloco }}
          </p>

          <p
            class="mt-5 text-base leading-relaxed text-brand/80 md:text-lg"
            [innerHTML]="'about.p2' | transloco"
          ></p>
        </div>
      </div>
    </section>
  `,
})
export class AboutSectionComponent {}
