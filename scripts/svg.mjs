/**
 * Small SVG helpers shared by every panel.
 *
 * Monospace is not just an aesthetic choice here: a fixed advance width is
 * what makes wrapping and truncation computable without a layout engine,
 * which is the only way to typeset text inside a generated SVG.
 */
import { MONO } from './tokens.mjs';

/** Monospace advance width as a fraction of font size, true of every stack in MONO. */
const ADVANCE = 0.6;

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const charsThatFit = (width, size) => Math.floor(width / (size * ADVANCE));

/** Rendered width of a monospace run. Letter-spacing adds one gap per glyph. */
export const measure = (s, size, spacing = 0) => s.length * (size * ADVANCE + spacing);

/** Greedy word wrap to a pixel width, capped at `lines`, ellipsised if it overflows. */
export function wrap(text, width, size, lines) {
  const max = charsThatFit(width, size);
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= max) { cur = next; continue; }
    if (cur) out.push(cur);
    cur = w;
    if (out.length === lines) break;
  }
  if (cur && out.length < lines) out.push(cur);
  if (out.length === lines) {
    const consumed = out.join(' ').length;
    if (consumed < String(text).length - 1) {
      out[lines - 1] = `${out[lines - 1].slice(0, Math.max(0, max - 1)).trimEnd()}...`;
    }
  }
  return out;
}

export function text(content, { x, y, size, fill, weight = 400, spacing = 0, anchor = 'start', opacity, cls }) {
  const attrs = [
    `x="${x}"`, `y="${y}"`,
    `font-family="${MONO}"`,
    `font-size="${size}"`,
    `fill="${fill}"`,
    weight !== 400 ? `font-weight="${weight}"` : '',
    spacing ? `letter-spacing="${spacing}"` : '',
    anchor !== 'start' ? `text-anchor="${anchor}"` : '',
    opacity != null ? `opacity="${opacity}"` : '',
    cls ? `class="${cls}"` : '',
  ].filter(Boolean).join(' ');
  return `<text ${attrs}>${esc(content)}</text>`;
}

export const line = (x1, y1, x2, y2, stroke, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" ${extra}/>`;

/** Four L-shaped registration marks. The frame that makes a panel read as an instrument. */
export function cornerMarks(w, h, inset, len, stroke) {
  const c = [
    [inset, inset, 1, 1],
    [w - inset, inset, -1, 1],
    [inset, h - inset, 1, -1],
    [w - inset, h - inset, -1, -1],
  ];
  return c.map(([x, y, sx, sy]) =>
    `<path d="M${x} ${y + sy * len}L${x} ${y}L${x + sx * len} ${y}" fill="none" stroke="${stroke}" stroke-width="1.25"/>`
  ).join('');
}

/** Faint measurement grid, the substrate every reading sits on. */
export function grid(w, h, step, stroke) {
  const parts = [];
  for (let x = step; x < w; x += step) parts.push(`M${x} 0V${h}`);
  for (let y = step; y < h; y += step) parts.push(`M0 ${y}H${w}`);
  return `<path d="${parts.join('')}" stroke="${stroke}" stroke-width="1" fill="none"/>`;
}

/** Cardinal spline through points, emitted as cubic beziers. */
export function smoothPath(pts, tension = 0.5) {
  if (pts.length < 2) return '';
  const d = [`M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d.push(`C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return d.join('');
}

export const polylineLength = (pts) =>
  pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** Wraps panel body in a root svg with an explicit size so GitHub scales it down cleanly. */
export function panel(w, h, body, style = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
<style>${style}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
</style>
${body}
</svg>`;
}
