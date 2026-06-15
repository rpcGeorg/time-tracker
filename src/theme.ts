/* rpc Design System tokens used across the app. */
export const C = {
  accent1: '#074771', // Dunkelblau
  accent2: '#176A98', // Mittelblau
  accent3: '#2690C4', // Hellblau
  accent3_60: '#7BBEE0',
  critical: '#BD185F', // pink – kritische Punkte only
  dk1: '#0E1721', // near-black text
  lt1: '#FEFFFF', // off-white background
  lt2: '#F3F4F4', // soft grey
  borderSoft: '#E2E6E8',
  greyFooter: '#878C91',
  muted: '#9AA4AB',
} as const;

/* Categorical project palette: 15 maximally-distinct tones (hue + lightness),
   ΔE ≥ 27 between any pair, each readable with auto black/white text. */
export const PALETTE = [
  '#2B5FAE',
  '#19B3C6',
  '#2E8B3D',
  '#B6E020',
  '#E8B81E',
  '#E8772E',
  '#9C5A2C',
  '#D93A33',
  '#7E1D26',
  '#E66BA0',
  '#B6309A',
  '#7B3FB8',
  '#15225E',
  '#54677A',
  '#AEB4BA',
];
