import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MenuBarComponent } from './layout/menu-bar/menu-bar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuBarComponent, FooterComponent],
  template: `
    <app-menu-bar />
    <main class="min-h-[calc(100vh-450px)] bg-white dark:bg-surface-dark">
      <router-outlet />
    </main>
    <app-footer />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);

  constructor() {
    // Instanciar ThemeService ja aplica a classe `dark` no <html>.
    inject(ThemeService);
  }

  ngOnInit(): void {
    this.auth.hydrate();
  }
}
