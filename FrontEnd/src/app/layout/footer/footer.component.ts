import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <footer class="mt-16 bg-brand-dark text-white">
      <div class="container mx-auto px-6 py-14">
        <div
          class="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 md:grid-cols-4"
        >
          <!-- Logo + descricao -->
          <div class="flex flex-col items-start gap-4">
            <a [routerLink]="['/']" class="inline-flex" aria-label="ITransferMusic">
              <img
                src="logos/logo-horizontal.png"
                alt="ITransferMusic"
                class="h-20 w-auto object-contain"
              />
            </a>
            <p class="max-w-xs text-sm leading-relaxed text-white/70">
              {{ 'footer.tagline' | transloco }}
            </p>
          </div>

          <!-- Links -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
              {{ 'footer.navigate' | transloco }}
            </h3>
            <ul class="space-y-2 text-sm text-white/70">
              <li>
                <a [routerLink]="['/']" class="transition-colors hover:text-brand-accent">
                  Home
                </a>
              </li>
              <li>
                <a
                  [routerLink]="['/help']"
                  class="transition-colors hover:text-brand-accent"
                >
                  {{ 'nav.help' | transloco }}
                </a>
              </li>
              <li>
                <a
                  [routerLink]="['/contact']"
                  class="transition-colors hover:text-brand-accent"
                >
                  {{ 'nav.contact' | transloco }}
                </a>
              </li>
              <li>
                <a
                  [routerLink]="['/dashboard']"
                  class="transition-colors hover:text-brand-accent"
                >
                  {{ 'nav.dashboard' | transloco }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
              {{ 'footer.legal' | transloco }}
            </h3>
            <ul class="space-y-2 text-sm text-white/70">
              <li>
                <a
                  [routerLink]="['/terms']"
                  class="transition-colors hover:text-brand-accent"
                >
                  {{ 'footer.terms' | transloco }}
                </a>
              </li>
              <li>
                <a
                  [routerLink]="['/privacy']"
                  class="transition-colors hover:text-brand-accent"
                >
                  {{ 'footer.privacy' | transloco }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Social -->
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
              {{ 'footer.follow' | transloco }}
            </h3>
            <div class="flex items-center gap-4 text-2xl">
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
              <a
                href="#"
                class="transition-colors hover:text-brand-accent"
                aria-label="LinkedIn"
              >
                <iconify-icon icon="ph:linkedin-logo-duotone"></iconify-icon>
              </a>
            </div>
          </div>
        </div>

        <p class="mt-6 text-center text-sm text-white/60">
          © {{ year }} ITransferMusic - {{ 'footer.rights' | transloco }}
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
