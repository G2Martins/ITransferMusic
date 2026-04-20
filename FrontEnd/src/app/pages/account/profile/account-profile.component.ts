import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../../core/services/auth.service';
import {
  ApiService,
  LinkedAccount,
  Provider,
} from '../../../core/services/api.service';
import { formatApiError } from '../../../core/utils/format-error';
import {
  providerIcon,
  providerLabel,
} from '../../../core/utils/playlist-url';
import { TIMEZONE_OPTIONS } from '../../../core/utils/timezone';

interface ProviderMeta {
  id: Provider;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './account-profile.component.html',
})
export class AccountProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly timezoneOptions = TIMEZONE_OPTIONS;
  readonly timezoneOffsetMinutes = signal<number>(-180);
  readonly savingTimezone = signal(false);
  readonly timezoneSuccess = signal(false);
  readonly timezoneError = signal<string | null>(null);

  readonly name = signal('');
  readonly email = signal('');
  readonly loadingMe = signal(false);

  readonly savingName = signal(false);
  readonly nameSuccess = signal(false);
  readonly nameError = signal<string | null>(null);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly savingPassword = signal(false);
  readonly passwordSuccess = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly providers: ProviderMeta[] = [
    { id: 'spotify', label: providerLabel('spotify'), icon: providerIcon('spotify') },
    { id: 'youtube', label: providerLabel('youtube'), icon: providerIcon('youtube') },
    { id: 'apple_music', label: providerLabel('apple_music'), icon: providerIcon('apple_music') },
    { id: 'amazon_music', label: providerLabel('amazon_music'), icon: providerIcon('amazon_music') },
  ];

  readonly linked = signal<LinkedAccount[]>([]);
  readonly accountsError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadingMe.set(true);
    this.auth.getMe().subscribe({
      next: (me) => {
        this.name.set(me.name);
        this.email.set(me.email);
        this.timezoneOffsetMinutes.set(me.timezone_offset_minutes);
        this.auth.currentUser.set(me);
        this.loadingMe.set(false);
      },
      error: (err) => {
        this.loadingMe.set(false);
        this.nameError.set(formatApiError(err, 'Falha ao carregar perfil'));
      },
    });

    this.loadLinked();
  }

  loadLinked(): void {
    this.api.listLinkedAccounts().subscribe({
      next: (rows) => this.linked.set(rows),
      error: (err) => this.accountsError.set(formatApiError(err, 'Falha ao listar contas')),
    });
  }

  isLinked(p: Provider): boolean {
    return this.linked().some((a) => a.provider === p);
  }

  linkProvider(p: Provider): void {
    this.api.oauthAuthorize(p).subscribe({
      next: (res) => (window.location.href = res.authorize_url),
      error: (err) =>
        this.accountsError.set(formatApiError(err, 'Provedor nao configurado')),
    });
  }

  unlinkProvider(p: Provider): void {
    this.api.unlinkAccount(p).subscribe({ next: () => this.loadLinked() });
  }

  saveTimezone(): void {
    this.timezoneError.set(null);
    this.timezoneSuccess.set(false);
    this.savingTimezone.set(true);
    this.auth
      .updateProfile({ timezone_offset_minutes: this.timezoneOffsetMinutes() })
      .subscribe({
        next: (me) => {
          this.auth.currentUser.set(me);
          this.savingTimezone.set(false);
          this.timezoneSuccess.set(true);
        },
        error: (err) => {
          this.savingTimezone.set(false);
          this.timezoneError.set(formatApiError(err, 'Falha ao atualizar fuso'));
        },
      });
  }

  confirmDelete(): void {
    const msg = this.transloco.translate('profile.danger.confirm');
    if (!window.confirm(msg)) return;
    this.deleteError.set(null);
    this.deleting.set(true);
    this.auth.deleteAccount().subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(formatApiError(err, 'Falha ao deletar conta'));
      },
    });
  }

  saveName(): void {
    const name = this.name().trim();
    if (!name) {
      this.nameError.set('O nome nao pode ser vazio');
      return;
    }
    this.nameError.set(null);
    this.nameSuccess.set(false);
    this.savingName.set(true);
    this.auth.updateProfile({ name }).subscribe({
      next: (me) => {
        this.name.set(me.name);
        this.auth.currentUser.set(me);
        this.savingName.set(false);
        this.nameSuccess.set(true);
      },
      error: (err) => {
        this.savingName.set(false);
        this.nameError.set(formatApiError(err, 'Falha ao atualizar nome'));
      },
    });
  }

  savePassword(): void {
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    if (this.newPassword.length < 8) {
      this.passwordError.set('A nova senha precisa ter ao menos 8 caracteres');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('A confirmacao nao confere com a nova senha');
      return;
    }

    this.savingPassword.set(true);
    this.auth
      .changePassword({
        current_password: this.currentPassword,
        new_password: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordSuccess.set(true);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (err) => {
          this.savingPassword.set(false);
          this.passwordError.set(formatApiError(err, 'Falha ao alterar senha'));
        },
      });
  }
}
