import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorText } from '../api/api';
import { DEMO_ACCOUNT, ENDPOINTS, PROVIDERS, PROVIDER_META, Provider, REPO_URL, SITE_NAME } from '../data/site';
import { I18n } from '../i18n/i18n';
import { SiteFooter, SiteHeader } from '../shared/chrome';
import { Cover, Icon, ProviderBadge } from '../shared/icon';
import { Reveal } from '../shared/reveal';
import { Seo, appNode } from '../shared/seo';
import { Session, Toast } from '../state';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon, Reveal, SiteHeader, SiteFooter, ProviderBadge, Cover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
})
export class Home {
  protected t = inject(I18n).t;
  private session = inject(Session);
  private router = inject(Router);
  private toast = inject(Toast);
  protected busy = signal(false);
  protected readonly repo = REPO_URL;
  protected readonly demoName = DEMO_ACCOUNT.name;
  protected readonly providers = PROVIDERS;
  protected readonly meta = PROVIDER_META;
  protected readonly endpoints = ENDPOINTS.filter((e) => /transfers|syncs|oauth/.test(e.path)).slice(0, 7);
  protected readonly steps = ['s1', 's2', 's3', 's4'];
  protected readonly features = [
    { key: 'transfer', icon: 'transfer', link: '/transferir' },
    { key: 'sync', icon: 'sync', link: '/sincronizacoes' },
    { key: 'share', icon: 'share', link: '/transferencias' },
    { key: 'generator', icon: 'sparkle', link: '/gerador' },
  ];
  protected readonly popular: [Provider, Provider][] = [
    ['spotify', 'youtube'], ['youtube', 'spotify'], ['apple_music', 'spotify'], ['spotify', 'deezer'], ['amazon_music', 'apple_music'],
  ];
  /** Static sample for the hero illustration: real titles, fixed values, nothing that goes stale in the prerender. */
  protected readonly sample = [
    { n: 'Tempo Perdido', a: 'Legião Urbana', c: 100 },
    { n: 'Exagerado', a: 'Cazuza', c: 100 },
    { n: 'Lanterna dos Afogados', a: 'Os Paralamas do Sucesso', c: 80, v: 'Ao Vivo' },
    { n: 'Vou Deixar', a: 'Skank', c: 100 },
    { n: 'Anna Júlia', a: 'Los Hermanos', c: 0 },
  ];

  constructor() {
    inject(Seo).set({
      title: `${SITE_NAME} | Transfira playlists entre Spotify, YouTube Music e mais`,
      description: 'Transfira, gere e sincronize playlists entre Spotify, YouTube Music, Apple Music, Amazon Music e Deezer. Demo estática de portfólio, sem backend.',
      path: '/',
      jsonLd: [appNode()],
    });
  }

  /** One click: POST /auth/login with the demo account, then the dashboard. */
  async enter() {
    this.busy.set(true);
    try {
      await this.session.signInDemo();
      await this.router.navigateByUrl('/painel');
    } catch (e) {
      this.toast.say(errorText(e, this.t('login.failed')));
    }
    this.busy.set(false);
  }
}
