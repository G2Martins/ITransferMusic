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
import { firstValueFrom } from 'rxjs';

import {
  ApiService,
  LinkedAccount,
  Provider,
  Track,
} from '../../core/services/api.service';
import { formatApiError } from '../../core/utils/format-error';
import { providerIcon, providerLabel } from '../../core/utils/playlist-url';

const GENRES = [
  'Pop',
  'Rock',
  'Rap',
  'Country',
  'Jazz',
  'Classical',
  'Electronic',
  'Hip-Hop',
  'Blues',
  'Reggae',
  'Metal',
  'Folk',
  'Punk',
  'Indie',
  'Soul',
  'R&B',
];

const MOODS = [
  'Happy',
  'Sad',
  'Angry',
  'Relaxed',
  'Energetic',
  'Romantic',
];

const NAME_SUGGESTIONS = [
  'Trap Royalty',
  'Midnight Drip',
  'Bassline Rebellion',
  'Crown of the Streets',
  'Luxe Vibes & Hard Knocks',
  'Urban Anthems Unleashed',
  'Hustle & Flow',
  'Echoes of the Block',
];

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './generator.component.html',
})
export class GeneratorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly genres = GENRES;
  readonly moods = MOODS;
  readonly nameSuggestions = NAME_SUGGESTIONS;

  readonly linked = signal<LinkedAccount[]>([]);
  readonly sourceProvider = signal<Provider | null>(null);
  readonly selectedGenres = signal<Set<string>>(new Set());
  readonly selectedMoods = signal<Set<string>>(new Set());
  readonly prompt = signal<string>('');
  readonly tracks = signal<Track[]>([]);
  readonly playlistName = signal<string>('Minha Playlist Gerada');
  readonly replaceExisting = signal<boolean>(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMatched = signal<number | null>(null);

  readonly saveModalOpen = signal(false);
  readonly targetProvider = signal<Provider | null>(null);

  readonly hasSource = computed(() => !!this.sourceProvider());

  ngOnInit(): void {
    this.api.listLinkedAccounts().subscribe({
      next: (rows) => {
        this.linked.set(rows);
        const first = rows[0];
        if (first) this.sourceProvider.set(first.provider);
      },
    });
  }

  providerIcon(p: Provider): string {
    return providerIcon(p);
  }

  providerLabel(p: Provider): string {
    return providerLabel(p);
  }

  toggleGenre(g: string): void {
    const s = new Set(this.selectedGenres());
    if (s.has(g)) s.delete(g);
    else s.add(g);
    this.selectedGenres.set(s);
  }

  toggleMood(m: string): void {
    const s = new Set(this.selectedMoods());
    if (s.has(m)) s.delete(m);
    else s.add(m);
    this.selectedMoods.set(s);
  }

  isGenreSelected(g: string): boolean {
    return this.selectedGenres().has(g);
  }

  isMoodSelected(m: string): boolean {
    return this.selectedMoods().has(m);
  }

  pickNameSuggestion(name: string): void {
    this.playlistName.set(name);
  }

  removeTrack(id: string): void {
    this.tracks.set(this.tracks().filter((t) => t.id !== id));
  }

  async generate(): Promise<void> {
    const src = this.sourceProvider();
    if (!src) return;
    this.error.set(null);
    this.loading.set(true);
    this.savedMatched.set(null);

    const excludeIds = this.replaceExisting()
      ? []
      : this.tracks().map((t) => t.id);

    try {
      const r = await firstValueFrom(
        this.api.generateTracks({
          source_provider: src,
          prompt: this.prompt().trim() || undefined,
          genres: Array.from(this.selectedGenres()),
          moods: Array.from(this.selectedMoods()).map((m) => m.toLowerCase()),
          count: 20,
          exclude_track_ids: excludeIds,
        }),
      );
      if (this.replaceExisting()) {
        this.tracks.set(r.tracks);
      } else {
        this.tracks.set([...this.tracks(), ...r.tracks]);
      }
      this.loading.set(false);
    } catch (err) {
      this.loading.set(false);
      this.error.set(formatApiError(err, 'Falha ao gerar faixas'));
    }
  }

  openSaveModal(): void {
    if (this.tracks().length === 0) return;
    this.error.set(null);
    this.targetProvider.set(this.sourceProvider() ?? this.linked()[0]?.provider ?? null);
    this.saveModalOpen.set(true);
  }

  closeSaveModal(): void {
    if (this.saving()) return;
    this.saveModalOpen.set(false);
  }

  async confirmSave(): Promise<void> {
    const target = this.targetProvider();
    if (!target || this.tracks().length === 0) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const r = await firstValueFrom(
        this.api.saveGenerated({
          target_provider: target,
          playlist_name: this.playlistName().trim() || 'Minha Playlist Gerada',
          tracks: this.tracks().map((t) => ({
            name: t.name,
            artist: t.artist,
          })),
        }),
      );
      this.saving.set(false);
      this.saveModalOpen.set(false);
      this.savedMatched.set(r.matched_count);
      setTimeout(() => this.router.navigate(['/dashboard']), 1500);
    } catch (err) {
      this.saving.set(false);
      this.error.set(formatApiError(err, 'Falha ao salvar playlist'));
    }
  }
}
