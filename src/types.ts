export interface Project {
  id: string;
  code: string;
  name: string;
  color: string;
}

/** A booking ("Buchung"/"Segment"): a contiguous interval on a project.
 *  start/end are minutes since midnight (0…1440). */
export interface Segment {
  id: string;
  pid: string;
  start: number;
  end: number;
  activity: string;
}

export type Tab = 'track' | 'report' | 'admin';
export type TileLayout = 'grid' | 'sized' | 'list';
export type ReportPeriod = 'heute' | 'woche' | 'monat' | 'jahr' | 'zeitraum';

export interface Gap {
  start: number;
  end: number;
}
