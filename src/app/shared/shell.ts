import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { DEMO } from '../api/demo-api';
import { I18n } from '../i18n/i18n';
import { Jobs, Linked, Session, Toast } from '../state';
import { Brand, LangSwitch } from './chrome';
import { Icon } from './icon';

const NAV = [
  { path: '/painel', icon: 'home', key: 'nav.dashboard' },
  { path: '/transferir', icon: 'transfer', key: 'nav.transfer' },
  { path: '/transferencias', icon: 'history', key: 'nav.transfers' },
  { path: '/playlists', icon: 'list', key: 'nav.playlists' },
  { path: '/sincronizacoes', icon: 'sync', key: 'nav.syncs' },
  { path: '/gerador', icon: 'sparkle', key: 'nav.generator' },
  { path: '/conexoes', icon: 'link', key: 'nav.connections' },
];

/** Layout of the signed-in app: sidebar on desktop, top bar + <dialog> menu on mobile. */
@Component({
  selector: 'app-shell',
  imports: [NgTemplateOutlet, RouterOutlet, RouterLink, RouterLinkActive, Icon, Brand, LangSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #navList>
      <nav [attr.aria-label]="t('nav.app')">
        <ul class="space-y-1">
          @for (n of nav; track n.path) {
            <li>
              <a [routerLink]="n.path" routerLinkActive="active" ariaCurrentWhenActive="page" class="nav-item" (click)="menuDlg.close()">
                <app-icon [name]="n.icon" [size]="17" />
                <span class="flex-1">{{ t(n.key) }}</span>
                @if (n.path === '/transferencias' && jobs.active().length) {
                  <span class="eq live text-accent-hi" [attr.aria-label]="t('nav.running', { n: jobs.active().length })"><i></i><i></i><i></i></span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>
    </ng-template>

    <ng-template #account>
      <div class="rounded-xl border border-line bg-panel p-3">
        <div class="flex items-center gap-2.5">
          <span class="avatar">{{ initials() }}</span>
          <div class="min-w-0">
            <p class="clamp-1 text-[14px] font-medium">{{ session.me()?.name ?? '...' }}</p>
            <p class="clamp-1 mono text-[11px] text-dim">{{ session.me()?.email }}</p>
          </div>
        </div>
        @if (demo) { <p class="mt-2.5"><span class="tag tag-accent">{{ t('common.demoSession') }}</span></p> }
      </div>
      <app-lang class="mt-3 block" />
      <div class="mt-3 grid gap-1">
        @if (demo) {
          <button type="button" class="nav-item w-full text-left" (click)="resetDlg.showModal()"><app-icon name="refresh" [size]="16" /> {{ t('common.restore') }}</button>
        }
        <button type="button" class="nav-item w-full text-left" (click)="signOut()"><app-icon name="log-out" [size]="16" /> {{ t('common.signOut') }}</button>
      </div>
    </ng-template>

    <div class="lg:grid lg:min-h-[calc(100dvh-37px)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <!-- Desktop sidebar -->
      <aside class="hidden border-r border-line bg-well/50 lg:block">
        <div class="sticky top-0 flex h-dvh flex-col gap-6 overflow-y-auto px-4 py-5 scroll-thin">
          <a routerLink="/" class="px-2" [attr.aria-label]="t('nav.homeAria')"><app-brand /></a>
          <ng-container [ngTemplateOutlet]="navList" />
          <div class="mt-auto"><ng-container [ngTemplateOutlet]="account" /></div>
        </div>
      </aside>

      <!-- Mobile top bar -->
      <div class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/95 px-4 lg:hidden">
        <a routerLink="/" [attr.aria-label]="t('nav.homeAria')"><app-brand /></a>
        @if (jobs.active().length) { <a routerLink="/transferencias" class="eq live ml-2 text-accent-hi" [attr.aria-label]="t('nav.running', { n: jobs.active().length })"><i></i><i></i><i></i></a> }
        <button type="button" class="icon-btn ml-auto" [attr.aria-label]="t('nav.menu')" aria-haspopup="dialog" (click)="menuDlg.showModal()"><app-icon name="menu" /></button>
      </div>
      <dialog #menuDlg class="sheet m-0 ml-auto h-dvh max-h-none w-[min(320px,88vw)] rounded-none rounded-l-2xl p-5" [attr.aria-label]="t('nav.menu')">
        <div class="flex items-center justify-between">
          <app-brand />
          <button type="button" class="icon-btn" [attr.aria-label]="t('common.close')" (click)="menuDlg.close()"><app-icon name="x" /></button>
        </div>
        <div class="mt-6"><ng-container [ngTemplateOutlet]="navList" /></div>
        <div class="mt-6"><ng-container [ngTemplateOutlet]="account" /></div>
      </dialog>

      <div class="min-w-0">
        <main id="conteudo" tabindex="-1" class="wrap max-w-6xl py-8 outline-none sm:py-10">
          <router-outlet />
        </main>
        <footer class="wrap max-w-6xl border-t border-line py-5 text-[12px] text-dim">
          <p>{{ t('footer.marks') }}</p>
        </footer>
      </div>
    </div>

    <dialog #resetDlg class="sheet" aria-labelledby="reset-title">
      <form method="dialog" class="p-6">
        <h2 id="reset-title" class="text-[19px] font-medium tracking-[-0.02em]">{{ t('common.restoreTitle') }}</h2>
        <p class="mt-2 text-[14px] text-ink-2">{{ t('common.restoreText') }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="btn btn-line" value="cancel">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" value="ok" (click)="reset($event, resetDlg)">{{ t('common.restore') }}</button>
        </div>
      </form>
    </dialog>
  `,
})
export class Shell {
  protected session = inject(Session);
  protected jobs = inject(Jobs);
  private linked = inject(Linked);
  private toast = inject(Toast);
  private router = inject(Router);
  protected t = inject(I18n).t;
  protected readonly nav = NAV;
  protected readonly demo = DEMO;
  protected initials = computed(() => (this.session.me()?.name ?? '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase());

  constructor() {
    this.session.loadMe().catch(() => undefined);
    this.linked.load().catch(() => undefined);
    this.jobs.load();
    // Move focus to the content after each navigation (screen readers hear the new page).
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), skip(1), takeUntilDestroyed()).subscribe(() => document.getElementById('conteudo')?.focus({ preventScroll: true }));
  }

  async reset(ev: Event, dlg: HTMLDialogElement) {
    ev.preventDefault();
    dlg.close();
    await this.session.reset();
    await Promise.all([this.linked.load(), this.jobs.load()]);
    this.toast.say(this.t('common.restored'));
    this.router.navigateByUrl('/painel');
  }

  signOut() {
    this.session.signOut();
    this.jobs.stop();
    this.router.navigateByUrl('/entrar');
  }
}
