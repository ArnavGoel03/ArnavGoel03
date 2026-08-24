/**
 * Single source of truth for every visual value in the profile panels.
 * Mirrors the dark palette in ~/dev/portfolio/src/app/globals.css.
 * Nothing else in scripts/ may hardcode a colour, size or radius.
 */

/** Warm dark, straight from the portfolio :root block. */
const dark = {
  bg: '#121110',
  surface: '#1a1815',
  fg: '#ede6d5',
  muted: '#a9a293',
  dim: '#8b8578',
  hair: 'rgba(237,230,213,0.10)',
  hairStrong: 'rgba(237,230,213,0.22)',
  grid: 'rgba(237,230,213,0.045)',
  glow: 'rgba(237,230,213,0.55)',
};

/** Warm paper. The same hues inverted, so light mode still reads as his brand. */
const light = {
  bg: '#f5f2ea',
  surface: '#ece7db',
  fg: '#1a1815',
  muted: '#5f594e',
  dim: '#7a7367',
  hair: 'rgba(18,17,16,0.14)',
  hairStrong: 'rgba(18,17,16,0.28)',
  grid: 'rgba(18,17,16,0.05)',
  glow: 'rgba(18,17,16,0.45)',
};

/** Portfolio --accent-1..4 then --chart-1..5. Order is the assignment ring. */
export const ACCENTS = [
  '#d9483c', '#2f9c82', '#ad8329', '#3d74be',
  '#d4a96a', '#8a8c5a', '#6d8372', '#c66a5e', '#a49478',
];

export const THEMES = { dark, light };

/** Camo strips external stylesheets, so only system stacks survive. */
export const MONO =
  "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

/** Scaled for a 1200-wide panel rendered into GitHub's ~880px column. */
export const TYPE = {
  wordmark: 58,
  statValue: 30,
  statLabel: 13,
  body: 20,
  label: 14,
  micro: 12,
  cardTitle: 20,
  cardBody: 14,
};

export const GEO = {
  width: 1200,
  pad: 56,
  radius: 16,
  hairline: 1,
  tick: 10,
};

/** Deterministic accent per item, so a reorder never reshuffles the palette. */
export const accentFor = (i) => ACCENTS[i % ACCENTS.length];
