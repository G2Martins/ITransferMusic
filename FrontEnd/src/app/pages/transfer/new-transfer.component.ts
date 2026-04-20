import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import {
  ApiService,
  LinkedAccount,
  PlaylistSummary,
  Provider,
  Track,
} from '../../core/services/api.service';
import { formatApiError } from '../../core/utils/format-error';
import {
  playlistUrl,
  providerIcon,
  providerLabel,
  trackUrl,
} from '../../core/utils/playlist-url';

type WizardStep = 1 | 2 | 3 | 4;

interface ProviderMeta {
  id: Provider;
  label: string;
  icon: string;
}

interface PlaylistDraft {
  playlist: PlaylistSummary;
  // undefined = todas as faixas; Set vazio = nenhuma; Set = subconjunto
  selectedTrackIds: Set<string> | undefined;
  // cache de tracks ja carregadas (lazy)
  tracks: Track[] | null;
  loadingTracks: boolean;
  expanded: boolean;
  // overrides de nome/descricao (abertos pelo modal no step 4)
  customName: string | null;
  customDescription: string | null;
  applyWatermark: boolean;
}

const WATERMARK_DESC =
  'This playlist was created by https://www.ITransferMusic.com ' +
  'that lets you transfer your playlist to any music platform such as ' +
  'Spotify, YouTube Music, Apple Music, Deezer etc.';

@Component({
  selector: 'app-new-transfer',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, TranslocoPipe],
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
  readonly loadingPlaylists = signal(false);
  readonly creatingTransfer = signal(false);
  readonly search = signal('');

  // mapa de id->draft para playlists marcadas
  readonly selected = signal<Map<string, PlaylistDraft>>(new Map());

  // modal aberto para editar um draft no step 4
  readonly editing = signal<PlaylistDraft | null>(null);
  readonly editForm = signal<{ name: string; description: string; applyWatermark: boolean }>({
    name: '',
    description: '',
    applyWatermark: true,
  });

  readonly filteredPlaylists = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.playlists();
    return this.playlists().filter((p) => p.name.toLowerCase().includes(q));
  });

  // separa as playlists pessoais (IDs virtuais iniciam com "__") das reais
  readonly personalPlaylists = computed(() =>
    this.filteredPlaylists().filter((p) => p.id.startsWith('__')),
  );
  readonly regularPlaylists = computed(() =>
    this.filteredPlaylists().filter((p) => !p.id.startsWith('__')),
  );

  readonly selectedCount = computed(() => this.selected().size);
  readonly totalSelectedTracks = computed(() => {
    let sum = 0;
    for (const d of this.selected().values()) {
      if (d.selectedTrackIds === undefined) {
        sum += d.playlist.track_count ?? 0;
      } else {
        sum += d.selectedTrackIds.size;
      }
    }
    return sum;
  });

  readonly canAdvance = computed(() => {
    switch (this.step()) {
      case 1:
        return !!this.source() && this.isLinked(this.source()!);
      case 2:
        return this.selected().size > 0;
      case 3:
        return (
          !!this.target() &&
          this.target() !== this.source() &&
          this.isLinked(this.target()!)
        );
      case 4:
        return this.selected().size > 0;
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

  providerIcon(p: Provider): string {
    return providerIcon(p);
  }

  playlistUrl(id: string): string | null {
    const src = this.source();
    return src ? playlistUrl(src, id) : null;
  }

  trackUrl(id: string): string | null {
    const src = this.source();
    return src ? trackUrl(src, id) : null;
  }

  sourceLinkedAccount(): LinkedAccount | undefined {
    const s = this.source();
    if (!s) return undefined;
    return this.linked().find((a) => a.provider === s);
  }

  selectSource(p: Provider): void {
    this.source.set(p);
    // ao mudar de source, limpa tudo que dependia dele
    this.selected.set(new Map());
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

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  togglePlaylist(pl: PlaylistSummary): void {
    const map = new Map(this.selected());
    if (map.has(pl.id)) {
      map.delete(pl.id);
    } else {
      map.set(pl.id, {
        playlist: pl,
        selectedTrackIds: undefined,
        tracks: null,
        loadingTracks: false,
        expanded: false,
        customName: null,
        customDescription: null,
        applyWatermark: true,
      });
    }
    this.selected.set(map);
  }

  selectAll(toggle: boolean): void {
    if (!toggle) {
      this.selected.set(new Map());
      return;
    }
    const map = new Map<string, PlaylistDraft>();
    for (const pl of this.filteredPlaylists()) {
      map.set(pl.id, {
        playlist: pl,
        selectedTrackIds: undefined,
        tracks: null,
        loadingTracks: false,
        expanded: false,
        customName: null,
        customDescription: null,
        applyWatermark: true,
      });
    }
    this.selected.set(map);
  }

  allSelected(): boolean {
    const list = this.filteredPlaylists();
    return list.length > 0 && list.every((p) => this.selected().has(p.id));
  }

  async toggleExpand(id: string): Promise<void> {
    const map = new Map(this.selected());
    const draft = map.get(id);
    if (!draft) return;
    draft.expanded = !draft.expanded;
    this.selected.set(map);
    if (draft.expanded && draft.tracks === null && !draft.loadingTracks) {
      await this.loadTracksFor(draft);
    }
  }

  /**
   * Clique na linha da playlist: se ja selecionada, alterna expansao;
   * se nao, seleciona + expande + carrega faixas.
   */
  async onPlaylistRowClick(pl: PlaylistSummary): Promise<void> {
    if (!this.selected().has(pl.id)) {
      this.togglePlaylist(pl);
    }
    await this.toggleExpand(pl.id);
  }

  private async loadTracksFor(draft: PlaylistDraft): Promise<void> {
    const src = this.source();
    if (!src) return;
    const map = new Map(this.selected());
    draft.loadingTracks = true;
    map.set(draft.playlist.id, draft);
    this.selected.set(map);
    try {
      const tracks = await firstValueFrom(
        this.api.getPlaylistTracks(src, draft.playlist.id),
      );
      const updated = new Map(this.selected());
      const d = updated.get(draft.playlist.id);
      if (d) {
        d.tracks = tracks;
        d.loadingTracks = false;
      }
      this.selected.set(updated);
    } catch (err) {
      const updated = new Map(this.selected());
      const d = updated.get(draft.playlist.id);
      if (d) {
        d.tracks = [];
        d.loadingTracks = false;
      }
      this.selected.set(updated);
      this.error.set(formatApiError(err, 'Falha ao carregar faixas'));
    }
  }

  isTrackChecked(draft: PlaylistDraft, trackId: string): boolean {
    if (draft.selectedTrackIds === undefined) return true;
    return draft.selectedTrackIds.has(trackId);
  }

  toggleTrack(id: string, trackId: string): void {
    const map = new Map(this.selected());
    const draft = map.get(id);
    if (!draft || !draft.tracks) return;
    // materializa o Set se ainda era "todas"
    if (draft.selectedTrackIds === undefined) {
      draft.selectedTrackIds = new Set(draft.tracks.map((t) => t.id));
    }
    if (draft.selectedTrackIds.has(trackId)) {
      draft.selectedTrackIds.delete(trackId);
    } else {
      draft.selectedTrackIds.add(trackId);
    }
    this.selected.set(map);
  }

  toggleAllTracks(id: string, checked: boolean): void {
    const map = new Map(this.selected());
    const draft = map.get(id);
    if (!draft || !draft.tracks) return;
    if (checked) {
      draft.selectedTrackIds = undefined;
    } else {
      draft.selectedTrackIds = new Set();
    }
    this.selected.set(map);
  }

  allTracksChecked(draft: PlaylistDraft): boolean {
    if (draft.selectedTrackIds === undefined) return true;
    return draft.tracks !== null && draft.selectedTrackIds.size === draft.tracks.length;
  }

  selectedTrackCount(draft: PlaylistDraft): number {
    if (draft.selectedTrackIds === undefined) {
      return draft.playlist.track_count ?? draft.tracks?.length ?? 0;
    }
    return draft.selectedTrackIds.size;
  }

  totalTrackCount(draft: PlaylistDraft): number | null {
    return draft.playlist.track_count ?? draft.tracks?.length ?? null;
  }

  draftList(): PlaylistDraft[] {
    return Array.from(this.selected().values());
  }

  openEdit(draft: PlaylistDraft): void {
    this.editing.set(draft);
    this.editForm.set({
      name: draft.customName ?? `${draft.playlist.name} (transferida)`,
      description: draft.customDescription ?? '',
      applyWatermark: draft.applyWatermark,
    });
  }

  closeEdit(): void {
    this.editing.set(null);
  }

  saveEdit(): void {
    const draft = this.editing();
    if (!draft) return;
    const form = this.editForm();
    const map = new Map(this.selected());
    const d = map.get(draft.playlist.id);
    if (d) {
      d.customName = form.name.trim() || null;
      d.customDescription = form.description.trim() || null;
      d.applyWatermark = form.applyWatermark;
    }
    this.selected.set(map);
    this.editing.set(null);
  }

  previewDescription(): string {
    const form = this.editForm();
    const base = form.description.trim();
    if (!form.applyWatermark) return base;
    return base ? `${base} | ${WATERMARK_DESC}` : WATERMARK_DESC;
  }

  previewName(): string {
    const form = this.editForm();
    const base = form.name.trim();
    return form.applyWatermark && base ? `${base} By ITransferMusic` : base;
  }

  updateEditForm(patch: Partial<{ name: string; description: string; applyWatermark: boolean }>): void {
    this.editForm.update((f) => ({ ...f, ...patch }));
  }

  removeDraft(id: string): void {
    const map = new Map(this.selected());
    map.delete(id);
    this.selected.set(map);
  }

  /** Desvincula a conta e dispara re-OAuth (permite escolher outra conta). */
  switchAccount(): void {
    const src = this.source();
    if (!src) return;
    this.api.unlinkAccount(src).subscribe({
      next: () => {
        this.api.oauthAuthorize(src).subscribe({
          next: (r) => (window.location.href = r.authorize_url),
          error: (err) => this.error.set(formatApiError(err, 'Falha ao autorizar')),
        });
      },
      error: (err) => this.error.set(formatApiError(err, 'Falha ao desvincular')),
    });
  }

  async startTransfer(): Promise<void> {
    const src = this.source();
    const tgt = this.target();
    if (!src || !tgt || this.selected().size === 0) return;

    this.creatingTransfer.set(true);
    this.error.set(null);
    try {
      for (const draft of this.draftList()) {
        const name =
          draft.customName?.trim() || `${draft.playlist.name} (transferida)`;
        const description = draft.customDescription?.trim() || undefined;
        const selectedIds =
          draft.selectedTrackIds === undefined
            ? null
            : Array.from(draft.selectedTrackIds);
        await firstValueFrom(
          this.api.createTransfer({
            source_provider: src,
            target_provider: tgt,
            source_playlist_id: draft.playlist.id,
            source_playlist_name: draft.playlist.name,
            target_playlist_name: name,
            target_playlist_description: description,
            selected_track_ids: selectedIds,
            apply_watermark: draft.applyWatermark,
          }),
        );
      }
      this.creatingTransfer.set(false);
      this.router.navigate(['/account/history']);
    } catch (err) {
      this.creatingTransfer.set(false);
      this.error.set(formatApiError(err, 'Falha ao iniciar transferencia'));
    }
  }
}
