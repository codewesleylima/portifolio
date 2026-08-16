import { Link } from "@tanstack/react-router";
import resume from "@/data/resume.json";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(ym: string | null) {
  if (!ym) return "present";
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

const HEADLINES: Record<string, string> = {
  "2025-11": "World Cup 2026 offer channel and the observability backbone behind it.",
  "2023-11": "Legacy claims platform rebuilt as microservices across four channels.",
  "2023-02": "Insurance onboarding backend for the mobile channel of the Itaú app.",
};

export default function DeployLog() {
  const entries = resume.experience;

  return (
    <>
      <ol style={{ listStyle: "none", margin: "2.2rem 0 0", padding: 0 }}>
        {entries.map((entry, i) => (
          <li key={entry.start} className="log-entry">
            <span className="log-marker" aria-hidden="true">
              {String(entries.length - i).padStart(2, "0")}
            </span>
            <div className="meta-row">
              <span>
                <time dateTime={entry.start}>{label(entry.start)}</time> →{" "}
                {entry.end ? <time dateTime={entry.end}>{label(entry.end)}</time> : "present"}
              </span>
              <span className="t-healthy">{entry.company}</span>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.05rem",
                color: "#eaf6f2",
                margin: "0.5rem 0 0.4rem",
              }}
            >
              {entry.title}
            </h3>
            <p style={{ color: "#9fb1b3", fontSize: "0.78rem", lineHeight: 1.6, margin: 0 }}>
              {HEADLINES[entry.start] ?? entry.team}
            </p>
          </li>
        ))}
      </ol>
      <p style={{ marginTop: "1.6rem" }}>
        <Link className="btn" to="/resume">
          Full résumé
        </Link>
      </p>
    </>
  );
}
