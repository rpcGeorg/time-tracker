import type { Project, Segment } from '../types';
import { fmtClock, fmtDur, textOn } from './time';

export const PPM = 2.6; // pixels per minute on the timeline axis

export interface ShareSegment {
  pid: string;
  widthPct: number;
  color: string;
}

export interface LegendEntry {
  pid: string;
  name: string;
  dur: string;
  color: string;
}

export interface HourMark {
  hour: number;
  label: string;
  top: number;
}

export interface BlockGeom {
  id: string;
  code: string;
  rangeText: string;
  activity: string;
  color: string;
  textColor: string;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  isRun: boolean;
  showCode: boolean;
  showRange: boolean;
  showAct: boolean;
  showHandles: boolean;
  tightPad: boolean;
}

export interface GapGeom {
  start: number;
  end: number;
  label: string;
  top: number;
  height: number;
}

export interface ReportData {
  reportDate: string;
  reportTotal: string;
  shareSegments: ShareSegment[];
  legend: LegendEntry[];
  hourMarks: HourMark[];
  blocks: BlockGeom[];
  gaps: GapGeom[];
  timelineHeight: number;
  nowTop: number;
}

interface ReportInput {
  projects: Project[];
  segments: Segment[];
  activeId: string | null;
  vNow: number;
  /** Date the timeline represents (for the localized header). */
  date: Date;
}

/** Computes all geometry for the chronological day timeline (FA-16 … FA-22). */
export function buildReport({ projects, segments, activeId, vNow, date }: ReportInput): ReportData {
  const proj = (pid: string) => projects.find((p) => p.id === pid)!;
  const segs = segments.slice().sort((a, b) => a.start - b.start);

  const reportDate = date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // totals & legend
  const totals: Record<string, number> = {};
  projects.forEach((p) => {
    totals[p.id] = segs.filter((g) => g.pid === p.id).reduce((a, g) => a + (g.end - g.start), 0);
  });
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const reportTotal = fmtDur(Object.values(totals).reduce((a, b) => a + b, 0));
  const used = projects
    .filter((p) => totals[p.id] > 0)
    .sort((a, b) => totals[b.id] - totals[a.id]);
  const shareSegments: ShareSegment[] = used.map((p) => ({
    pid: p.id,
    widthPct: (totals[p.id] / sum) * 100,
    color: p.color,
  }));
  const legend: LegendEntry[] = used.map((p) => ({
    pid: p.id,
    name: p.name,
    dur: fmtDur(totals[p.id]) + ' h',
    color: p.color,
  }));

  // range – the day always starts at 00:00 (FA-16)
  const maxEnd = Math.max(...segs.map((g) => g.end), vNow, 0);
  const startH = 0;
  let endH = Math.min(24, Math.ceil(maxEnd / 60));
  if (endH - startH < 6) endH = Math.min(24, startH + 6);
  const t0 = startH * 60;
  const t1 = endH * 60;
  const timelineHeight = (t1 - t0) * PPM;
  const yOf = (m: number) => (m - t0) * PPM;

  const hourMarks: HourMark[] = [];
  for (let h = startH; h <= endH; h++) {
    hourMarks.push({ hour: h, label: String(h).padStart(2, '0') + ':00', top: yOf(h * 60) });
  }

  // lane assignment for overlapping bookings (FA-17)
  const laneEnds: number[] = [];
  const laneOf: Record<string, number> = {};
  segs.forEach((g) => {
    let li = laneEnds.findIndex((end) => end <= g.start);
    if (li < 0) {
      li = laneEnds.length;
      laneEnds.push(g.end);
    } else laneEnds[li] = g.end;
    laneOf[g.id] = li;
  });
  const nLanes = Math.max(1, laneEnds.length);
  const colW = 100 / nLanes;

  const blocks: BlockGeom[] = segs.map((g) => {
    const p = proj(g.pid);
    const tc = textOn(p.color);
    const top = yOf(g.start);
    const h = Math.max(14, (g.end - g.start) * PPM);
    const act = (g.activity || '').trim();
    return {
      id: g.id,
      code: p.code,
      rangeText: fmtClock(g.start) + '–' + fmtClock(g.end) + '  ·  ' + fmtDur(g.end - g.start) + ' h',
      activity: act,
      color: p.color,
      textColor: tc,
      top,
      height: h,
      leftPct: laneOf[g.id] * colW,
      widthPct: colW,
      isRun: g.id === activeId,
      showCode: h >= 18,
      showRange: h >= 30,
      showAct: h >= 58 && !!act,
      showHandles: h >= 26,
      tightPad: h < 44,
    };
  });

  // merged coverage → gaps (incl. leading gap 00:00 → first booking) (FA-18)
  const merged: { start: number; end: number }[] = [];
  segs.forEach((g) => {
    const last = merged[merged.length - 1];
    if (last && g.start <= last.end) last.end = Math.max(last.end, g.end);
    else merged.push({ start: g.start, end: g.end });
  });
  const gaps: GapGeom[] = [];
  const pushGap = (gs: number, ge: number) => {
    gaps.push({
      start: gs,
      end: ge,
      label: fmtClock(gs) + '–' + fmtClock(ge),
      top: yOf(gs),
      height: (ge - gs) * PPM,
    });
  };
  if (merged.length && merged[0].start - t0 >= 5) pushGap(t0, merged[0].start);
  for (let i = 0; i < merged.length - 1; i++) {
    const gs = merged[i].end;
    const ge = merged[i + 1].start;
    if (ge - gs >= 5) pushGap(gs, ge);
  }

  return {
    reportDate,
    reportTotal,
    shareSegments,
    legend,
    hourMarks,
    blocks,
    gaps,
    timelineHeight,
    nowTop: yOf(vNow),
  };
}
