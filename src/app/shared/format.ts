// Formatting and time-zone helpers (browser-only callers: the app routes render on the client).

export const pad2 = (n: number) => n.toString().padStart(2, '0');

export function fmtDateTime(iso: string | null, locale: string, withYear = false): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', ...(withYear ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function fmtRelative(iso: string | null, locale: string, now = Date.now()): string {
  if (!iso) return '';
  const diff = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 45) return rtf.format(Math.round(diff), 'second');
  if (abs < 2700) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 79200) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

/** Same list as the original frontend (core/utils/timezone.ts). */
export const TIMEZONES = [
  { label: '(UTC-5) Rio Branco', offset: -300 },
  { label: '(UTC-4) Manaus, Cuiabá', offset: -240 },
  { label: '(UTC-3) Brasília, São Paulo', offset: -180 },
  { label: '(UTC-2) Fernando de Noronha', offset: -120 },
  { label: '(UTC+0) Lisboa, Londres', offset: 0 },
  { label: '(UTC+1) Madri, Paris, Berlim', offset: 60 },
  { label: '(UTC-8) Los Angeles', offset: -480 },
  { label: '(UTC+9) Tóquio, Seul', offset: 540 },
];

/** Converts a local hh:mm (user's offset in minutes from UTC) to UTC hh:mm, and back. */
export function localToUtc(hour: number, minute: number, offset: number) {
  const t = (((hour * 60 + minute - offset) % 1440) + 1440) % 1440;
  return { hour: Math.floor(t / 60), minute: t % 60 };
}
export function utcToLocal(hour: number, minute: number, offset: number) {
  return localToUtc(hour, minute, -offset);
}
export function fmtOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  const a = Math.abs(offset);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? ':' + pad2(a % 60) : ''}`;
}
/** hh:mm of an ISO instant in the user's offset (not the browser's zone: the profile setting wins, like the original). */
export function clockAt(iso: string, offset: number): string {
  const d = new Date(Date.parse(iso) + offset * 60_000);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

export const tone = (status: string) =>
  ({ completed: 'tag-ok', active: 'tag-ok', partial: 'tag-warn', paused: 'tag', running: 'tag-accent', pending: 'tag', failed: 'tag-bad', error: 'tag-bad' })[status] ?? 'tag';

export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
