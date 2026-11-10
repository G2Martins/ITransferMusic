import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PROVIDER_META, Provider } from '../data/site';

// Inline SVG icons, lucide-style strokes.
const STROKE: Record<string, string[]> = {
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'arrow-left': ['M19 12H5', 'm12 19-7-7 7-7'],
  'arrow-up-right': ['M7 7h10v10', 'M7 17 17 7'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  plus: ['M5 12h14', 'M12 5v14'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  check: ['M20 6 9 17l-5-5'],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'm21 21-4.3-4.3'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
  transfer: ['m16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16'],
  sync: ['M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 21v-5h5', 'M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5'],
  sparkle: ['M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z', 'M19 3v4', 'M21 5h-4'],
  share: ['M18 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'm8.6 13.5 6.8 4', 'm15.4 6.5-6.8 4'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  unlink: ['m18.8 13.4 1.7-1.7a5 5 0 0 0-7-7l-1.7 1.7', 'm5.2 10.6-1.7 1.7a5 5 0 0 0 7 7l1.7-1.7', 'M8 2v3', 'M2 8h3', 'M16 22v-3', 'M22 16h-3'],
  home: ['m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  music: ['M9 18V5l12-2v13', 'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  play: ['M6 3l14 9-14 9V3z'],
  pause: ['M6 4h4v16H6z', 'M14 4h4v16h-4z'],
  refresh: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 16v-4', 'M12 8h.01'],
  alert: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v4', 'M12 16h.01'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'm9 12 2 2 4-4'],
  github: ['M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4', 'M9 18c-4.51 2-5-2-7-2'],
  globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  server: ['M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M6 6h.01', 'M6 18h.01'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  layers: ['m12 2 10 5-10 5L2 7z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5'],
  copy: ['M8 8h12v12H8z', 'M4 16V4h12'],
  external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      @for (d of paths(); track $index) { <path [attr.d]="d" /> }
    </svg>
  `,
})
export class Icon {
  name = input.required<string>();
  size = input(18);
  protected paths = computed(() => STROKE[this.name()] ?? []);
}

/** The ITransferMusic mark: the brand's pink play-triangle with a white note, redrawn as a vector. */
@Component({
  selector: 'app-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" focusable="false">
      <path d="M8.4 3.6C5.7 2.1 3 3.4 3 6.6v18.8c0 3.2 2.7 4.5 5.4 3l18-9.4c2.8-1.5 2.8-4.5 0-6z" fill="#E5305E" />
      <path d="M15.6 8.2v10.7" stroke="#1E1730" stroke-width="1.6" stroke-linecap="round" opacity=".55" transform="translate(-1.2 .6)" />
      <circle cx="12.3" cy="19.6" r="3.4" fill="#fff" />
      <path d="M15.2 19.4V7.6c1.6 2.6 4.6 3.1 4.9 6.1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </svg>
  `,
})
export class Mark {
  size = input(30);
}

// Simplified identifying glyphs (not the official logos), drawn white on the service colour.
type Stroke = { d: string; fill?: boolean; w?: number };
const GLYPH: Record<Provider, Stroke[]> = {
  spotify: [{ d: 'M7 10.4c3.4-1.1 7.3-.8 10.2.9' }, { d: 'M7.7 13.4c2.8-.8 5.8-.6 8.2.7' }, { d: 'M8.4 16.2c2.1-.6 4.3-.4 6 .5' }],
  youtube: [{ d: 'M10 8.3v7.4l6.2-3.7z', fill: true }],
  apple_music: [{ d: 'M10 16.6V8.2l7-1.5v8.4', w: 1.6 }, { d: 'M8.6 14.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6z', fill: true }, { d: 'M15.6 13.3a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6z', fill: true }],
  amazon_music: [{ d: 'M6.6 13.6c3.3 2.2 7.5 2.2 10.8 0' }, { d: 'M15.6 12.8l2 .8-.4 2' }, { d: 'M8 8.6h8' }],
  deezer: [{ d: 'M7.2 14.2v2.4', w: 2.4 }, { d: 'M10.8 11.2v5.4', w: 2.4 }, { d: 'M14.4 8.2v8.4', w: 2.4 }, { d: 'M18 12.2v4.4', w: 2.4 }],
};

/** Small identifying badge for a streaming service (name in aria-label/title, colour + glyph). */
@Component({
  selector: 'app-provider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Decorative by default (a visible name sits next to it); `labeled` when the badge alone says which service it is.
  host: { class: 'inline-flex shrink-0', '[attr.role]': "labeled() ? 'img' : null", '[attr.aria-label]': 'labeled() ? meta().label : null', '[attr.aria-hidden]': "labeled() ? null : 'true'", '[attr.title]': 'meta().label' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect width="24" height="24" [attr.rx]="size() > 28 ? 7 : 6" [attr.fill]="meta().color" />
      @for (g of glyph(); track $index) {
        <path [attr.d]="g.d" [attr.fill]="g.fill ? '#fff' : 'none'" [attr.stroke]="g.fill ? null : '#fff'" [attr.stroke-width]="g.w ?? 1.7" stroke-linecap="round" stroke-linejoin="round" />
      }
    </svg>
  `,
})
export class ProviderBadge {
  provider = input.required<Provider>();
  size = input(22);
  labeled = input(false);
  protected meta = computed(() => PROVIDER_META[this.provider()]);
  protected glyph = computed(() => GLYPH[this.provider()] ?? []);
}

/** Generated cover: gradient from the name's hash + initials. Never album art. */
@Component({
  selector: 'app-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
  template: `<span class="cover" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.3" [style.--c1]="c().c1" [style.--c2]="c().c2"><span>{{ c().initials }}</span></span>`,
})
export class Cover {
  name = input.required<string>();
  size = input(44);
  protected c = computed(() => cover(this.name()));
}

export function cover(name: string) {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const hue = h % 360;
  const words = name.replace(/\(.*?\)|By ITransferMusic/g, '').split(/[\s/&-]+/).filter((w) => /[\p{L}\d]/u.test(w));
  return {
    c1: `hsl(${hue} 62% 46%)`,
    c2: `hsl(${(hue + 48) % 360} 58% 30%)`,
    initials: (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase(),
  };
}
