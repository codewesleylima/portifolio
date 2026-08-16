import { createFileRoute, Link } from "@tanstack/react-router";
import resume from "@/data/resume.json";

const TITLE = "Résumé — Wesley Lima, Software Engineer II";
const DESCRIPTION =
  "Full résumé of Wesley Lima: Software Engineer II at Itaú Unibanco. Backend Java, Spring Boot, AWS, microservices, observability and FinOps.";

export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: "/resume" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/resume" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          dateModified: resume.updated,
          mainEntity: {
            "@type": "Person",
            name: resume.name,
            jobTitle: resume.title,
            description: resume.summary,
            email: `mailto:${resume.links.email}`,
            address: { "@type": "PostalAddress", addressLocality: resume.location },
            sameAs: [resume.links.linkedin, resume.links.github],
            knowsLanguage: resume.languages.map((l) => l.name),
            worksFor: { "@type": "Organization", name: resume.experience[0]?.company ?? "" },
            hasCredential: resume.certifications,
            alumniOf: resume.education.map((e) => ({
              "@type": "EducationalOrganization",
              name: e.school,
            })),
          },
        }),
      },
    ],
  }),
  component: ResumePage,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(ym: string | null) {
  if (!ym) return "present";
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function BackToConsole() {
  return (
    <Link className="btn no-print" to="/">
      Back to console
    </Link>
  );
}

function ResumePage() {
  const total = resume.experience.length;

  return (
    <main className="crt resume-page">
      <div className="resume-bar no-print">
        <div className="shell resume-bar-inner">
          <p className="eyebrow">
            Résumé <span className="resume-sep">//</span> last updated {resume.updated}
          </p>
        </div>
      </div>

      <div className="shell resume-shell">
        <header className="resume-head">
          <h1 className="resume-title">{resume.name}</h1>
          <p className="eyebrow resume-subtitle">
            {resume.title} · {resume.location}
          </p>
          <p className="resume-links">
            <a href={resume.links.linkedin} rel="noreferrer noopener" target="_blank">
              linkedin.com/in/wesslima
            </a>
            <span aria-hidden="true"> · </span>
            <a href={resume.links.github} rel="noreferrer noopener" target="_blank">
              github.com/codewesleylima
            </a>
            <span aria-hidden="true"> · </span>
            <a href={`mailto:${resume.links.email}`}>{resume.links.email}</a>
          </p>
        </header>

        {/* MANIFEST */}
        <section className="resume-section" aria-labelledby="manifest-h">
          <h2 className="resume-h2" id="manifest-h">
            Manifest
          </h2>
          <div className="term-block">
            <span className="term-prompt" aria-hidden="true">
              $
            </span>
            <p className="term-text">{resume.summary}</p>
          </div>
        </section>

        {/* DEPLOY LOG */}
        <section className="resume-section" aria-labelledby="experience-h">
          <h2 className="resume-h2" id="experience-h">
            Deploy log
          </h2>
          <ol className="resume-log">
            {resume.experience.map((role, i) => (
              <li key={`${role.title}-${role.start}`}>
                <article className="resume-role">
                  <div className="resume-rail">
                    <span className="resume-index" aria-hidden="true">
                      {String(total - i).padStart(2, "0")}
                    </span>
                    <p className="resume-dates">
                      <time dateTime={role.start}>{label(role.start)}</time>
                      {" → "}
                      {role.end ? (
                        <time dateTime={role.end}>{label(role.end)}</time>
                      ) : (
                        <span>present</span>
                      )}
                    </p>
                  </div>
                  <div className="resume-role-body">
                    <h3 className="resume-h3">
                      <span
                        className={`dot ${role.current ? "s-healthy" : "s-idle"}`}
                        aria-hidden="true"
                      />
                      {role.title}
                      <span className="resume-company"> · {role.company}</span>
                    </h3>
                    <p className="resume-team">{role.team}</p>
                    <ul className="resume-bullets">
                      {role.bullets.map((b) => (
                        <li key={b}>
                          <span className="resume-marker" aria-hidden="true">
                            ›
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </section>

        {/* STACK */}
        <section className="resume-section" aria-labelledby="stack-h">
          <h2 className="resume-h2" id="stack-h">
            Stack
          </h2>
          <dl className="resume-stack">
            {Object.entries(resume.skills).map(([group, items]) => (
              <div className="resume-stack-row" key={group}>
                <dt className="eyebrow">{group}</dt>
                <dd>
                  <ul className="resume-chips">
                    {items.map((item) => (
                      <li className="resume-chip" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* EDUCATION / CERTS / LANGUAGES */}
        <section className="resume-section" aria-labelledby="credentials-h">
          <h2 className="resume-h2" id="credentials-h">
            Credentials
          </h2>
          <div className="resume-grid-3">
            <div>
              <h3 className="resume-h3 quiet">Education</h3>
              <ul className="resume-plain">
                {resume.education.map((e) => (
                  <li key={e.degree}>
                    <span className="resume-strong">{e.degree}</span>
                    <span className="resume-meta">
                      {e.school} · {e.period}
                    </span>
                    {"note" in e && e.note ? <span className="resume-meta">{e.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="resume-h3 quiet">Certifications</h3>
              <ul className="resume-plain">
                {resume.certifications.map((c) => (
                  <li key={c}>
                    <span className="resume-strong">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="resume-h3 quiet">Languages</h3>
              <ul className="resume-plain">
                {resume.languages.map((l) => (
                  <li key={l.name}>
                    <span className="resume-strong">{l.name}</span>
                    <span className="resume-meta">{l.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="resume-footer-cta no-print"></div>
      </div>
    </main>
  );
}
