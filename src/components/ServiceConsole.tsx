import { useEffect, useMemo, useRef, useState } from "react";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  sinceLabel,
  utcStamp,
  type Repo,
  type RepoStatus,
} from "@/lib/portfolio";
import { resolveProjects, type Project } from "@/lib/projects";

type SortKey = "pushed" | "stars" | "name";
type GroupKey = "project" | "topic" | "language" | "repo";

const HIDDEN_TOPICS = new Set(["featured", "hide-from-portfolio"]);

const visibleTopics = (repo: Repo) => repo.topics.filter((t) => !HIDDEN_TOPICS.has(t));

export default function ServiceConsole({ repos, now }: { repos: Repo[]; now: number }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("pushed");
  const [groupBy, setGroupBy] = useState<GroupKey>("project");
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState<Repo | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const languages = useMemo(
    () =>
      [...new Set(repos.map((r) => r.primaryLanguage?.name).filter(Boolean) as string[])].sort(),
    [repos],
  );
  const topics = useMemo(
    () => [...new Set(repos.flatMap(visibleTopics))].sort().slice(0, 12),
    [repos],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = repos.filter((r) => {
      if (language && r.primaryLanguage?.name !== language) return false;
      if (topic && !r.topics.includes(topic)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        r.topics.some((t) => t.includes(q))
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort === "stars") return b.stars - a.stars;
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    });
  }, [repos, query, language, topic, sort]);

  /** Projects are resolved over the filtered set, so search and chips narrow them too. */
  const { projects, ungrouped } = useMemo(() => resolveProjects(visible), [visible]);

  const groups = useMemo(() => {
    if (groupBy === "project") return [["standalone", ungrouped] as [string, Repo[]]];
    if (groupBy === "repo") return [["all repositories", visible] as [string, Repo[]]];
    const map = new Map<string, Repo[]>();
    for (const r of visible) {
      const keys =
        groupBy === "language"
          ? [r.primaryLanguage?.name ?? "Other"]
          : visibleTopics(r).length
            ? visibleTopics(r)
            : ["untagged"];
      for (const key of keys) map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [visible, ungrouped, groupBy]);

  /** Repos that share at least one topic with the active one — treated as integrations. */
  const related = useMemo(() => {
    if (!active) return [];
    const tags = new Set(visibleTopics(active));
    return repos
      .filter((r) => r.name !== active.name && visibleTopics(r).some((t) => tags.has(t)))
      .map((r) => ({ repo: r, shared: visibleTopics(r).filter((t) => tags.has(t)) }))
      .sort((a, b) => b.shared.length - a.shared.length)
      .slice(0, 4);
  }, [active, repos]);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      // Reveal well before the grid enters the viewport: waiting for the tiles to be
      // 8% visible made the section look broken while scrolling down to it.
      { threshold: 0, rootMargin: "600px 0px 600px 0px" },
    );
    io.observe(node);
    // Safety net: if the observer never fires (odd scroll containers, restored
    // scroll position), show the tiles anyway instead of leaving an empty block.
    const fallback = window.setTimeout(() => setRevealed(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => {
    if (!activeProject) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveProject(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeProject]);

  const counts = repos.reduce<Record<RepoStatus, number>>(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { healthy: 0, warning: 0, alert: 0 },
  );

  return (
    <div>
      <div
        className="meta-row"
        style={{ marginTop: "1.5rem", gap: "1.25rem", alignItems: "center" }}
      >
        <span>
          <span className="dot s-healthy" style={{ marginRight: 6 }} />
          healthy {counts.healthy}
        </span>
        <span>
          <span className="dot s-warning" style={{ marginRight: 6 }} />
          degraded {counts.warning}
        </span>
        <span>
          <span className="dot s-alert" style={{ marginRight: 6 }} />
          alert {counts.alert}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.6rem",
          alignItems: "center",
          marginTop: "1.5rem",
        }}
      >
        <label className="sr-only" htmlFor="svc-search">
          Search services
        </label>
        <input
          id="svc-search"
          className="control"
          style={{ flex: "1 1 220px", minWidth: 0 }}
          placeholder="grep services…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="sr-only" htmlFor="svc-group">
          Group services
        </label>
        <select
          id="svc-group"
          className="control"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupKey)}
        >
          <option value="project">group: projects</option>
          <option value="topic">group: topics</option>
          <option value="language">group: languages</option>
          <option value="repo">group: repositories</option>
        </select>
        <label className="sr-only" htmlFor="svc-sort">
          Sort services
        </label>
        <select
          id="svc-sort"
          className="control"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="pushed">sort: last deploy</option>
          <option value="stars">sort: stars</option>
          <option value="name">sort: name</option>
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.9rem" }}>
        <button className="chip" aria-pressed={!language} onClick={() => setLanguage(null)}>
          all runtimes
        </button>
        {languages.map((l) => (
          <button
            key={l}
            className="chip"
            aria-pressed={language === l}
            onClick={() => setLanguage(language === l ? null : l)}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
        <button className="chip" aria-pressed={!topic} onClick={() => setTopic(null)}>
          all labels
        </button>
        {topics.map((t) => (
          <button
            key={t}
            className="chip"
            aria-pressed={topic === t}
            onClick={() => setTopic(topic === t ? null : t)}
          >
            {t}
          </button>
        ))}
      </div>

      {groupBy === "project" && projects.length > 0 && (
        <div className="grid-projects" style={{ marginTop: "1.6rem" }}>
          {projects.map((p, i) => (
            <button
              type="button"
              key={p.id}
              className={`tile project-tile${revealed ? " revealed" : ""}`}
              onClick={() => setActiveProject(p)}
              aria-haspopup="dialog"
              style={
                {
                  "--strip": STATUS_COLOR[p.status],
                  "--d": `${Math.min(i, 12) * 55}ms`,
                } as React.CSSProperties
              }
            >
              <div className="project-tile-head">
                <span className={`dot s-${p.status}`} aria-hidden="true" />
                <span
                  className={`t-${p.status}`}
                  style={{ fontSize: "0.62rem", letterSpacing: "0.2em" }}
                >
                  {STATUS_LABEL[p.status]}
                </span>
                <span className="tile-hint" style={{ marginLeft: "auto" }}>
                  open
                </span>
              </div>

              <div className="tile-name">{p.name}</div>
              <p className="tile-desc">{p.tagline}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {p.language && (
                  <span className="badge">
                    <span
                      className="dot"
                      style={{ background: p.language.color }}
                      aria-hidden="true"
                    />
                    {p.language.name}
                  </span>
                )}
                <span className="label-chip">
                  {p.members.length} {p.members.length === 1 ? "repo" : "repos"}
                </span>
              </div>

              <div
                className="meta-row"
                style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}
              >
                <span title={utcStamp(p.pushedAt)}>last deploy {sinceLabel(p.pushedAt, now)}</span>
                <span className="tile-hint">click to inspect</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div ref={gridRef} style={{ marginTop: "1.6rem" }}>
        {groups.map(([groupName, items]) => (
          <section key={groupName} style={{ marginBottom: "2.2rem" }}>
            <div
              className="meta-row"
              style={{
                alignItems: "center",
                gap: "0.6rem",
                borderBottom: "1px solid var(--line)",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <span
                className="dot"
                style={{
                  background:
                    groupBy === "language"
                      ? (items[0]?.primaryLanguage?.color ?? "var(--dim)")
                      : "var(--phosphor)",
                }}
                aria-hidden="true"
              />
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.8rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#eaf6f2",
                  margin: 0,
                }}
              >
                {groupBy === "topic" ? `#${groupName}` : groupName}
              </h3>
              <span style={{ marginLeft: "auto" }}>
                {items.length} {items.length === 1 ? "service" : "services"}
              </span>
            </div>

            <div className="grid-services">
              {items.map((repo, i) => (
                <button
                  type="button"
                  key={`${groupName}-${repo.name}`}
                  className={`tile${revealed ? " revealed" : ""}`}
                  onClick={() => setActive(repo)}
                  aria-haspopup="dialog"
                  style={
                    {
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      "--strip": STATUS_COLOR[repo.status],
                      "--d": `${Math.min(i, 12) * 55}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <span className={`dot s-${repo.status}`} aria-hidden="true" />
                      <span
                        className={`t-${repo.status}`}
                        style={{ fontSize: "0.62rem", letterSpacing: "0.2em" }}
                      >
                        {STATUS_LABEL[repo.status]}
                        {repo.isArchived ? " · ARCHIVED" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.62rem", color: "var(--dim)" }}>
                        ★ {repo.stars}
                      </span>
                      <span className="tile-hint" aria-hidden="true">
                        open
                      </span>
                    </div>
                  </div>

                  <div className="tile-name">{repo.name}</div>
                  <p className="tile-desc">{repo.description ?? "No description provided."}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {repo.primaryLanguage && (
                      <span className="badge">
                        <span
                          className="dot"
                          style={{ background: repo.primaryLanguage.color }}
                          aria-hidden="true"
                        />
                        {repo.primaryLanguage.name}
                      </span>
                    )}
                    {visibleTopics(repo)
                      .slice(0, 3)
                      .map((t) => (
                        <span key={t} className="label-chip">
                          #{t}
                        </span>
                      ))}
                  </div>

                  <div
                    className="meta-row"
                    style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}
                  >
                    <span title={utcStamp(repo.pushedAt)}>
                      last deploy {sinceLabel(repo.pushedAt, now)}
                    </span>
                    <span>forks {repo.forks}</span>
                    <span className="tile-hint">click to inspect</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="section-note" style={{ marginTop: "1.5rem" }}>
          No services match this query. Clear the filters to restore the full registry.
        </p>
      )}

      {activeProject && (
        <div className="svc-overlay" onClick={() => setActiveProject(null)}>
          <div
            className="svc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeProject.name} details`}
            onClick={(e) => e.stopPropagation()}
            style={{ "--strip": STATUS_COLOR[activeProject.status] } as React.CSSProperties}
          >
            <button className="svc-close" onClick={() => setActiveProject(null)} aria-label="Close">
              ✕
            </button>

            <p className="eyebrow" style={{ color: STATUS_COLOR[activeProject.status] }}>
              project · {STATUS_LABEL[activeProject.status]}
            </p>
            <h3 className="svc-modal-title">{activeProject.name}</h3>

            <div className="project-summary">
              {activeProject.summary.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            <div className="meta-row" style={{ marginTop: "0.9rem" }}>
              {activeProject.language && <span>{activeProject.language.name}</span>}
              <span>
                {activeProject.members.length}{" "}
                {activeProject.members.length === 1 ? "repository" : "repositories"}
              </span>
              <span>last deploy {sinceLabel(activeProject.pushedAt, now)}</span>
            </div>

            <div style={{ marginTop: "1.2rem" }}>
              <p className="eyebrow">repositories in this project</p>
              <ul className="svc-related">
                {activeProject.members.map((repo) => (
                  <li key={repo.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProject(null);
                        setActive(repo);
                      }}
                    >
                      <span className={`dot s-${repo.status}`} aria-hidden="true" />
                      <span className="svc-related-name">{repo.name}</span>
                      <span className="svc-related-tags">{repo.primaryLanguage?.name ?? "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {active && (
        <div className="svc-overlay" onClick={() => setActive(null)}>
          <div
            className="svc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${active.name} details`}
            onClick={(e) => e.stopPropagation()}
            style={{ "--strip": STATUS_COLOR[active.status] } as React.CSSProperties}
          >
            <button className="svc-close" onClick={() => setActive(null)} aria-label="Close">
              ✕
            </button>

            <p className="eyebrow" style={{ color: STATUS_COLOR[active.status] }}>
              {STATUS_LABEL[active.status]}
              {active.isArchived ? " · ARCHIVED" : ""}
            </p>
            <h3 className="svc-modal-title">{active.name}</h3>
            <p className="tile-desc" style={{ marginTop: "0.6rem" }}>
              {active.description ?? "No description provided."}
            </p>

            <div className="meta-row" style={{ marginTop: "0.9rem" }}>
              <span>★ {active.stars}</span>
              <span>forks {active.forks}</span>
              <span>last deploy {sinceLabel(active.pushedAt, now)}</span>
              <span>created {utcStamp(active.createdAt)}</span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.9rem" }}>
              {active.languages.map((l) => (
                <span key={l.name} className="badge">
                  {l.name} {l.percent}%
                </span>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
              {visibleTopics(active).map((t) => (
                <span key={t} className="label-chip">
                  #{t}
                </span>
              ))}
            </div>

            <div style={{ marginTop: "1.2rem" }}>
              <p className="eyebrow">integrations</p>
              {related.length === 0 ? (
                <p className="tile-desc" style={{ marginTop: "0.5rem" }}>
                  Standalone service — no shared contracts with other repositories.
                </p>
              ) : (
                <ul className="svc-related">
                  {related.map(({ repo, shared }) => (
                    <li key={repo.name}>
                      <button type="button" onClick={() => setActive(repo)}>
                        <span className={`dot s-${repo.status}`} aria-hidden="true" />
                        <span className="svc-related-name">{repo.name}</span>
                        <span className="svc-related-tags">
                          {shared.map((t) => `#${t}`).join(" ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.4rem" }}>
              <a
                className="btn btn-primary"
                href={active.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Abrir repositório ↗
              </a>
              {active.homepageUrl && (
                <a
                  className="btn"
                  href={active.homepageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Live endpoint ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
