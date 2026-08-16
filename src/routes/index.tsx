import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import AboutMe from "@/components/AboutMe";
import Arcade from "@/components/Arcade";
import Mascot from "@/components/Mascot";
import DeployLog from "@/components/DeployLog";
import ServiceConsole from "@/components/ServiceConsole";
import Telemetry from "@/components/Telemetry";
import { portfolio, utcStamp } from "@/lib/portfolio";

const TITLE = "Wesley Lima — Backend Engineer Console";
const DESCRIPTION =
  "Service health console of a Java 21 / Spring Boot / AWS backend engineer shipping insurance and payments systems at scale.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LINKS = {
  github: "https://github.com/codewesleylima",
  linkedin: "https://www.linkedin.com/in/wesslima/",
  email: "mailto:hello@codewesleylima.dev",
};

function Index() {
  const { profile, repos: rawRepos, generatedAt } = portfolio;
  const publicRepos = rawRepos.filter((r) => !r.isPrivate);
  const [now] = useState(() => Date.now());
  const [booted, setBooted] = useState(false);
  const onBooted = useCallback(() => setBooted(true), []);

  return (
    <main className="crt">
      {/* BOOT / HERO */}
      <header className="shell hero-shell" style={{ paddingBlock: "clamp(3rem,7vw,5.5rem)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <p className="eyebrow">{profile.login} // engineering console</p>
        </div>

        <h1 className="hero-name" style={{ marginTop: "1.2rem" }}>
          WESLEY
          <br />
          LIMA
        </h1>

        <p className="eyebrow" style={{ marginTop: "1rem", color: "var(--phosphor)" }}>
          Backend Software Engineer II · Itaú Unibanco · São Paulo
        </p>

        <div
          style={{
            display: "grid",
            gap: "1.6rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            marginTop: "1.8rem",
            alignItems: "start",
          }}
        >
          <div>
            <p className="hero-thesis">
              I keep money-moving systems boringly reliable: event-driven Java services, hard
              latency budgets, and observability that catches incidents before customers do.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.5rem" }}>
              <Link className="btn btn-primary" to="/resume">
                Résumé
              </Link>
              <a className="btn" href={LINKS.github} target="_blank" rel="noreferrer noopener">
                GitHub
              </a>
              <a className="btn" href={LINKS.linkedin} target="_blank" rel="noreferrer noopener">
                LinkedIn
              </a>
              <a className="btn" href={LINKS.email}>
                Email
              </a>
            </div>
          </div>
          <AboutMe onBooted={onBooted} />
        </div>

        <Mascot booted={booted} />
      </header>

      {/* SERVICES */}
      {/* ARCADE */}
      <section className="section" id="arcade">
        <div className="shell">
          <p className="eyebrow">00 // arcade</p>
          <h2 className="section-title">Debug run</h2>
          <p className="section-note">
            A break from the dashboards: hop over incidents and keep the service up. Space, arrow up
            or tap to jump.
          </p>
          <div style={{ marginTop: "1.8rem" }}>
            <Arcade />
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="shell">
          <p className="eyebrow">01 // registry</p>
          <h2 className="section-title">Services</h2>
          <p className="section-note">
            Every repository is a service tile. Status is derived at build time from the last push:
            healthy under 90 days, degraded under a year, alert beyond that or archived.
          </p>
          <ServiceConsole repos={publicRepos} now={now} />
        </div>
      </section>

      {/* TELEMETRY */}
      <section className="section" id="telemetry">
        <div className="shell">
          <p className="eyebrow">02 // telemetry</p>
          <h2 className="section-title">Stack utilization</h2>
          <p className="section-note">
            Language distribution aggregated across the registry, sampled from committed source size
            per repository.
          </p>
          <Telemetry repos={publicRepos} />
        </div>
      </section>

      {/* DEPLOY LOG */}
      <section className="section" id="deploy-log">
        <div className="shell">
          <p className="eyebrow">03 // history</p>
          <h2 className="section-title">Deploy log</h2>
          <p className="section-note">Career history, newest release first.</p>
          <DeployLog />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="section" style={{ paddingBlock: "2.5rem" }}>
        <div
          className="shell meta-row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <span>
            <span className="dot s-healthy" style={{ marginRight: 8 }} />
            last sync {utcStamp(generatedAt)}
          </span>
          <span>
            {publicRepos.length} public repos · {profile.followers} followers
          </span>
          <span>© {new Date(generatedAt).getUTCFullYear()} Wesley Lima</span>
        </div>
      </footer>
    </main>
  );
}
