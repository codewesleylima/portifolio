import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AboutMe from "@/components/AboutMe";
import Arcade from "@/components/Arcade";
import Mascot from "@/components/Mascot";
import DeployLog from "@/components/DeployLog";
import ServiceConsole from "@/components/ServiceConsole";
import Telemetry from "@/components/Telemetry";
import { portfolio, utcStamp, type Portfolio } from "@/lib/portfolio";
import { useLocale } from "@/lib/i18n";

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
  // SSR paints the baked dataset immediately, so there is no empty state and no
  // layout shift. After hydration we ask the Worker for a live read: making a repo
  // private or public shows up here without waiting for the daily sync or a deploy.
  // Any failure leaves the baked data exactly as it was.
  const { t } = useLocale();
  const [data, setData] = useState<Portfolio>(portfolio);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/repos")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((live: Portfolio) => {
        if (cancelled || !live.repos?.length) return;
        setData(live);
        setIsLive(true);
      })
      .catch(() => {
        /* keep the baked dataset */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { profile, repos: rawRepos, generatedAt } = data;
  const publicRepos = rawRepos.filter((r) => !r.isPrivate);
  const [now] = useState(() => Date.now());

  return (
    <main className="crt">
      {/* BOOT / HERO */}
      <header className="shell hero-shell" style={{ paddingBlock: "clamp(3rem,7vw,5.5rem)" }}>
        <p className="eyebrow" style={{ textAlign: "center" }}>
          {profile.login} // engineering console
        </p>

        {/* Centred identity block: mascot flanks the name, everything else
            stacks under it. The About panel gets the full width below. */}
        <div className="hero-identity">
          <div className="hero-namerow">
            <h1 className="hero-name">
              WESLEY
              <br />
              LIMA
            </h1>
            <Mascot />
          </div>

          <p className="eyebrow" style={{ color: "var(--phosphor)" }}>
            {t("hero.role")}
          </p>

          <p className="hero-thesis">{t("hero.thesis")}</p>

          <div className="hero-actions">
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

        <AboutMe />
      </header>

      {/* SERVICES */}
      {/* ARCADE */}
      <section className="section" id="arcade">
        <div className="shell">
          <p className="eyebrow">00 // arcade</p>
          <h2 className="section-title">{t("section.arcade")}</h2>
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
          <h2 className="section-title">{t("section.history")}</h2>
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
            {isLive ? "live" : "last sync"} {utcStamp(generatedAt)}
          </span>
          <span>
            {publicRepos.length} public repos · {profile.followers} followers
          </span>
          <span>© {new Date(generatedAt).getUTCFullYear()} Wesley Lima</span>
          <a
            href="https://github.com/codewesleylima/portifolio/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("footer.license")}
          </a>
        </div>
      </footer>
    </main>
  );
}
