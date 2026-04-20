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
import { ActivatedRoute } from '@angular/router';

import {
  ApiService,
  Provider,
  SharePublic,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatApiError } from '../../core/utils/format-error';
import {
  playlistUrl,
  providerIcon,
  providerLabel,
} from '../../core/utils/playlist-url';

interface OpenTarget {
  provider: Provider;
  icon: string;
  label: string;
  url: string | null;
  primary: boolean;
}

@Component({
  selector: 'app-share',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './share.component.html',
})
export class ShareComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly share = signal<SharePublic | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // modo edicao
  readonly editing = signal(false);
  readonly editName = signal('');
  readonly editDescription = signal('');
  readonly savingEdit = signal(false);
  readonly editError = signal<string | null>(null);

  readonly isOwner = computed(() => {
    const s = this.share();
    const me = this.auth.currentUser();
    if (!s || !me) return false;
    return s.owner_id === me.id;
  });

  readonly openTargets = computed<OpenTarget[]>(() => {
    const s = this.share();
    if (!s) return [];
    const primary: OpenTarget = {
      provider: s.target_provider,
      icon: providerIcon(s.target_provider),
      label: `Abrir ${providerLabel(s.target_provider)}`,
      url: playlistUrl(s.target_provider, s.target_playlist_id),
      primary: true,
    };
    const others: Provider[] = ['spotify', 'youtube', 'apple_music', 'amazon_music'];
    const rest = others
      .filter((p) => p !== s.target_provider)
      .map<OpenTarget>((p) => ({
        provider: p,
        icon: providerIcon(p),
        label: `Adicione ao seu ${providerLabel(p)}`,
        url: null,
        primary: false,
      }));
    return [primary, ...rest];
  });

  ngOnInit(): void {
    this.auth.hydrate();
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set('Share invalido');
      return;
    }
    this.api.getShare(token).subscribe({
      next: (s) => {
        this.share.set(s);
        this.loading.set(false);
        // Se a URL trouxer ?edit=true e o dono estiver logado, abre edicao
        if (this.route.snapshot.queryParamMap.get('edit') === 'true') {
          setTimeout(() => {
            if (this.isOwner()) this.startEdit();
          }, 500);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(formatApiError(err, 'Share nao encontrado'));
      },
    });
  }

  startEdit(): void {
    const s = this.share();
    if (!s) return;
    this.editName.set(s.playlist_name);
    this.editDescription.set(s.playlist_description ?? '');
    this.editError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    const s = this.share();
    if (!s) return;
    this.savingEdit.set(true);
    this.editError.set(null);
    this.api
      .updateShare(s.token, {
        playlist_name: this.editName().trim(),
        playlist_description: this.editDescription().trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.share.set(updated);
          this.savingEdit.set(false);
          this.editing.set(false);
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.editError.set(formatApiError(err, 'Falha ao atualizar'));
        },
      });
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href).catch(() => void 0);
  }
}
