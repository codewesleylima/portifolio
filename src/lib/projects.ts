import manifest from "@/data/projects.json";
import type { Repo, RepoStatus } from "@/lib/portfolio";

interface ProjectDef {
  id: string;
  name: string;
  tagline: string;
  /** One entry per rendered line. Capped at 6 — the modal is a summary, not a README. */
  summary: string[];
  /** Repository names, in the order they should be listed. */
  repos: string[];
}

export interface Project extends ProjectDef {
  /** Only the repos that actually came back from the GitHub sync. */
  members: Repo[];
  /** Worst status among members: one alerting service makes the project alert. */
  status: RepoStatus;
  /** Most common primary language across members. */
  language: { name: string; color: string } | null;
  /** Newest push across members. */
  pushedAt: string;
  stars: number;
}

const SUMMARY_MAX_LINES = 6;
const SEVERITY: Record<RepoStatus, number> = { healthy: 0, warning: 1, alert: 2 };

/**
 * Joins the hand-written manifest to the synced repository data.
 *
 * The manifest is the source of truth for grouping and prose, because neither can be
 * inferred from repository names — only a human knows that stock and payments serve
 * the same storefront. Everything else (status, language, timestamps) is derived from
 * the sync, so a project's health follows its services without anyone editing JSON.
 */
export function resolveProjects(repos: Repo[]): {
  projects: Project[];
  ungrouped: Repo[];
} {
  const byName = new Map(repos.map((r) => [r.name, r]));
  const claimed = new Set<string>();

  const projects = (manifest as ProjectDef[])
    .map((def) => {
      const members = def.repos
        .map((name) => byName.get(name))
        .filter((r): r is Repo => Boolean(r));

      for (const m of members) claimed.add(m.name);

      const counts = new Map<string, { count: number; color: string }>();
      for (const m of members) {
        if (!m.primaryLanguage) continue;
        const cur = counts.get(m.primaryLanguage.name);
        counts.set(m.primaryLanguage.name, {
          count: (cur?.count ?? 0) + 1,
          color: m.primaryLanguage.color,
        });
      }
      const top = [...counts.entries()].sort((a, b) => b[1].count - a[1].count)[0];

      return {
        ...def,
        summary: def.summary.slice(0, SUMMARY_MAX_LINES),
        members,
        status: members.reduce<RepoStatus>(
          (worst, m) => (SEVERITY[m.status] > SEVERITY[worst] ? m.status : worst),
          "healthy",
        ),
        language: top ? { name: top[0], color: top[1].color } : null,
        pushedAt: members.reduce(
          (latest, m) => (m.pushedAt > latest ? m.pushedAt : latest),
          members[0]?.pushedAt ?? new Date(0).toISOString(),
        ),
        stars: members.reduce((sum, m) => sum + m.stars, 0),
      };
    })
    // A project whose repos were all renamed, archived or made private should vanish
    // rather than render as an empty block.
    .filter((p) => p.members.length > 0);

  return {
    projects,
    ungrouped: repos.filter((r) => !claimed.has(r.name)),
  };
}
