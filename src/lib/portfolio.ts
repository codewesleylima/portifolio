import data from "@/data/portfolio.json";

export type RepoStatus = "healthy" | "warning" | "alert";

export interface Repo {
  name: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  primaryLanguage: { name: string; color: string } | null;
  languages: { name: string; percent: number }[];
  topics: string[];
  stars: number;
  forks: number;
  pushedAt: string;
  createdAt: string;
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  status: RepoStatus;
}

export interface Portfolio {
  generatedAt: string;
  profile: {
    login: string;
    name: string;
    bio: string;
    avatarUrl: string;
    followers: number;
    publicRepos: number;
  };
  repos: Repo[];
}

export const portfolio = data as Portfolio;

export const STATUS_LABEL: Record<RepoStatus, string> = {
  healthy: "HEALTHY",
  warning: "DEGRADED",
  alert: "ALERT",
};

export const STATUS_COLOR: Record<RepoStatus, string> = {
  healthy: "var(--phosphor)",
  warning: "var(--amber)",
  alert: "var(--alert)",
};

/** Relative "last deploy" stamp, e.g. 12d ago — stable across renders. */
export function sinceLabel(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

/** Language share aggregated across every repo, weighted evenly per repo. */
export function aggregateLanguages(repos: Repo[]) {
  const totals = new Map<string, number>();
  for (const repo of repos) {
    for (const lang of repo.languages) {
      totals.set(lang.name, (totals.get(lang.name) ?? 0) + lang.percent);
    }
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([name, value]) => ({ name, percent: Math.round((value / sum) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8);
}
