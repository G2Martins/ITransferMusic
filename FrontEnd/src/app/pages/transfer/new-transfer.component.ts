import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ApiService,
  LinkedAccount,
  PlaylistSummary,
  Provider,
} from '../../core/services/api.service';
import { formatApiError } from '../../core/utils/format-error';
import { providerIcon, providerLabel } from '../../core/utils/playlist-url';

type WizardStep = 1 | 2 | 3 | 4;

interface ProviderMeta {
  id: Provider;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-new-transfer',
  standalone: true,
  imports: [NgClass, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './new-transfer.component.html',
})
export class NewTransferComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly providers: ProviderMeta[] = [
    { id: 'spotify', label: providerLabel('spotify'), icon: providerIcon('spotify') },
    { id: 'youtube', label: providerLabel('youtube'), icon: providerIcon('youtube') },
    { id: 'apple_music', label: providerLabel('apple_music'), icon: providerIcon('apple_music') },
    { id: 'amazon_music', label: providerLabel('amazon_music'), icon: providerIcon('amazon_music') },
  ];

  readonly linked = signal<LinkedAccount[]>([]);
  readonly error = signal<string | null>(null);

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
    this.api.listLinkedAccounts().subscribe({
      next: (a) => this.linked.set(a),
      error: (err) => this.error.set(formatApiError(err, 'Falha ao carregar contas')),
    });
  }

  isLinked(p: Provider): boolean {
    return this.linked().some((a) => a.provider === p);
  }

  selectSource(p: Provider): void {
    this.source.set(p);
  }
  selectTarget(p: Provider): void {
    this.target.set(p);
  }

  next(): void {
    if (!this.canAdvance()) return;
    if (this.step() === 1) this.loadPlaylists();
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
          this.router.navigate(['/account/history']);
        },
        error: (err) => {
          this.creatingTransfer.set(false);
          this.error.set(formatApiError(err, 'Falha ao iniciar transferencia'));
        },
      });
  }
}
