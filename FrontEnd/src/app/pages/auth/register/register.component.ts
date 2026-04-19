import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-md px-6 py-20">
      <div class="card">
        <div class="mb-6 flex items-center justify-center">
          <iconify-icon
            icon="ph:user-plus-duotone"
            class="text-5xl text-brand-accent"
          ></iconify-icon>
        </div>
        <h1 class="text-center text-2xl font-bold text-brand">
          {{ 'auth.register.title' | transloco }}
        </h1>

        <form (ngSubmit)="submit()" class="mt-6 space-y-4">
          <input
            class="input-base"
            type="text"
            [(ngModel)]="name"
            name="name"
            required
            [attr.placeholder]="'auth.register.nameLabel' | transloco"
          />
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
            minlength="8"
            [attr.placeholder]="'auth.login.passwordLabel' | transloco"
          />

          @if (error()) {
            <p class="text-sm text-red-600">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ 'auth.register.submit' | transloco }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-brand/70">
          {{ 'auth.register.hasAccount' | transloco }}
          <a [routerLink]="['/auth/login']" class="font-semibold text-brand-accent">
            {{ 'auth.register.login' | transloco }}
          </a>
        </p>
      </div>
    </section>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .register({ name: this.name, email: this.email, password: this.password })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.detail ?? 'Falha ao cadastrar');
        },
      });
  }
}
