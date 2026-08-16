#!/usr/bin/env node
// Fetches public, non-fork repositories from the GitHub GraphQL API in a single
// request and writes src/data/portfolio.json. Curation happens through GitHub
// topics: `hide-from-portfolio` excludes a repo, `featured` pins it to the top.
// Private repositories are always excluded from the dataset.
// Never called from the browser — this runs only in CI (GITHUB_TOKEN).

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT = resolve(process.cwd(), "src/data/portfolio.json");
const TOKEN = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN;
const LOGIN = process.env.GITHUB_LOGIN || "codewesleylima";
const DAY = 24 * 60 * 60 * 1000;

if (!TOKEN) {
  console.error("GH_SYNC_TOKEN or GITHUB_TOKEN is required.");
  process.exit(1);
}

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
      isFork: false
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
        repositoryTopics(first: 20) { nodes { topic { name } } }
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          totalSize
          edges { size node { name color } }
        }
      }
    }
  }
}`;

/** healthy < 90d, warning < 365d, alert otherwise or archived. */
function deriveStatus(pushedAt, isArchived) {
  if (isArchived) return "alert";
  const age = Date.now() - new Date(pushedAt).getTime();
  if (age <= 90 * DAY) return "healthy";
  if (age <= 365 * DAY) return "warning";
  return "alert";
}

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "codewesleylima-portfolio-sync",
  },
  body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
});

if (!response.ok) {
  console.error(`GitHub GraphQL request failed [${response.status}]: ${await response.text()}`);
  process.exit(1);
}

const payload = await response.json();
if (payload.errors?.length) {
  console.error(`GitHub GraphQL errors: ${JSON.stringify(payload.errors)}`);
  process.exit(1);
}

const viewer = payload.data.user;

if (!viewer) {
  console.error(`GitHub user "${LOGIN}" not found or not readable with this token.`);
  process.exit(1);
}

// The default GITHUB_TOKEN in Actions authenticates as github-actions[bot]; the
// query above targets a named user instead, so the dataset is never the bot's.
if (viewer.login !== LOGIN) {
  console.error(`Unexpected login "${viewer.login}" — expected "${LOGIN}".`);
  process.exit(1);
}

if (viewer.repositories.nodes.length === 0) {
  console.error(
    "GitHub returned zero repositories. If the account has public repos, the token lacks read access — create a fine-grained PAT and set it as GH_SYNC_TOKEN.",
  );
  process.exit(1);
}

const repos = viewer.repositories.nodes
  .map((repo) => {
    const topics = repo.repositoryTopics.nodes.map((n) => n.topic.name);
    const totalSize = repo.languages.totalSize || 1;
    return {
      name: repo.name,
      description: repo.description,
      url: repo.url,
      homepageUrl: repo.homepageUrl || null,
      primaryLanguage: repo.primaryLanguage
        ? { name: repo.primaryLanguage.name, color: repo.primaryLanguage.color }
        : null,
      languages: repo.languages.edges.map((edge) => ({
        name: edge.node.name,
        percent: Math.round((edge.size / totalSize) * 1000) / 10,
      })),
      topics,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      pushedAt: repo.pushedAt,
      createdAt: repo.createdAt,
      isArchived: repo.isArchived,
      isFork: repo.isFork,
      isPrivate: repo.isPrivate,
      status: deriveStatus(repo.pushedAt, repo.isArchived),
    };
  })
  .filter((repo) => !repo.isPrivate && !repo.topics.includes("hide-from-portfolio"))
  .sort((a, b) => {
    const featured = Number(b.topics.includes("featured")) - Number(a.topics.includes("featured"));
    if (featured !== 0) return featured;
    return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
  });

const next = {
  generatedAt: new Date().toISOString(),
  profile: {
    login: viewer.login,
    name: viewer.name ?? viewer.login,
    bio: viewer.bio ?? "",
    avatarUrl: viewer.avatarUrl,
    followers: viewer.followers.totalCount,
    publicRepos: viewer.repositories.totalCount,
  },
  repos,
};

// Compare ignoring generatedAt so unchanged data does not create empty commits.
const fingerprint = (data) =>
  createHash("sha256")
    .update(JSON.stringify({ profile: data.profile, repos: data.repos }))
    .digest("hex");

let previous = null;
try {
  previous = JSON.parse(await readFile(OUTPUT, "utf8"));
} catch {
  previous = null;
}

if (previous && fingerprint(previous) === fingerprint(next)) {
  console.log("No portfolio changes — skipping write.");
  process.exit(0);
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Wrote ${repos.length} repositories to src/data/portfolio.json`);
