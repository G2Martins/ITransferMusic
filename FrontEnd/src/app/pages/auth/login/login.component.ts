import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../../core/services/auth.service';
import { formatApiError } from '../../../core/utils/format-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-md px-6 py-20">
      <div class="card">
        <div class="mb-6 flex items-center justify-center">
          <iconify-icon
            icon="ph:sign-in-duotone"
            class="text-5xl text-brand-accent"
          ></iconify-icon>
        </div>
        <h1 class="text-center text-2xl font-bold text-brand">
          {{ 'auth.login.title' | transloco }}
        </h1>

        <form (ngSubmit)="submit()" class="mt-6 space-y-4">
          <input
            class="input-base"
            type="email"
            [(ngModel)]="email"
            name="email"
            required
            [attr.placeholder]="'auth.login.emailLabel' | transloco"
          />
          <input
            class="input-base"
            type="password"
            [(ngModel)]="password"
            name="password"
            required
            [attr.placeholder]="'auth.login.passwordLabel' | transloco"
          />

          @if (error()) {
            <p class="text-sm text-red-600">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ 'auth.login.submit' | transloco }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-brand/70">
          {{ 'auth.login.noAccount' | transloco }}
          <a [routerLink]="['/auth/register']" class="font-semibold text-brand-accent">
            {{ 'auth.login.register' | transloco }}
          </a>
        </p>
      </div>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
        this.router.navigateByUrl(redirect);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Falha ao entrar'));
      },
    });
  }
}
