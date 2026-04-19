import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <a
      [routerLink]="['/feature', slug()]"
      class="group flex flex-col items-center text-center focus:outline-none"
    >
      <div
        class="card flex h-32 w-32 items-center justify-center transition-transform duration-300
               group-hover:-translate-y-1 group-hover:scale-110"
      >
        <iconify-icon
          [attr.icon]="icon()"
          class="text-5xl text-brand-accent"
          aria-hidden="true"
        ></iconify-icon>
      </div>
      <h3 class="mt-4 text-lg font-bold text-brand">{{ titleKey() | transloco }}</h3>
      <p class="mt-2 max-w-xs text-sm text-brand/70">{{ descKey() | transloco }}</p>
    </a>
  `,
})
export class FeatureCardComponent {
  readonly slug = input.required<string>();
  readonly icon = input.required<string>();
  readonly titleKey = input.required<string>();
  readonly descKey = input.required<string>();
}
