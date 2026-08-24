/**
 * Pulls the live numbers the panels render.
 *
 * Auth: GH_TOKEN / GITHUB_TOKEN if present, else the local `gh` CLI token.
 * A user-scoped PAT sees private contributions, which is what the public
 * profile counter shows. The default Actions token does not, so CI falls
 * back to public-only and flags it rather than silently shrinking the number.
 */
import { execFileSync } from 'node:child_process';

const LOGIN = 'ArnavGoel03';
const API = 'https://api.github.com/graphql';

export function authToken() {
  const env = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (env) return env;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('No GH_TOKEN, GITHUB_TOKEN or gh CLI login available.');
  }
}

async function gql(query, auth) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { authorization: `bearer ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const QUERY = `{
  user(login: "${LOGIN}") {
    name bio websiteUrl createdAt
    contributionsCollection {
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes {
        name nameWithOwner description url homepageUrl updatedAt
        primaryLanguage { name }
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
      }
    }
  }
}`;

export async function fetchData() {
  const data = await gql(QUERY, authToken());
  const u = data.user;
  const cal = u.contributionsCollection.contributionCalendar;

  const days = cal.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));

  // Aggregate bytes per language across public sources only, so the mix is
  // reproducible with either token.
  const bytes = new Map();
  for (const r of u.repositories.nodes) {
    for (const e of r.languages.edges) {
      bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, size]) => ({ name, size, pct: (size / total) * 100 }));

  return {
    name: u.name,
    bio: u.bio,
    site: u.websiteUrl,
    createdAt: u.createdAt,
    privateVisible: u.contributionsCollection.restrictedContributionsCount > 0,
    contributions: { total: cal.totalContributions, days },
    repoCount: u.repositories.totalCount,
    languages,
    repos: u.repositories.nodes,
  };
}
