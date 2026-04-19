import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ApiService,
  LinkedAccount,
  PlaylistSummary,
  Provider,
  TransferResponse,
} from '../../core/services/api.service';
import { formatApiError } from '../../core/utils/format-error';

type WizardStep = 1 | 2 | 3 | 4;

interface ProviderMeta {
  id: Provider;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly providers: ProviderMeta[] = [
    { id: 'spotify', label: 'Spotify', icon: 'ph:spotify-logo-duotone' },
    { id: 'youtube', label: 'YouTube Music', icon: 'ph:youtube-logo-duotone' },
    { id: 'apple_music', label: 'Apple Music', icon: 'ph:apple-logo-duotone' },
    { id: 'amazon_music', label: 'Amazon Music', icon: 'ph:shopping-cart-duotone' },
  ];

  readonly accounts = signal<LinkedAccount[]>([]);
  readonly transfers = signal<TransferResponse[]>([]);
  readonly loadingAccounts = signal(false);
  readonly error = signal<string | null>(null);

  // Wizard state
  readonly step = signal<WizardStep>(1);
  readonly source = signal<Provider | null>(null);
  readonly target = signal<Provider | null>(null);
  readonly playlists = signal<PlaylistSummary[]>([]);
  readonly selectedPlaylist = signal<PlaylistSummary | null>(null);
  readonly loadingPlaylists = signal(false);
  readonly creatingTransfer = signal(false);
  readonly newTransferName = signal('');

  readonly canAdvance = computed(() => {
    switch (this.step()) {
      case 1:
        return !!this.source() && this.isLinked(this.source()!);
      case 2:
        return !!this.selectedPlaylist();
      case 3:
        return (
          !!this.target() &&
          this.target() !== this.source() &&
          this.isLinked(this.target()!)
        );
      case 4:
        return this.newTransferName().trim().length > 0;
    }
  });

  ngOnInit(): void {
    this.loadAccounts();
    this.loadTransfers();
  }

  isLinked(provider: Provider): boolean {
    return this.accounts().some((a) => a.provider === provider);
  }

  loadAccounts(): void {
    this.loadingAccounts.set(true);
    this.api.listLinkedAccounts().subscribe({
      next: (a) => {
        this.accounts.set(a);
        this.loadingAccounts.set(false);
      },
      error: (err) => {
        this.loadingAccounts.set(false);
        this.error.set(formatApiError(err, 'Falha ao carregar contas'));
      },
    });
  }

  loadTransfers(): void {
    this.api.listTransfers().subscribe({
      next: (t) => this.transfers.set(t),
      error: () => this.transfers.set([]),
    });
  }

  linkProvider(provider: Provider): void {
    this.api.oauthAuthorize(provider).subscribe({
      next: (res) => (window.location.href = res.authorize_url),
      error: (err) =>
        this.error.set(formatApiError(err, 'Provedor nao configurado no backend')),
    });
  }

  unlinkProvider(provider: Provider): void {
    this.api.unlinkAccount(provider).subscribe({
      next: () => this.loadAccounts(),
    });
  }

  selectSource(p: Provider): void {
    this.source.set(p);
  }
  selectTarget(p: Provider): void {
    this.target.set(p);
  }

  next(): void {
    if (!this.canAdvance()) return;
    if (this.step() === 1) {
      this.loadPlaylists();
    }
    this.step.update((s) => Math.min(4, s + 1) as WizardStep);
  }

  back(): void {
    this.step.update((s) => Math.max(1, s - 1) as WizardStep);
  }

  private loadPlaylists(): void {
    const src = this.source();
    if (!src) return;
    this.loadingPlaylists.set(true);
    this.playlists.set([]);
    this.api.listPlaylists(src).subscribe({
      next: (pl) => {
        this.playlists.set(pl);
        this.loadingPlaylists.set(false);
      },
      error: (err) => {
        this.loadingPlaylists.set(false);
        this.error.set(formatApiError(err, 'Falha ao listar playlists'));
      },
    });
  }

  selectPlaylist(pl: PlaylistSummary): void {
    this.selectedPlaylist.set(pl);
    this.newTransferName.set(`${pl.name} (transferida)`);
  }

  startTransfer(): void {
    const src = this.source();
    const tgt = this.target();
    const pl = this.selectedPlaylist();
    if (!src || !tgt || !pl) return;

    this.creatingTransfer.set(true);
    this.api
      .createTransfer({
        source_provider: src,
        target_provider: tgt,
        source_playlist_id: pl.id,
        target_playlist_name: this.newTransferName(),
      })
      .subscribe({
        next: () => {
          this.creatingTransfer.set(false);
          this.resetWizard();
          this.loadTransfers();
        },
        error: (err) => {
          this.creatingTransfer.set(false);
          this.error.set(formatApiError(err, 'Falha ao iniciar transferencia'));
        },
      });
  }

  private resetWizard(): void {
    this.step.set(1);
    this.source.set(null);
    this.target.set(null);
    this.selectedPlaylist.set(null);
    this.playlists.set([]);
    this.newTransferName.set('');
  }
}
