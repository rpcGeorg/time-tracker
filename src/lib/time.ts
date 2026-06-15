/** Formatting helpers ported from the prototype. */

/** Minutes since midnight → "HH:MM" (wraps at 24h). */
export function fmtClock(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

/** Minutes → "H:MM" duration. */
export function fmtDur(m: number): string {
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h + ':' + String(mm).padStart(2, '0');
}

/** Fractional hours → "H:MM". */
export function fmtH(h: number): string {
  const H = Math.floor(h + 1e-9);
  const M = Math.round((h - H) * 60);
  return H + ':' + String(M).padStart(2, '0');
}

/** Readable text color (dark vs. white) for a given background hex. */
export function textOn(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? '#0E1721' : '#FEFFFF';
}

/** Current wall-clock time as minutes since local midnight. */
export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
