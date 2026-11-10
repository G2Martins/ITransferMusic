import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PROJECT_URL } from './data/site';
import { I18n } from './i18n/i18n';
import { Toast } from './state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#conteudo" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">{{ t('common.skip') }}</a>

    <!-- Portfolio disclaimer: always visible, first thing a visitor reads. -->
    <div class="border-b border-line bg-plum text-[12.5px] leading-snug text-plum-ink">
      <div class="wrap flex items-center justify-center gap-2 py-2 text-center">
        <span class="live-dot hidden h-1.5 w-1.5 shrink-0 rounded-full bg-accent-hi sm:inline-block"></span>
        <p>
          {{ t('disclaimer.text') }}
          <a [href]="project" class="ml-1 whitespace-nowrap font-medium text-white underline underline-offset-2">{{ t('disclaimer.link') }}</a>
        </p>
      </div>
    </div>

    <router-outlet />

    <!-- Visual toast + polite live region for every action. -->
    <div role="status" aria-live="polite" aria-atomic="true" class="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
      @if (toast.message()) {
        <p class="materialize flex max-w-md items-center gap-2.5 rounded-full bg-plum px-4 py-2.5 text-[13.5px] text-white shadow-2xl shadow-black/25">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-hi" aria-hidden="true"></span> {{ toast.message() }}
        </p>
      }
    </div>
  `,
})
export class App {
  protected toast = inject(Toast);
  protected t = inject(I18n).t;
  protected readonly project = PROJECT_URL;

  constructor() {
    const i18n = inject(I18n);
    afterNextRender(() => i18n.restore());
  }
}
