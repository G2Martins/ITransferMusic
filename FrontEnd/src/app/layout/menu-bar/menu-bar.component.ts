import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { FEATURES } from '../../shared/features.data';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './menu-bar.component.html',
})
export class MenuBarComponent {
  private readonly transloco = inject(TranslocoService);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);

  readonly features = FEATURES;
  readonly featuresOpen = signal(false);
  readonly langOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly currentLang = signal(this.transloco.getActiveLang());

  readonly languages = [
    { code: 'pt-BR', label: 'Português', flag: 'twemoji:flag-brazil' },
    { code: 'en', label: 'English', flag: 'twemoji:flag-united-states' },
  ];

  toggleFeatures(): void {
    this.featuresOpen.update((v) => !v);
    this.langOpen.set(false);
    this.profileOpen.set(false);
  }

  toggleLang(): void {
    this.langOpen.update((v) => !v);
    this.featuresOpen.set(false);
    this.profileOpen.set(false);
  }

  toggleProfile(): void {
    this.profileOpen.update((v) => !v);
    this.featuresOpen.set(false);
    this.langOpen.set(false);
  }

  closeMenus(): void {
    this.featuresOpen.set(false);
    this.langOpen.set(false);
    this.profileOpen.set(false);
  }

  changeLang(code: string): void {
    this.transloco.setActiveLang(code);
    this.currentLang.set(code);
    this.closeMenus();
  }

  activeLangMeta() {
    return this.languages.find((l) => l.code === this.currentLang()) ?? this.languages[0];
  }

  logout(): void {
    this.closeMenus();
    this.auth.logout();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (!target.closest('[data-menu-root]')) {
      this.closeMenus();
    }
  }
}
