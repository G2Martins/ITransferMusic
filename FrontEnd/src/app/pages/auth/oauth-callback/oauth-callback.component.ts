import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService, Provider } from '../../../core/services/api.service';
import { formatApiError } from '../../../core/utils/format-error';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-md px-6 py-24 text-center">
      <iconify-icon
        icon="ph:circle-notch-bold"
        class="mb-4 animate-spin text-5xl text-brand-accent"
      ></iconify-icon>
      <h1 class="text-2xl font-bold text-brand">Vinculando conta...</h1>

      @if (error()) {
        <p class="mt-4 text-sm text-red-600">{{ error() }}</p>
        <button class="btn-primary mt-6" (click)="goDashboard()">
          Voltar ao painel
        </button>
      }
    </section>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const provider = this.route.snapshot.paramMap.get('provider') as Provider | null;
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (!provider || !code || !state) {
      this.error.set('Parametros OAuth ausentes na URL.');
      return;
    }

    this.api.oauthCallback(provider, code, state).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) =>
        this.error.set(formatApiError(err, 'Falha ao finalizar vinculacao.')),
    });
  }

  goDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
