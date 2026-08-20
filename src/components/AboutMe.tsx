import BootSequence from "@/components/BootSequence";
import { Link } from "@tanstack/react-router";

interface Props {
  onBooted?: (() => void) | undefined;
}

const FACTS: Array<[string, string]> = [
  ["role", "Software Engineer II @ Itaú Unibanco"],
  ["base", "São Paulo, Brazil"],
  ["runtime", "Java · Spring Boot · AWS · Kafka"],
  ["focus", "event-driven microservices · observability · FinOps"],
];

/** Hero side panel: portrait + short human intro + the live boot log. */
export default function AboutMe({ onBooted }: Props) {
  return (
    <div className="about-panel">
      <div className="console-frame">
        <div className="console-bar">
          <span className="dot s-healthy" aria-hidden="true" />
          <span>about.me</span>
          <span style={{ marginLeft: "auto" }}>OPERATOR</span>
        </div>

        <div className="about-body">
          <figure className="about-photo">
            <img
              src="/wesley.webp"
              alt="Portrait of Wesley Lima, backend software engineer"
              loading="lazy"
              decoding="async"
              width={320}
              height={320}
            />
            <figcaption>WESLEY LIMA</figcaption>
          </figure>

          <div className="about-text">
            <p>
              I&apos;m a backend Software Engineer focused mainly on Java with Spring Boot, AWS,
              observability with Datadog and CloudWatch, microservices, design systems, and
              artificial intelligence.
            </p>
            <p>
              Currently, I work at Itaú Unibanco as a Software Engineer II in the Insurance
              community. My main work has been developing solutions for the Personal Insurance
              (Seguros PF) community, including Insurance Onboarding, Insurance Claims, and
              Insurance Offer products.
            </p>
            <p>
              For more information, see my{" "}
              <Link to="/resume" className="resume-link">
                full résumé
              </Link>
              .
            </p>
            <dl className="about-facts">
              {FACTS.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <BootSequence onBooted={onBooted} />
    </div>
  );
}
