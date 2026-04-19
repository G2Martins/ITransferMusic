import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container mx-auto max-w-3xl px-6 py-16">
      <h1 class="text-4xl font-bold text-brand">{{ 'help.title' | transloco }}</h1>
      <p class="mt-3 text-brand/70">{{ 'help.subtitle' | transloco }}</p>

      <div class="mt-10 space-y-4">
        @for (item of faqs; track item.q) {
          <details class="card cursor-pointer">
            <summary class="flex items-center justify-between font-semibold text-brand">
              {{ item.q | transloco }}
              <span class="text-brand-accent">+</span>
            </summary>
            <p class="mt-3 text-brand/70">{{ item.a | transloco }}</p>
          </details>
        }
      </div>
    </section>
  `,
})
export class HelpComponent {
  readonly faqs = [{ q: 'help.faq.q1', a: 'help.faq.a1' }];
}
