/**
 * Live repository read, used by /api/repos.
 *
 * The baked src/data/portfolio.json only changes when the daily sync runs AND the
 * site is redeployed, so flipping a repository between public and private could take
 * up to a day to show. This path asks GitHub at request time instead, behind a short
 * edge cache, so visibility changes surface within the TTL without a deploy.
 *
 * The GraphQL query filters on privacy: PUBLIC, which is what makes the feature work
 * in both directions: a repo made private drops out of the response, and one made
 * public appears in it.
 *
 * The transform must stay in step with scripts/sync-github.mjs — same shape, same
 * status thresholds — because the client swaps one dataset for the other in place.
 */

const DAY = 24 * 60 * 60 * 1000;
const LOGIN = "codewesleylima";

/** Seconds the edge holds a response. Also the worst-case lag for a visibility flip. */
export const LIVE_TTL_SECONDS = 300;

const QUERY = `
query($login: String!) {
  user(login: $login) {
    login
    name
    bio
    avatarUrl
    followers { totalCount }
    repositories(
      first: 100
      privacy: PUBLIC
      ownerAffiliations: OWNER
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        name
        description
        url
        homepageUrl
        stargazerCount
        forkCount
        isArchived
        isFork
        isPrivate
        pushedAt
        createdAt
        primaryLanguage { name color }
        repositoryTopics(first: 12) { nodes { topic { name } } }
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          totalSize
          edges { size node { name color } }
        }
      }
    }
  }
}`;

interface GraphQLRepo {
  name: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  pushedAt: string;
  createdAt: string;
  primaryLanguage: { name: string; color: string } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  languages: { totalSize: number; edges: { size: number; node: { name: string } }[] };
}

function statusFor(repo: GraphQLRepo, now: number): "healthy" | "warning" | "alert" {
  if (repo.isArchived) return "alert";
  const age = now - new Date(repo.pushedAt).getTime();
  if (age <= 90 * DAY) return "healthy";
  if (age <= 365 * DAY) return "warning";
  return "alert";
}

export async function fetchLivePortfolio(token: string | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "codewesleylima-portfolio-live",
  };
  // Unauthenticated GraphQL is rejected outright, so without a token there is
  // nothing to try — the caller falls back to the baked dataset.
  if (!token) throw new Error("no token");
  headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });

  if (!response.ok) throw new Error(`GitHub responded ${response.status}`);

  const payload = (await response.json()) as {
    errors?: unknown[];
    data?: { user?: Record<string, never> };
  };
  if (payload.errors?.length) throw new Error("GraphQL error");

  const user = payload.data?.user as
    | {
        login: string;
        name: string | null;
        bio: string | null;
        avatarUrl: string;
        followers: { totalCount: number };
        repositories: { totalCount: number; nodes: GraphQLRepo[] };
      }
    | undefined;

  if (!user) throw new Error("user not found");

  // Refusing an empty result is deliberate: an empty list is indistinguishable from
  // "every repo went private", and silently blanking the registry is worse than
  // showing slightly stale data.
  if (user.repositories.nodes.length === 0) throw new Error("zero repositories");

  const now = Date.now();

  return {
    generatedAt: new Date(now).toISOString(),
    profile: {
      login: user.login,
      name: user.name ?? user.login,
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl,
      followers: user.followers.totalCount,
      publicRepos: user.repositories.totalCount,
    },
    repos: user.repositories.nodes.map((r) => {
      const total = r.languages.totalSize || 1;
      return {
        name: r.name,
        description: r.description,
        url: r.url,
        homepageUrl: r.homepageUrl,
        primaryLanguage: r.primaryLanguage,
        languages: r.languages.edges.map((e) => ({
          name: e.node.name,
          percent: Math.round((e.size / total) * 1000) / 10,
        })),
        topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
        stars: r.stargazerCount,
        forks: r.forkCount,
        pushedAt: r.pushedAt,
        createdAt: r.createdAt,
        isArchived: r.isArchived,
        isFork: r.isFork,
        isPrivate: r.isPrivate,
        status: statusFor(r, now),
      };
    }),
  };
}
