export interface TimezoneOption {
  label: string;
  offsetMinutes: number;
}

/** Lista de fusos horarios comuns. Valores em minutos relativos ao UTC. */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { label: '(UTC-8) Los Angeles', offsetMinutes: -480 },
  { label: '(UTC-5) Rio Branco, Nova York, Toronto', offsetMinutes: -300 },
  { label: '(UTC-4) Manaus, Boa Vista', offsetMinutes: -240 },
  { label: '(UTC-3) Brasília, São Paulo, Rio de Janeiro', offsetMinutes: -180 },
  { label: '(UTC-2) Fernando de Noronha', offsetMinutes: -120 },
  { label: '(UTC+0) Lisboa, Londres', offsetMinutes: 0 },
  { label: '(UTC+1) Madri, Paris, Berlim', offsetMinutes: 60 },
  { label: '(UTC+2) Atenas, Helsinque', offsetMinutes: 120 },
  { label: '(UTC+3) Moscou, Istambul', offsetMinutes: 180 },
  { label: '(UTC+4) Dubai', offsetMinutes: 240 },
  { label: '(UTC+8) Pequim, Singapura', offsetMinutes: 480 },
  { label: '(UTC+9) Tóquio, Seul', offsetMinutes: 540 },
];

/**
 * Converte hora/minuto UTC para hora/minuto local de acordo com o offset.
 */
export function utcToLocal(
  utcHour: number,
  utcMinute: number,
  offsetMinutes: number,
): { hour: number; minute: number } {
  const total = utcHour * 60 + utcMinute + offsetMinutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
  };
}

/**
 * Converte hora/minuto local (no fuso do usuario) para UTC.
 */
export function localToUtc(
  localHour: number,
  localMinute: number,
  offsetMinutes: number,
): { hour: number; minute: number } {
  const total = localHour * 60 + localMinute - offsetMinutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
  };
}

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m
    ? `UTC${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    : `UTC${sign}${h}`;
}

export function timezoneLabel(offsetMinutes: number): string {
  const match = TIMEZONE_OPTIONS.find((o) => o.offsetMinutes === offsetMinutes);
  return match?.label ?? formatOffset(offsetMinutes);
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
