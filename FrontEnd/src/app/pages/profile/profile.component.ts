import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../core/services/auth.service';
import { formatApiError } from '../../core/utils/format-error';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);

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

  ngOnInit(): void {
    this.loadingMe.set(true);
    this.auth.getMe().subscribe({
      next: (me) => {
        this.name.set(me.name);
        this.email.set(me.email);
        this.loadingMe.set(false);
      },
      error: (err) => {
        this.loadingMe.set(false);
        this.nameError.set(formatApiError(err, 'Falha ao carregar perfil'));
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
