import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { AUTHOR, OG_IMAGE, PORTFOLIO_URL, PROJECT_URL, REPO_URL, SITE_NAME, SITE_URL } from '../data/site';

export interface PageSeo {
  title: string;
  description: string;
  /** Path with trailing slash, e.g. "/sobre/". */
  path: string;
  noindex?: boolean;
  jsonLd?: object[];
}

const abs = (p: string) => (p.startsWith('http') ? p : SITE_URL + p);
export const person = { '@type': 'Person', '@id': `${PORTFOLIO_URL}#person`, name: AUTHOR, url: PORTFOLIO_URL };

export const websiteNode = () => ({
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  inLanguage: 'pt-BR',
  description: 'Demo estática de uma plataforma para transferir, gerar e sincronizar playlists entre serviços de streaming. Projeto de portfólio.',
  creator: person,
});

export const appNode = () => ({
  '@type': 'WebApplication',
  '@id': `${SITE_URL}/#app`,
  name: SITE_NAME,
  url: `${SITE_URL}/painel/`,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requer JavaScript',
  inLanguage: 'pt-BR',
  isAccessibleForFree: true,
  description: 'Transferência de playlists com matching por faixa, gerador por gênero e humor e sincronização agendada entre Spotify, YouTube Music, Apple Music, Amazon Music e Deezer. Contas e transferências simuladas no navegador.',
  author: person,
  creator: person,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  sameAs: [REPO_URL, PROJECT_URL],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
});

@Injectable({ providedIn: 'root' })
export class Seo {
  private doc = inject(DOCUMENT);
  private meta = inject(Meta);
  private title = inject(Title);

  set(p: PageSeo) {
    const url = abs(p.path);
    const image = abs(OG_IMAGE);
    this.title.setTitle(p.title);
    const tags: Record<string, string> = {
      description: p.description,
      robots: p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
      'og:type': 'website',
      'og:site_name': SITE_NAME,
      'og:locale': 'pt_BR',
      'og:title': p.title,
      'og:description': p.description,
      'og:url': url,
      'og:image': image,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': 'ITransferMusic: uma playlist roteada do Spotify para o Deezer, faixa a faixa, com a confiança de cada correspondência',
      'twitter:card': 'summary_large_image',
      'twitter:title': p.title,
      'twitter:description': p.description,
      'twitter:image': image,
    };
    for (const [key, content] of Object.entries(tags)) {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
    }

    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);

    let ld = this.doc.getElementById('ld-json');
    if (!ld) {
      ld = this.doc.createElement('script');
      ld.id = 'ld-json';
      ld.setAttribute('type', 'application/ld+json');
      this.doc.head.appendChild(ld);
    }
    // Escape "<" so no string in the data can close the script element.
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [websiteNode(), ...(p.jsonLd ?? [])] }).replace(/</g, '\\u003c');
  }
}
