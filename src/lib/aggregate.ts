import type { Project, ReportPeriod } from '../types';
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

// deterministic hashing so demo data is stable per (period, bucket, project)
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rand(seed: number): number {
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
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

interface AggInput {
  projects: Project[];
  period: ReportPeriod;
  custFrom: string;
  custTo: string;
  today: Date;
}

/** Demo aggregation for Woche / Monat / Jahr / Zeitraum (FA-23 … FA-25).
 *  Per the requirements doc these views are based on deterministic demo data
 *  and are not yet linked to the real bookings. */
export function aggregate({ projects, period, custFrom, custTo, today }: AggInput): AggData {
  const fmtD = (d: Date) => d.getDate() + '. ' + MONTHS[d.getMonth()];

  let labels: string[] = [];
  let weekend: number[] = [];
  let rangeLabel = '';

  if (period === 'woche') {
    labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    weekend = [0, 0, 0, 0, 0, 1, 1];
    const mondayOffset = (today.getDay() + 6) % 7;
    const mon = new Date(today.getTime() - mondayOffset * 86400000);
    const sun = new Date(mon.getTime() + 6 * 86400000);
    rangeLabel = mon.getDate() + '.–' + sun.getDate() + '. ' + MONTHS[sun.getMonth()] + ' ' + sun.getFullYear();
  } else if (period === 'monat') {
    const y = today.getFullYear();
    const m = today.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const w0 = isoWeek(first);
    const w1 = isoWeek(last);
    const nWeeks = w1 >= w0 ? w1 - w0 + 1 : w1 + 1; // year wrap (Dec→Jan)
    for (let i = 0; i < nWeeks; i++) labels.push('KW ' + (w0 + i));
    rangeLabel = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  } else if (period === 'jahr') {
    labels = [...MONTHS];
    rangeLabel = String(today.getFullYear());
  } else {
    const from = new Date(custFrom);
    const to = new Date(custTo);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    if (days <= 21) {
      for (let i = 0; i < days; i++) {
        const d = new Date(from.getTime() + i * 86400000);
        labels.push(String(d.getDate()));
        weekend.push(d.getDay() === 0 || d.getDay() === 6 ? 1 : 0);
      }
    } else {
      const wks = Math.ceil(days / 7);
      for (let i = 0; i < wks; i++) labels.push('W' + (i + 1));
    }
    rangeLabel = fmtD(from) + ' – ' + fmtD(to) + ' ' + to.getFullYear();
  }

  const W = projects.map(
    (_p, i) => [1, 0.85, 0.7, 0.55, 0.45, 0.4, 0.5, 0.45, 0.4, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3][i] ?? 0.3,
  );
  const sumW = W.reduce((a, b) => a + b, 0) || 1;
  const isDaily = period === 'woche' || (period === 'zeitraum' && weekend.length > 0);
  const target = period === 'woche' ? 8 : period === 'jahr' ? 150 : period === 'monat' ? 38 : isDaily ? 8 : 38;

  const totals: Record<string, number> = {};
  projects.forEach((p) => (totals[p.id] = 0));

  const buckets = labels.map((lab, b) => {
    const wf = isDaily && weekend[b] ? 0.16 : 1;
    const segs: AggSegment[] = [];
    projects.forEach((p, i) => {
      const seed = hash(period + '|' + b + '|' + p.id);
      const r1 = rand(seed);
      const r2 = rand(seed ^ 0x9e3779b9);
      let h = (W[i] / sumW) * target * (0.5 + 1.0 * r1) * wf;
      if (r2 < 0.16) h = 0;
      h = Math.round(h * 4) / 4;
      if (h > 0) {
        totals[p.id] += h;
        segs.push({ pid: p.id, color: p.color, h });
      }
    });
    const bt = segs.reduce((a, x) => a + x.h, 0);
    return { label: lab, segs, total: bt };
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
