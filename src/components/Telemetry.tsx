import { aggregateLanguages, type Repo } from "@/lib/portfolio";

/** Language distribution rendered in console vocabulary — utilization bars. */
export default function Telemetry({ repos }: { repos: Repo[] }) {
  const langs = aggregateLanguages(repos);

  return (
    <div className="console-frame" style={{ marginTop: "2rem" }}>
      <div className="console-bar">
        <span className="dot s-healthy" aria-hidden="true" />
        <span>runtime-utilization</span>
        <span style={{ marginLeft: "auto" }}>{repos.length} services sampled</span>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: "1.2rem 1rem",
          display: "grid",
          gap: "1rem",
        }}
      >
        {langs.map((lang) => (
          <li key={lang.name}>
            <div
              className="meta-row"
              style={{ justifyContent: "space-between", marginBottom: "0.4rem" }}
            >
              <span style={{ color: "#cfe0e2" }}>{lang.name}</span>
              <span>{lang.percent}%</span>
            </div>
            <div
              className="bar-track"
              role="img"
              aria-label={`${lang.name}: ${lang.percent} percent of committed code`}
            >
              <span
                className="bar-fill"
                style={{ "--w": `${lang.percent}%` } as React.CSSProperties}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
