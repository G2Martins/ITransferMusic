import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { formatApiError } from '../../../core/utils/format-error';

declare const google: {
  accounts: {
    id: {
      initialize: (cfg: {
        client_id: string;
        callback: (resp: { credential: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
};

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
        <h1 class="text-center text-2xl font-bold text-brand dark:text-white">
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

        <!-- Divisor -->
        <div class="my-6 flex items-center gap-3 text-xs text-brand/50 dark:text-white/40">
          <div class="h-px flex-1 bg-gray-200 dark:bg-white/10"></div>
          <span>{{ 'auth.login.or' | transloco }}</span>
          <div class="h-px flex-1 bg-gray-200 dark:bg-white/10"></div>
        </div>

        <!-- Google Sign-in -->
        <div #googleButton class="flex justify-center"></div>

        <p class="mt-6 text-center text-sm text-brand/70 dark:text-white/70">
          {{ 'auth.login.noAccount' | transloco }}
          <a [routerLink]="['/auth/register']" class="font-semibold text-brand-accent">
            {{ 'auth.login.register' | transloco }}
          </a>
        </p>
      </div>
    </section>
  `,
})
export class LoginComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('googleButton') googleButton!: ElementRef<HTMLDivElement>;

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.finish(),
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Falha ao entrar'));
      },
    });
  }

  ngAfterViewInit(): void {
    this.initGoogleButton();
  }

  private initGoogleButton(retries = 10): void {
    if (typeof google === 'undefined' || !google?.accounts?.id) {
      if (retries > 0) setTimeout(() => this.initGoogleButton(retries - 1), 300);
      return;
    }
    if (!environment.googleClientId) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (resp) => this.handleGoogleCredential(resp.credential),
    });
    google.accounts.id.renderButton(this.googleButton.nativeElement, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'left',
      width: 320,
    });
  }

  private handleGoogleCredential(credential: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.googleLogin(credential).subscribe({
      next: () => this.finish(),
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Falha ao entrar com Google'));
      },
    });
  }

  private finish(): void {
    this.loading.set(false);
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
    this.router.navigateByUrl(redirect);
  }
}
