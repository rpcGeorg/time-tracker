import type { DaySegment, Project, ReportPeriod } from '../types';
import { fmtH } from './time';

export interface AggSegment {
  pid: string;
  color: string;
  h: number;
}

export interface ColumnBucket {
  label: string;
  total: number;
  /** height in px of the whole stacked column */
  colHeight: number;
  segments: { pid: string; color: string; heightPx: number }[];
}

export interface RankedBar {
  pid: string;
  name: string;
  code: string;
  durText: string;
  pctText: string;
  color: string;
  fillPct: number; // relative to max project total
}

export interface AggData {
  rangeLabel: string;
  totalText: string;
  shareSegments: { pid: string; color: string; widthPct: number }[];
  columnBuckets: ColumnBucket[];
  rankedBars: RankedBar[];
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** Local YYYY-MM-DD → Date at local midnight (avoids UTC off-by-one). */
function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
/** Whole days from a to b (both at local midnight). */
function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
/** Monday on or before d. */
function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

/** Inclusive day range (YYYY-MM-DD) that a period covers — used both to fetch
 *  the bookings and to bound the aggregation. */
export function periodRange(
  period: ReportPeriod,
  custFrom: string,
  custTo: string,
  today: Date,
): { from: string; to: string } {
  if (period === 'woche') {
    const mon = mondayOf(today);
    return { from: dayKey(mon), to: dayKey(addDays(mon, 6)) };
  }
  if (period === 'monat') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: dayKey(first), to: dayKey(last) };
  }
  if (period === 'jahr') {
    return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` };
  }
  // zeitraum (and any fallback): normalise order
  const from = custFrom <= custTo ? custFrom : custTo;
  const to = custFrom <= custTo ? custTo : custFrom;
  return { from, to };
}

interface AggInput {
  projects: Project[];
  period: ReportPeriod;
  custFrom: string;
  custTo: string;
  today: Date;
  /** Real bookings across the period (already tagged with their day). */
  daySegments: DaySegment[];
}

interface BucketPlan {
  labels: string[];
  rangeLabel: string;
  from: Date;
  to: Date;
  /** Bucket index for a given day, or -1 when out of range. */
  bucketOf: (d: Date) => number;
}

/** Build the bucket layout (labels + day→bucket mapping) for a period. */
function planBuckets(period: ReportPeriod, custFrom: string, custTo: string, today: Date): BucketPlan {
  const fmtD = (d: Date) => d.getDate() + '. ' + MONTHS[d.getMonth()];

  if (period === 'woche') {
    const mon = mondayOf(today);
    const sun = addDays(mon, 6);
    return {
      labels: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      rangeLabel: mon.getDate() + '.–' + sun.getDate() + '. ' + MONTHS[sun.getMonth()] + ' ' + sun.getFullYear(),
      from: mon,
      to: sun,
      bucketOf: (d) => dayDiff(mon, d),
    };
  }

  if (period === 'monat') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstMon = mondayOf(first);
    const labels: string[] = [];
    for (let w = firstMon; w <= last; w = addDays(w, 7)) labels.push('KW ' + isoWeek(w));
    return {
      labels,
      rangeLabel: first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      from: first,
      to: last,
      bucketOf: (d) => Math.floor(dayDiff(firstMon, d) / 7),
    };
  }

  if (period === 'jahr') {
    const y = today.getFullYear();
    return {
      labels: [...MONTHS],
      rangeLabel: String(y),
      from: new Date(y, 0, 1),
      to: new Date(y, 11, 31),
      bucketOf: (d) => d.getMonth(),
    };
  }

  // zeitraum
  const range = periodRange('zeitraum', custFrom, custTo, today);
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  const days = Math.max(1, dayDiff(from, to) + 1);
  const rangeLabel = fmtD(from) + ' – ' + fmtD(to) + ' ' + to.getFullYear();
  if (days <= 21) {
    const labels: string[] = [];
    for (let i = 0; i < days; i++) labels.push(String(addDays(from, i).getDate()));
    return { labels, rangeLabel, from, to, bucketOf: (d) => dayDiff(from, d) };
  }
  const wks = Math.ceil(days / 7);
  const labels: string[] = [];
  for (let i = 0; i < wks; i++) labels.push('W' + (i + 1));
  return { labels, rangeLabel, from, to, bucketOf: (d) => Math.floor(dayDiff(from, d) / 7) };
}

/** Aggregate the real bookings for Woche / Monat / Jahr / Zeitraum (FA-23 … FA-25).
 *  Hours come from the actual segment durations; out-of-range days are ignored. */
export function aggregate({ projects, period, custFrom, custTo, today, daySegments }: AggInput): AggData {
  const plan = planBuckets(period, custFrom, custTo, today);
  const { labels, rangeLabel, from, to, bucketOf } = plan;

  const known = new Set(projects.map((p) => p.id));
  const totals: Record<string, number> = {};
  projects.forEach((p) => (totals[p.id] = 0));
  const bucketTotals: Record<string, number>[] = labels.map(() => ({}));

  daySegments.forEach((seg) => {
    if (!known.has(seg.pid)) return;
    const d = parseDay(seg.day);
    if (d < from || d > to) return;
    const b = bucketOf(d);
    if (b < 0 || b >= labels.length) return;
    const h = Math.max(0, seg.end - seg.start) / 60;
    if (h <= 0) return;
    totals[seg.pid] += h;
    bucketTotals[b][seg.pid] = (bucketTotals[b][seg.pid] || 0) + h;
  });

  const buckets = labels.map((lab, b) => {
    const segs: AggSegment[] = [];
    projects.forEach((p) => {
      const h = bucketTotals[b][p.id] || 0;
      if (h > 0) segs.push({ pid: p.id, color: p.color, h });
    });
    const total = segs.reduce((a, x) => a + x.h, 0);
    return { label: lab, segs, total };
  });

  const grand = Object.values(totals).reduce((a, b) => a + b, 0);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.total));
  const maxH = 116;
  const columnBuckets: ColumnBucket[] = buckets.map((b) => {
    const colHeight = b.total > 0 ? Math.max(3, (b.total / maxBucket) * maxH) : 0;
    return {
      label: b.label,
      total: b.total,
      colHeight,
      segments: b.segs.map((sg) => ({
        pid: sg.pid,
        color: sg.color,
        heightPx: (sg.h / b.total) * colHeight,
      })),
    };
  });

  const used = projects.filter((p) => totals[p.id] > 0).sort((a, b) => totals[b.id] - totals[a.id]);
  const maxTotal = Math.max(1, ...used.map((p) => totals[p.id]));
  const rankedBars: RankedBar[] = used.map((p) => ({
    pid: p.id,
    name: p.name,
    code: p.code,
    durText: fmtH(totals[p.id]) + ' h',
    pctText: Math.round((totals[p.id] / (grand || 1)) * 100) + '%',
    color: p.color,
    fillPct: (totals[p.id] / maxTotal) * 100,
  }));
  const shareSegments = used.map((p) => ({
    pid: p.id,
    color: p.color,
    widthPct: (totals[p.id] / (grand || 1)) * 100,
  }));

  return { rangeLabel, totalText: fmtH(grand), shareSegments, columnBuckets, rankedBars };
}
