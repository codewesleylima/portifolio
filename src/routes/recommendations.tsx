import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/recommendations")({
  component: RecommendationsPage,
  head: () => ({
    meta: [
      { title: "Recommendations — Wesley Lima" },
      {
        name: "description",
        content: "What colleagues at Itaú Unibanco have written about working with Wesley Lima.",
      },
    ],
  }),
});

const LINKEDIN = "https://linkedin.com/in/wesslima/details/recommendations";

interface Recommendation {
  name: string;
  role: string;
  relationship: string;
  date: string;
  /** Original Portuguese, as written on LinkedIn. Never paraphrased. */
  body: string[];
}

/**
 * Kept verbatim in Portuguese on purpose. These are other people's words about their
 * own experience — translating them would put my phrasing in their mouths, and a
 * recruiter who cannot read them can follow the link to the source.
 */
const RECOMMENDATIONS: Recommendation[] = [
  {
    name: "Emerson Parizoto",
    role: "Desenvolvedor Java · Itaú Unibanco",
    relationship: "Worked on the same team",
    date: "September 2025",
    body: [
      "Trabalho com o Wesley desde o início de sua carreira na área de tecnologia e sua evolução é notável. Encara os desafios de forma séria e dedicada. Está sempre antenado nas evoluções da nossa área se atualizando com cursos internos e externos.",
      "Uma de suas maiores contribuições foi a refatoração do fineops de nossas aplicações reduzindo bastante os custos com a AWS. Excelente pessoa e profissional, agrega enorme valor a qualquer equipe que o tenha.",
    ],
  },
  {
    name: "Isabella Oliveira",
    role: "Software Engineer · Itaú Unibanco · Tech Mentor @ FIAP",
    relationship: "Worked at the same company, different teams",
    date: "January 2026",
    body: [
      "O Wesley é um profissional que tem muita sede de conhecimento. Ele está sempre buscando evoluir suas soft skills compartilhando conteúdos e experiências para ajudar as pessoas em suas carreiras.",
      "É muito estudioso e está sempre buscando evolução e crescimento técnico.",
    ],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function RecommendationsPage() {
  return (
    <main className="shell" style={{ paddingBlock: "clamp(3rem,7vw,5rem)" }}>
      <p className="eyebrow">05 // peer review</p>
      <h1 className="section-title">Recommendations</h1>
      <p className="section-note" style={{ maxWidth: "68ch" }}>
        Written by colleagues on LinkedIn. Kept in the original Portuguese — these are their words
        about their own experience, and translating them would put my phrasing in their mouths.
      </p>

      <div className="rec-grid">
        {RECOMMENDATIONS.map((rec) => (
          <figure key={rec.name} className="tile rec-card">
            <div className="rec-head">
              <span className="rec-avatar" aria-hidden="true">
                {initials(rec.name)}
              </span>
              <div>
                <p className="rec-name">{rec.name}</p>
                <p className="rec-role">{rec.role}</p>
              </div>
            </div>

            <blockquote className="rec-body">
              {rec.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </blockquote>

            <figcaption className="rec-meta">
              <span>{rec.relationship}</span>
              <span>{rec.date}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "2.5rem" }}>
        <a className="btn btn-primary" href={LINKEDIN} target="_blank" rel="noreferrer noopener">
          Recomendações ↗
        </a>
      </div>
    </main>
  );
}
