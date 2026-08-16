import baked from "@/data/portfolio.json";

/**
 * Live repository read, used by /api/repos.
 *
 * The baked dataset only changes when the sync runs AND the site is redeployed, so a
 * repository flipped between public and private could show stale for hours. This asks
 * GitHub at request time instead.
 *
 * Two decisions worth knowing about:
 *
 * 1. REST, not GraphQL. GraphQL rejects unauthenticated calls outright, which made the
 *    whole feature depend on a Worker secret being set — and silently returned 503 when
 *    it was not. The REST list endpoint serves public repositories without a token, so
 *    this works on a fresh deploy. A token is still used when present, purely to lift
 *    the rate limit from 60/hour to 5000/hour.
 *
 * 2. The live call answers one question only: which repositories are public right now.
 *    Per-language breakdowns would cost one extra request per repository, so those are
 *    read from the baked dataset and merged in. Language percentages drift slowly;
 *    visibility does not.
 *
 * The Cache API is a no-op on workers.dev subdomains — the cache is zone-level and
 * workers.dev has no zone — so the module-scope memo below is what actually limits
 * upstream calls today. It lives as long as the isolate does. On a custom domain the
 * Cache API starts working and the memo becomes a second layer.
 */

const DAY = 24 * 60 * 60 * 1000;
const LOGIN = "codewesleylima";

export const LIVE_TTL_SECONDS = 300;

interface RestRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  fork: boolean;
  private: boolean;
  pushed_at: string;
  created_at: string;
  language: string | null;
  topics?: string[];
}

type BakedRepo = (typeof baked)["repos"][number];

const bakedByName = new Map(baked.repos.map((r) => [r.name, r as BakedRepo]));

function statusFor(pushedAt: string, archived: boolean, now: number) {
  if (archived) return "alert" as const;
  const age = now - new Date(pushedAt).getTime();
  if (age <= 90 * DAY) return "healthy" as const;
  if (age <= 365 * DAY) return "warning" as const;
  return "alert" as const;
}

let memo: { at: number; payload: unknown } | null = null;

export async function fetchLivePortfolio(token: string | undefined) {
  if (memo && Date.now() - memo.at < LIVE_TTL_SECONDS * 1000) return memo.payload;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "codewesleylima-portfolio-live",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(
    `https://api.github.com/users/${LOGIN}/repos?per_page=100&type=owner&sort=pushed`,
    { headers },
  );

  if (!response.ok) throw new Error(`GitHub responded ${response.status}`);

  const all = (await response.json()) as RestRepo[];
  if (!Array.isArray(all)) throw new Error("unexpected payload");

  const publicRepos = all.filter((r) => !r.private);

  // An empty list is indistinguishable from "every repository went private", and
  // blanking the registry is worse than showing data a few minutes old.
  if (publicRepos.length === 0) throw new Error("zero repositories");

  const now = Date.now();

  const payload = {
    generatedAt: new Date(now).toISOString(),
    profile: { ...baked.profile, publicRepos: publicRepos.length },
    repos: publicRepos.map((r) => {
      const prev = bakedByName.get(r.name);
      return {
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepageUrl: r.homepage,
        // The REST list gives a language name but no colour; the baked entry has both.
        primaryLanguage:
          prev?.primaryLanguage?.name === r.language
            ? prev.primaryLanguage
            : r.language
              ? { name: r.language, color: "#6b7a80" }
              : null,
        languages: prev?.languages ?? [],
        topics: r.topics ?? prev?.topics ?? [],
        stars: r.stargazers_count,
        forks: r.forks_count,
        pushedAt: r.pushed_at,
        createdAt: r.created_at,
        isArchived: r.archived,
        isFork: r.fork,
        isPrivate: false,
        status: statusFor(r.pushed_at, r.archived, now),
      };
    }),
  };

  memo = { at: now, payload };
  return payload;
}
