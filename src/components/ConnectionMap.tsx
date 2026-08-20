import { useState } from "react";
import { STATUS_COLOR, STATUS_LABEL, sinceLabel, type Repo } from "@/lib/portfolio";

/**
 * Radial integration graph for one project.
 *
 * The hub is the repo that fronts the others — a BFF when the project has one,
 * otherwise the shared template/library. Everything else orbits it, so the picture
 * reads as "who calls whom" instead of a flat list of names.
 */
const HUB_PATTERNS = [/^bff-/i, /^base-/i, /library$/i, /infra/i];

function pickHub(members: Repo[]): Repo {
  for (const pattern of HUB_PATTERNS) {
    const hit = members.find((m) => pattern.test(m.name));
    if (hit) return hit;
  }
  return [...members].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))[0] as Repo;
}

const SIZE = 560;
const CENTER = SIZE / 2;
const RADIUS = 200;

export default function ConnectionMap({
  members,
  now,
  onSelect,
}: {
  members: Repo[];
  now: number;
  /** Clicking a node opens the repository detail modal instead of leaving the page. */
  onSelect?: (repo: Repo) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  if (members.length === 0) return null;

  const hub = pickHub(members);
  const spokes = members.filter((m) => m.name !== hub.name);

  const points = spokes.map((repo, i) => {
    const angle = (i / spokes.length) * Math.PI * 2 - Math.PI / 2;
    return { repo, x: CENTER + Math.cos(angle) * RADIUS, y: CENTER + Math.sin(angle) * RADIUS };
  });

  const focused = hover ?? hub.name;
  const detail = members.find((m) => m.name === focused) ?? hub;

  const open = (repo: Repo) => {
    if (onSelect) onSelect(repo);
    else window.open(repo.url, "_blank", "noopener,noreferrer");
  };

  const nodeHandlers = (repo: Repo) => ({
    tabIndex: 0,
    role: "button",
    "aria-label": `${repo.name} — open details`,
    onMouseEnter: () => setHover(repo.name),
    onMouseLeave: () => setHover(null),
    onFocus: () => setHover(repo.name),
    onBlur: () => setHover(null),
    onClick: () => open(repo),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(repo);
      }
    },
  });

  return (
    <div className="cmap">
      <div className="cmap-body">
        <svg
          className="cmap-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${hub.name} connected to ${spokes.map((s) => s.name).join(", ")}`}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            className="cmap-orbit"
            fill="none"
            strokeDasharray="3 7"
          />
          {points.map(({ repo, x, y }) => (
            <line
              key={`edge-${repo.name}`}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              className={`cmap-edge${focused === repo.name ? " is-lit" : ""}`}
            />
          ))}

          {points.map(({ repo, x, y }) => (
            <g
              key={repo.name}
              className={`cmap-node${focused === repo.name ? " is-lit" : ""}`}
              {...nodeHandlers(repo)}
            >
              <circle cx={x} cy={y} r={13} fill={STATUS_COLOR[repo.status]} opacity={0.18} />
              <circle cx={x} cy={y} r={6} fill={STATUS_COLOR[repo.status]} />
              <text
                x={x}
                y={y + (y < CENTER ? -20 : 26)}
                textAnchor="middle"
                className="cmap-label"
              >
                {repo.name}
              </text>
            </g>
          ))}

          <g
            className={`cmap-node cmap-hub${focused === hub.name ? " is-lit" : ""}`}
            {...nodeHandlers(hub)}
          >
            <circle cx={CENTER} cy={CENTER} r={34} className="cmap-hub-halo" />
            <circle cx={CENTER} cy={CENTER} r={11} fill={STATUS_COLOR[hub.status]} />
            <text x={CENTER} y={CENTER + 34} textAnchor="middle" className="cmap-label is-hub">
              {hub.name}
            </text>
          </g>
        </svg>

        <aside className="cmap-panel">
          <h3 className="cmap-panel-title">{detail.name}</h3>
          <p className="cmap-panel-meta">
            <span className="dot" style={{ background: STATUS_COLOR[detail.status] }} />
            {STATUS_LABEL[detail.status]} · {detail.primaryLanguage?.name ?? "n/a"} · last push{" "}
            {sinceLabel(detail.pushedAt, now)}
          </p>
          <p className="cmap-panel-desc">
            {detail.description ?? "No description published on GitHub."}
          </p>
          <p className="cmap-panel-meta">
            {detail.name === hub.name
              ? `Fronts ${spokes.length} service${spokes.length === 1 ? "" : "s"} in this project.`
              : `Composed by ${hub.name}.`}
          </p>
          <a
            className="btn btn-primary"
            href={detail.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open repository ↗
          </a>
        </aside>
      </div>
    </div>
  );
}
