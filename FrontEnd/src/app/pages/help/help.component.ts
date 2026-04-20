import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

interface FAQ {
  q: string;
  a: string;
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container mx-auto max-w-3xl px-6 py-16">
      <h1 class="text-4xl font-bold text-brand dark:text-white">
        {{ 'help.title' | transloco }}
      </h1>
      <p class="mt-3 text-brand/70 dark:text-white/70">
        {{ 'help.subtitle' | transloco }}
      </p>

      <div class="mt-10 space-y-4">
        @for (item of faqs; track item.q) {
          <details
            class="card cursor-pointer transition-shadow open:shadow-lg"
          >
            <summary
              class="flex items-center justify-between gap-4 font-semibold text-brand dark:text-white"
            >
              <span>{{ item.q | transloco }}</span>
              <span class="text-2xl text-brand-accent transition-transform">+</span>
            </summary>
            <p
              class="mt-4 whitespace-pre-line text-sm leading-relaxed text-brand/70 dark:text-white/70"
            >
              {{ item.a | transloco }}
            </p>
          </details>
        }
      </div>
    </section>
  `,
})
export class HelpComponent {
  readonly faqs: FAQ[] = [
    { q: 'help.faq.q1', a: 'help.faq.a1' },
    { q: 'help.faq.q2', a: 'help.faq.a2' },
    { q: 'help.faq.q3', a: 'help.faq.a3' },
    { q: 'help.faq.q4', a: 'help.faq.a4' },
    { q: 'help.faq.q5', a: 'help.faq.a5' },
    { q: 'help.faq.q6', a: 'help.faq.a6' },
    { q: 'help.faq.q7', a: 'help.faq.a7' },
    { q: 'help.faq.q8', a: 'help.faq.a8' },
    { q: 'help.faq.q9', a: 'help.faq.a9' },
  ];
}
