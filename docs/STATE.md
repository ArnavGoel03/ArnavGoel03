# Profile README, state

Last updated 2026-08-24.

## What this repo is

`ArnavGoel03/ArnavGoel03` renders the profile at github.com/ArnavGoel03. The
README is hand-written prose plus five generated SVG panels, each shipped in a
dark and a light variant and selected by `<picture>` on `prefers-color-scheme`.

## File map

| Path | Role |
| --- | --- |
| `README.md` | The profile itself. Prose is hand-written, panels are `<picture>` blocks. |
| `scripts/tokens.mjs` | Single source of truth for palette, type scale, geometry. Mirrors `~/dev/portfolio/src/app/globals.css`. |
| `scripts/copy.mjs` | Every visible string in the panels, each with its provenance. Also the showcase repo list and the dash sanitiser. |
| `scripts/data.mjs` | One GraphQL call for contributions, repos and language bytes. |
| `scripts/svg.mjs` | Text measuring, monospace word wrap, splines, panel chrome. |
| `scripts/activity.mjs` | Commit rhythm and per-repo cadence from GitHub's stats endpoints. |
| `scripts/panels.mjs` | The five panels. |
| `scripts/build.mjs` | Writes all ten SVGs, fails the build on an em or en dash. |
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

## The clock panel

Hour-of-day comes from `stats/punch_card`, which buckets by UTC hour. No local
offset survives anywhere in GitHub's data: every commit timestamp returns as Z,
including on the raw REST commit objects. So the dial shifts by
`TIMEZONE.offsetMinutes` and prints the label, splitting each UTC hour
proportionally across the two local hours it straddles. That smooths by half an
hour, which is invisible at this radius and much better than a UTC dial for
someone who does not live in UTC.

The count in the hub is public-repo commits only (punch_card is per-repo), so it
is far smaller than the contribution total on the telemetry panel. Those two
numbers measure different things on purpose.

Repos idle for over 18 months are excluded, otherwise years-old coursework
hours drag the current rhythm toward a schedule that is no longer real.

Both charts encode value as intensity, never hue. An earlier version rotated
four accents through the weekday bars and it read as an arbitrary rainbow.

## Open

Nothing blocking. The daily job is verified: the first scheduled-path run
committed `863ba5c` on its own.

## Contribution count and tokens, settled

The first draft of this file claimed a user PAT was required or the counter
would fall to public-only. That is wrong, and the Action disproved it on its
first run: with the default `github.token` it still rendered 3,919.

The reason is that "include private contributions on my profile" is enabled on
the account, which makes `contributionCalendar.totalContributions` public to
any authenticated token. The workflow keeps a `secrets.PROFILE_TOKEN` fallback
anyway, so that turning that setting off later degrades to public-only instead
of silently rendering a wrong number. No secret needs creating today.
