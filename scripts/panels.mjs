/**
 * The four panels. Each takes live data plus a palette and returns SVG.
 * Geometry is expressed in a 1200-wide coordinate space; GitHub scales the
 * whole thing down to its column width, so every size here is "at 1200".
 */
/*
 * Animation rule for every panel: an element's resting state is its VISIBLE
 * state, and no animation is ever responsible for revealing content.
 *
 * The earlier version staggered cards and bar segments in from opacity:0.
 * Browsers do not run animations inside an <img> that is off screen, so every
 * panel below the fold rendered permanently blank, and prefers-reduced-motion
 * users would have seen the same empty boxes. Only stroke-dash draw-ins
 * (which rest fully drawn), the sweep and the LED pulse survive, all with
 * zero delay and no fill-mode, so a renderer that ignores CSS entirely still
 * shows a finished panel.
 */
import { GEO, TYPE, accentFor } from './tokens.mjs';
import { STRINGS, MONTHS, sanitize } from './copy.mjs';
import { esc, text, line, cornerMarks, grid, smoothPath, polylineLength, wrap, measure, panel } from './svg.mjs';

const P = GEO.pad;
const W = GEO.width;
const RIGHT = W - P;
const INNER = RIGHT - P;
const n = (v) => v.toLocaleString('en-US');

/** Panel chrome: field, grid, hairline frame, registration marks. */
const shell = (h, t) => `
<rect width="${W}" height="${h}" rx="${GEO.radius}" fill="${t.bg}"/>
<g clip-path="url(#clip)">${grid(W, h, 40, t.grid)}</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${h - 1}" rx="${GEO.radius}" fill="none" stroke="${t.hair}"/>
${cornerMarks(W, h, 22, 18, t.hairStrong)}`;

const clip = (h) =>
  `<defs><clipPath id="clip"><rect width="${W}" height="${h}" rx="${GEO.radius}"/></clipPath></defs>`;

/* ------------------------------------------------------------------ header */

export function header(d, t) {
  const H = 340;
  const site = sanitize(STRINGS.site);
  const ledX = RIGHT - measure(site, TYPE.label, 2) - 22;

  const cells = [
    [n(d.contributions.total), STRINGS.contributions],
    [n(d.repoCount), STRINGS.repositories],
    [n(d.languages.length), STRINGS.languages],
    [new Date(d.createdAt).getUTCFullYear().toString(), STRINGS.joined],
  ];
  const cw = INNER / cells.length;

  const stats = cells.map(([value, label], i) => {
    const x = P + cw * i;
    const sep = i ? line(x, 250, x, 316, t.hair) : '';
    return `${sep}
${text(value, { x: x + 2, y: 286, size: TYPE.statValue, fill: t.fg, weight: 500 })}
${text(label, { x: x + 3, y: 310, size: TYPE.statLabel, fill: t.dim, spacing: 2.4 })}`;
  }).join('');

  const style = `
.rule{stroke-dasharray:584;animation:draw 1.7s cubic-bezier(.2,.7,.2,1)}
.led{animation:pulse 2.6s ease-in-out infinite}
.halo{animation:halo 2.6s ease-in-out infinite}
@keyframes draw{from{stroke-dashoffset:584}to{stroke-dashoffset:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes halo{0%{r:5;opacity:.5}70%,100%{r:13;opacity:0}}`;

  return panel(W, H, `${clip(H)}${shell(H, t)}
${text(sanitize(STRINGS.name).toUpperCase(), { x: P, y: 122, size: TYPE.wordmark, fill: t.fg, weight: 500, spacing: 11 })}
<line x1="${P}" y1="150" x2="${P + 584}" y2="150" stroke="${t.hairStrong}" stroke-width="1.5" class="rule"/>
${text(sanitize(STRINGS.bio), { x: P, y: 192, size: TYPE.body, fill: t.muted })}
<circle cx="${ledX}" cy="76" r="5" fill="none" stroke="${accentFor(1)}" class="halo"/>
<circle cx="${ledX}" cy="76" r="4" fill="${accentFor(1)}" class="led"/>
${text(site, { x: RIGHT, y: 82, size: TYPE.label, fill: t.muted, spacing: 2, anchor: 'end' })}
${line(P, 232, RIGHT, 232, t.hair)}
${stats}`, style);
}

/* --------------------------------------------------------------- telemetry */

export function telemetry(d, t) {
  const H = 300;
  const TOP = 150;
  const BASE = 250;
  const days = d.contributions.days;

  // 366 raw daily samples across 1088px renders as noise. A centred 7-day mean
  // keeps the true shape of the year while staying legible at GitHub's width.
  const raw = days.map((x) => x.count);
  const K = 7;
  const mean = raw.map((_, i) => {
    const a = Math.max(0, i - 3);
    const b = Math.min(raw.length, i + 4);
    let sum = 0;
    for (let j = a; j < b; j++) sum += raw[j];
    return sum / (b - a);
  });

  // One 252-contribution day would flatten everything else, so the ceiling is a
  // high percentile of the smoothed series rather than its maximum.
  const sorted = [...mean].sort((a, b) => a - b);
  const ceil = Math.max(1, sorted[Math.floor(sorted.length * 0.97)]);

  const pts = mean.map((v, i) => [
    P + (INNER * i) / (mean.length - 1),
    BASE - Math.min(1, v / ceil) * (BASE - TOP),
  ]);
  const path = smoothPath(pts);
  const len = Math.ceil(polylineLength(pts));

  const peakIdx = raw.reduce((best, c, i) => (c > raw[best] ? i : best), 0);
  const [px, py] = pts[peakIdx];
  const labelX = Math.min(Math.max(px, P + 24), RIGHT - 24);

  // Month ticks land on the first sample of each new month.
  let lastMonth = -1;
  let lastX = -Infinity;
  const ticks = days.map((day, i) => {
    const m = Number(day.date.slice(5, 7)) - 1;
    if (m === lastMonth) return '';
    lastMonth = m;
    const x = pts[i][0];
    // The window opens mid-month, so the first two boundaries can land a few
    // pixels apart. Drop the second rather than overprint the initials.
    if (x > RIGHT - 14 || x - lastX < 46) return '';
    lastX = x;
    return `${line(x, BASE, x, BASE + 7, t.hair)}
${text(MONTHS[m], { x, y: BASE + 26, size: TYPE.micro, fill: t.dim, anchor: 'middle' })}`;
  }).join('');

  const style = `
.trace{stroke-dasharray:${len};animation:trace 2.8s cubic-bezier(.3,.8,.3,1)}
.sweep{animation:sweep 9s linear infinite}
@keyframes trace{from{stroke-dashoffset:${len}}to{stroke-dashoffset:0}}
@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(${INNER}px)}}`;

  return panel(W, H, `
<defs>
<clipPath id="clip"><rect width="${W}" height="${H}" rx="${GEO.radius}"/></clipPath>
<linearGradient id="under" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${t.fg}" stop-opacity=".22"/>
<stop offset="1" stop-color="${t.fg}" stop-opacity="0"/>
</linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${accentFor(1)}" stop-opacity="0"/>
<stop offset="1" stop-color="${accentFor(1)}" stop-opacity=".16"/>
</linearGradient>
<clipPath id="plot"><rect x="${P}" y="${TOP - 20}" width="${INNER}" height="${BASE - TOP + 20}"/></clipPath>
<linearGradient id="falloff" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity="0"/>
<stop offset=".55" stop-color="#fff" stop-opacity="1"/>
<stop offset="1" stop-color="#fff" stop-opacity="1"/>
</linearGradient>
<mask id="beamMask"><rect x="${P}" y="${TOP - 20}" width="${INNER}" height="${BASE - TOP + 20}" fill="url(#falloff)"/></mask>
</defs>
${shell(H, t)}
${text(n(d.contributions.total), { x: P, y: 96, size: 44, fill: t.fg, weight: 500 })}
${text(`${STRINGS.contributions} ${STRINGS.lastYear}`.toUpperCase(), { x: P, y: 124, size: TYPE.statLabel, fill: t.dim, spacing: 2.4 })}
<g clip-path="url(#plot)">
<path d="${path}L${RIGHT} ${BASE}L${P} ${BASE}Z" fill="url(#under)"/>
<path d="${path}" fill="none" stroke="${t.fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="trace"/>
<g class="sweep" mask="url(#beamMask)"><rect x="${P - 120}" y="${TOP - 20}" width="120" height="${BASE - TOP + 20}" fill="url(#beam)"/>
<line x1="${P}" y1="${TOP - 20}" x2="${P}" y2="${BASE}" stroke="${accentFor(1)}" stroke-width="1.5" opacity=".6"/></g>
</g>
${line(P, BASE, RIGHT, BASE, t.hairStrong)}
<g>
<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${accentFor(0)}"/>
<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="none" stroke="${accentFor(0)}" stroke-opacity=".45"/>
${text(n(raw[peakIdx]), { x: labelX, y: py - 18, size: TYPE.micro, fill: t.muted, anchor: 'middle' })}
</g>
${ticks}`, style);
}

/* ------------------------------------------------------------------- stack */

export function stack(d, t) {
  const H = 190;
  const BAR_Y = 104;
  const BAR_H = 26;
  const shown = d.languages.slice(0, 8);
  const legend = d.languages.slice(0, 6);

  let x = P;
  const segs = shown.map((l, i) => {
    const w = (INNER * l.pct) / 100;
    const seg = `<rect x="${x.toFixed(2)}" y="${BAR_Y}" width="${Math.max(2, w - 2).toFixed(2)}" height="${BAR_H}" fill="${accentFor(i)}"/>`;
    x += w;
    return seg;
  }).join('');
  const rest = INNER - (x - P);

  const lw = INNER / legend.length;
  const keys = legend.map((l, i) => {
    const lx = P + lw * i;
    return `<rect x="${lx}" y="${164 - 9}" width="9" height="9" rx="2" fill="${accentFor(i)}"/>
${text(l.name, { x: lx + 18, y: 164, size: TYPE.cardBody, fill: t.muted })}
${text(`${l.pct.toFixed(1)}%`, { x: lx + 18 + measure(l.name, TYPE.cardBody) + 10, y: 164, size: TYPE.cardBody, fill: t.dim })}`;
  }).join('');

  return panel(W, H, `${clip(H)}${shell(H, t)}
${text(STRINGS.languages, { x: P, y: 76, size: TYPE.statLabel, fill: t.dim, spacing: 2.4 })}
${rest > 2 ? `<rect x="${x.toFixed(2)}" y="${BAR_Y}" width="${rest.toFixed(2)}" height="${BAR_H}" fill="${t.hair}"/>` : ''}
${segs}
${keys}`);
}

/* ------------------------------------------------------------------- repos */

export function repos(list, t) {
  const COLS = 2;
  const GAP = 40;
  const ROW_GAP = 28;
  const CW = (INNER - GAP) / COLS;
  // Tall enough that a three-line description still clears the language row.
  const CH = 178;
  const rows = Math.ceil(list.length / COLS);
  const H = P + rows * CH + (rows - 1) * ROW_GAP + P;

  const cards = list.map((r, i) => {
    const cx = P + (i % COLS) * (CW + GAP);
    const cy = P + Math.floor(i / COLS) * (CH + ROW_GAP);
    const accent = accentFor(i);
    const desc = wrap(sanitize(r.description ?? ''), CW - 56, TYPE.cardBody, 3);
    const lang = r.primaryLanguage?.name;

    const lines = desc.map((l, j) =>
      text(l, { x: cx + 28, y: cy + 80 + j * 22, size: TYPE.cardBody, fill: t.muted })
    ).join('');

    return `<g>
<rect x="${cx}" y="${cy}" width="${CW}" height="${CH}" rx="12" fill="${t.surface}" stroke="${t.hair}"/>
<path d="M${cx + 12} ${cy}H${cx + 3}A3 3 0 0 0 ${cx} ${cy + 3}V${cy + CH - 3}A3 3 0 0 0 ${cx + 3} ${cy + CH}H${cx + 12}Z" fill="${accent}"/>
${text(r.name, { x: cx + 28, y: cy + 46, size: TYPE.cardTitle, fill: t.fg, weight: 500 })}
${lines}
${lang ? `<circle cx="${cx + 33}" cy="${cy + CH - 28}" r="4" fill="${accent}"/>
${text(lang, { x: cx + 46, y: cy + CH - 24, size: TYPE.micro, fill: t.dim, spacing: 1.4 })}` : ''}
</g>`;
  }).join('');

  return panel(W, H, `${clip(H)}
<rect width="${W}" height="${H}" rx="${GEO.radius}" fill="${t.bg}"/>
<g clip-path="url(#clip)">${grid(W, H, 40, t.grid)}</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${GEO.radius}" fill="none" stroke="${t.hair}"/>
${cornerMarks(W, H, 22, 18, t.hairStrong)}
${cards}`);
}
