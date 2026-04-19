import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <footer class="mt-16 bg-brand-dark text-white">
      <div
        class="container mx-auto flex flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row"
      >
        <div class="flex items-center gap-3">
          <iconify-icon
            icon="ph:music-notes-plus-duotone"
            class="text-3xl text-brand-accent"
          ></iconify-icon>
          <span class="text-lg font-bold">ITransferMusic</span>
        </div>

        <div class="flex items-center gap-5 text-xl">
          <a
            href="https://github.com/G2Martins"
            target="_blank"
            rel="noreferrer"
            class="transition-colors hover:text-brand-accent"
            aria-label="GitHub"
          >
            <iconify-icon icon="ph:github-logo-duotone"></iconify-icon>
          </a>
          <a
            href="#"
            class="transition-colors hover:text-brand-accent"
            aria-label="Instagram"
          >
            <iconify-icon icon="ph:instagram-logo-duotone"></iconify-icon>
          </a>
          <a
            href="#"
            class="transition-colors hover:text-brand-accent"
            aria-label="Twitter"
          >
            <iconify-icon icon="ph:x-logo-duotone"></iconify-icon>
          </a>
        </div>

        <p class="text-sm text-white/60">
          © {{ year }} ITransferMusic - {{ 'footer.rights' | transloco }}
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
