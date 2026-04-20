import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';
const KEY = 'itm:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      const root = document.documentElement;
      root.classList.toggle('dark', t === 'dark');
      localStorage.setItem(KEY, t);
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private initial(): Theme {
    const saved = localStorage.getItem(KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
