# Profile README, state

Last updated 2026-08-24.

## What this repo is

`ArnavGoel03/ArnavGoel03` renders the profile at github.com/ArnavGoel03. The
README is hand-written prose plus four generated SVG panels, each shipped in a
dark and a light variant and selected by `<picture>` on `prefers-color-scheme`.

## File map

| Path | Role |
| --- | --- |
| `README.md` | The profile itself. Prose is hand-written, panels are `<picture>` blocks. |
| `scripts/tokens.mjs` | Single source of truth for palette, type scale, geometry. Mirrors `~/dev/portfolio/src/app/globals.css`. |
| `scripts/copy.mjs` | Every visible string in the panels, each with its provenance. Also the showcase repo list and the dash sanitiser. |
| `scripts/data.mjs` | One GraphQL call for contributions, repos and language bytes. |
| `scripts/svg.mjs` | Text measuring, monospace word wrap, splines, panel chrome. |
| `scripts/panels.mjs` | The four panels. |
| `scripts/build.mjs` | Writes all eight SVGs, fails the build on an em or en dash. |
| `.github/workflows/telemetry.yml` | Daily redraw, commits only on change. |

Rebuild locally with `node scripts/build.mjs` (uses the `gh` CLI token).

## Two decisions worth not re-deriving

**No animation may reveal content.** An earlier version staggered the repo
cards and the language bar in from `opacity: 0`. Browsers do not run animations
inside an `<img>` that is off screen, so every panel below the fold rendered
permanently blank, and `prefers-reduced-motion` users would have seen the same.
`animation-fill-mode: backwards` does not fix it either: it holds the from-state
through the delay, so an animation that never starts stays hidden forever. Only
stroke-dash draw-ins, the sweep and the LED pulse survive, all zero-delay, all
resting visible. Anything added later must rest visible too.

**The waveform is a 7-day mean, not raw daily counts.** 366 samples across
1088px is noise. The ceiling is the 97th percentile of the smoothed series, so
one 252-contribution day cannot flatten the rest; that day is marked separately
with its true value.

## Open

- `PROFILE_TOKEN` is not set. Without a user PAT the scheduled run sees public
  contributions only, so the counter would fall from 3,918 to roughly 885 on the
  first scheduled redraw. Needs a fine-grained PAT with read-only user access,
  added as a repo secret named `PROFILE_TOKEN`. Until then the committed panels
  are correct but the daily job will regress the number.
- Panel copy is drawn from the GitHub profile fields and README. If the bio or
  site changes, update `scripts/copy.mjs` rather than editing an SVG.
