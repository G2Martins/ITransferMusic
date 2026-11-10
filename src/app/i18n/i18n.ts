import { DOCUMENT, Injectable, inject, isDevMode, provideAppInitializer, signal } from '@angular/core';
import { Translation, TranslocoLoader, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { firstValueFrom, from, of } from 'rxjs';
import { PT } from './pt';

export type Lang = 'pt-BR' | 'en';
const KEY = 'itransfermusic:lang';

/** PT-BR is bundled (prerender + first paint); EN is a lazy chunk loaded on the first switch. */
@Injectable({ providedIn: 'root' })
class Loader implements TranslocoLoader {
  getTranslation(lang: string) {
    return lang === 'en' ? from(import('./en').then((m) => m.EN as Translation)) : of(PT as Translation);
  }
}

export const provideI18n = () => [
  provideTransloco({
    config: {
      availableLangs: ['pt-BR', 'en'], defaultLang: 'pt-BR', fallbackLang: 'pt-BR', reRenderOnLangChange: true, prodMode: !isDevMode(),
      missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
    },
    loader: Loader,
  }),
  provideAppInitializer(() => firstValueFrom(inject(TranslocoService).load('pt-BR'))),
];

/**
 * Transloco behind a signal: templates call `t('key')`, which reads `lang()`, so a language switch re-renders every
 * OnPush view without impure pipes. The signal only flips after the dictionary is loaded.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private transloco = inject(TranslocoService);
  private doc = inject(DOCUMENT);
  readonly lang = signal<Lang>('pt-BR');

  /** Browser only (afterNextRender): the prerendered HTML is always PT-BR, so hydration matches. */
  restore() {
    try { if (localStorage.getItem(KEY) === 'en') this.set('en'); } catch { /* storage blocked */ }
  }

  async set(lang: Lang) {
    await firstValueFrom(this.transloco.load(lang));
    this.transloco.setActiveLang(lang);
    this.lang.set(lang);
    this.doc.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
  }

  t = (key: string, params?: Record<string, unknown>): string => {
    this.lang();
    return this.transloco.translate(key, params);
  };

  /** Intl locale for dates and numbers. */
  locale = () => (this.lang() === 'en' ? 'en-US' : 'pt-BR');
}
