/**
 * Commit rhythm and per-repo cadence, from GitHub's precomputed stats endpoints.
 *
 * Both endpoints answer 202 with an empty body while GitHub builds the stats,
 * so every call retries. These feed decorative elements, so a repo whose stats
 * never warm up is omitted rather than allowed to fail the build.
 */
const REST = 'https://api.github.com';

/** punch_card is all-time, so long-idle repos are dropped from the clock to
 *  keep years-old coursework hours out of the current rhythm. */
const ACTIVE_MONTHS = 18;

async function stat(path, auth, tries = 7) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${REST}${path}`, {
      headers: { authorization: `bearer ${auth}`, accept: 'application/vnd.github+json' },
    });
    if (res.status === 200) {
      const body = await res.json();
      if (Array.isArray(body) && body.length) return body;
    } else if (res.status !== 202) {
      return null;
    }
    // 202 means "computing, ask again". The busiest repos take the longest, so
    // the budget has to clear roughly a minute or the flagship repo is the one
    // that reliably misses its sparkline.
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}

/**
 * Hour-of-day and day-of-week histograms, shifted out of UTC.
 *
 * punch_card buckets by UTC hour. The target offset is +5:30, so each UTC hour
 * straddles two local hours and its commits are split proportionally between
 * them. That smooths the curve by half an hour, which is invisible at this
 * radius and far more honest than drawing a UTC clock for someone who does not
 * live in UTC. No local offset survives in the data to do better: GitHub
 * returns every commit timestamp as Z, even on the raw REST commit objects.
 */
export async function fetchRhythm(repos, auth, offsetMinutes) {
  const cutoff = Date.now() - ACTIVE_MONTHS * 30 * 24 * 3600 * 1000;
  const active = repos.filter((r) => new Date(r.updatedAt).getTime() > cutoff);

  const hours = new Array(24).fill(0);
  const dow = new Array(7).fill(0);
  let total = 0;
  let counted = 0;

  const cards = await Promise.all(
    active.map((r) => stat(`/repos/${r.nameWithOwner}/stats/punch_card`, auth))
  );

  for (const card of cards) {
    if (!card) continue;
    counted++;
    for (const [day, hour, commits] of card) {
      if (!commits) continue;
      total += commits;
      const shifted = hour * 60 + offsetMinutes;
      const lo = Math.floor(shifted / 60);
      const frac = (shifted % 60) / 60;
      hours[((lo % 24) + 24) % 24] += commits * (1 - frac);
      hours[(((lo + 1) % 24) + 24) % 24] += commits * frac;
      dow[(((day + Math.floor(shifted / 1440)) % 7) + 7) % 7] += commits;
    }
  }

  return { hours, dow, total, repos: counted, skipped: active.length - counted };
}

const WEEKS = 52;
const WEEK_MS = 7 * 24 * 3600 * 1000;

/**
 * Weekly commit totals straight from the commit log.
 *
 * The stats endpoint stays 202 indefinitely on some repos: the busiest ones
 * keep invalidating GitHub's cached computation, so the flagship repo is
 * exactly the one that never resolves. A grid where seven cards carry a
 * sparkline and the eighth does not reads as a bug, so this derives the same
 * buckets directly. Capped at ten pages, which is far more than a year of
 * commits on any of these repos.
 */
async function cadenceFromLog(full, auth) {
  const [owner, name] = full.split('/');
  const since = new Date(Date.now() - WEEKS * WEEK_MS).toISOString();
  const buckets = new Array(WEEKS).fill(0);
  let cursor = null;
  let seen = false;

  for (let page = 0; page < 10; page++) {
    const q = `{ repository(owner: "${owner}", name: "${name}") {
      defaultBranchRef { target { ... on Commit {
        history(first: 100, since: "${since}"${cursor ? `, after: "${cursor}"` : ''}) {
          pageInfo { hasNextPage endCursor }
          nodes { committedDate }
        }
      }}}
    }}`;
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `bearer ${auth}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const hist = json.data?.repository?.defaultBranchRef?.target?.history;
    if (!hist) return null;

    for (const c of hist.nodes) {
      const age = Date.now() - new Date(c.committedDate).getTime();
      const idx = WEEKS - 1 - Math.floor(age / WEEK_MS);
      if (idx >= 0 && idx < WEEKS) { buckets[idx]++; seen = true; }
    }
    if (!hist.pageInfo.hasNextPage) break;
    cursor = hist.pageInfo.endCursor;
  }
  return seen ? buckets : null;
}

/** 52 weekly commit totals per repo, for the card sparklines. */
export async function fetchCadence(names, auth) {
  const out = new Map();
  await Promise.all(
    names.map(async (full) => {
      const weeks = await stat(`/repos/${full}/stats/commit_activity`, auth, 3);
      if (weeks) { out.set(full, weeks.map((w) => w.total)); return; }
      const derived = await cadenceFromLog(full, auth);
      if (derived) out.set(full, derived);
    })
  );
  return out;
}
