#!/usr/bin/env node
/**
 * Regenerates every panel from live GitHub data.
 * Run locally with `node scripts/build.mjs`, or on a schedule from Actions.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fetchData } from './data.mjs';
import { THEMES } from './tokens.mjs';
import { SHOWCASE, TIMEZONE } from './copy.mjs';
import { fetchRhythm, fetchCadence } from './activity.mjs';
import { authToken } from './data.mjs';
import * as P from './panels.mjs';

const OUT = new URL('../assets/', import.meta.url);

const data = await fetchData();

// Showcase order is declared in copy.mjs; anything renamed or made private
// simply drops out rather than rendering an empty card.
const byName = new Map(data.repos.map((r) => [r.name, r]));
const showcase = SHOWCASE.map((name) => byName.get(name)).filter(Boolean);
const missing = SHOWCASE.filter((name) => !byName.has(name));

// Commit rhythm and per-repo cadence come from GitHub's precomputed stats,
// which answer 202 while they warm up. Both feed decorative elements, so a
// miss degrades that element rather than failing the build.
const auth = authToken();
const [rhythm, cadence] = await Promise.all([
  fetchRhythm(data.repos, auth, TIMEZONE.offsetMinutes),
  fetchCadence(showcase.map((r) => r.nameWithOwner), auth),
]);

mkdirSync(OUT, { recursive: true });

for (const [theme, palette] of Object.entries(THEMES)) {
  const files = {
    header: P.header(data, palette),
    telemetry: P.telemetry(data, palette),
    stack: P.stack(data, palette),
    repos: P.repos(showcase, palette, cadence),
    clock: P.clock(rhythm, palette),
  };
  for (const [name, svg] of Object.entries(files)) {
    writeFileSync(new URL(`${name}-${theme}.svg`, OUT), svg);
  }
}

// The no-dash rule applies to generated output too, so the build fails loudly
// rather than committing a panel with a U+2014 in it.
const names = Object.keys(THEMES).flatMap((t) =>
  ['header', 'telemetry', 'stack', 'repos', 'clock'].map((p) => `${p}-${t}.svg`)
);
const offenders = names.filter((f) => /[\u2014\u2013]/.test(readFileSync(new URL(f, OUT), 'utf8')));

console.log(`contributions ${data.contributions.total.toLocaleString('en-US')} (private included: ${data.privateVisible})`);
console.log(`repos ${data.repoCount} · languages ${data.languages.length} · showcase ${showcase.length}`);
console.log(`rhythm ${Math.round(rhythm.total).toLocaleString('en-US')} commits from ${rhythm.repos} repos${rhythm.skipped ? `, ${rhythm.skipped} unavailable` : ''} · sparklines ${cadence.size}/${showcase.length}`);
if (missing.length) console.log(`showcase not found: ${missing.join(', ')}`);
if (offenders.length) { console.error(`em/en dash in: ${offenders.join(', ')}`); process.exit(1); }
console.log('10 panels written to assets/');
