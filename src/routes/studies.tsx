import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/studies")({
  component: StudiesPage,
  head: () => ({
    meta: [
      { title: "Studies — Wesley Lima" },
      {
        name: "description",
        content:
          "Current study track: algorithms and data structures, distributed systems, and language fundamentals under constraint.",
      },
    ],
  }),
});

interface Track {
  id: string;
  title: string;
  status: "active" | "recurring" | "queued";
  premise: string;
  items: string[];
}

/**
 * Deliberately framed as a research log rather than a checklist. The point is not
 * "topics I have covered" — that reads as a syllabus — but what each track is
 * actually trying to answer.
 */
const TRACKS: Track[] = [
  {
    id: "dsa",
    title: "Algorithms & data structures",
    status: "active",
    premise:
      "Working through the classical problem space from first principles: not memorising solutions, but building the intuition for why a given structure collapses a problem's complexity.",
    items: [
      "Binary search and its non-obvious variants — first/last occurrence, search on answer space, rotated arrays",
      "Trees and graphs: traversal orders, shortest paths, topological ordering",
      "Dynamic programming as a recurrence made explicit, rather than as a pattern to recognise",
      "Complexity analysis argued out loud, including the space cost people skip",
    ],
  },
  {
    id: "constraint",
    title: "Writing under constraint",
    status: "active",
    premise:
      "Practising Java with no IDE, no autocomplete and no compiler. Removing the tooling exposes exactly which parts of the language you know and which parts you were being carried through.",
    items: [
      "Collections API and their guarantees recalled from memory, not from a dropdown",
      "Edge cases reasoned about before running anything — because nothing runs",
      "Narrating a solution in English while writing it, at conversation pace",
      "Timeboxed sessions: the constraint is the point, not the discomfort",
    ],
  },
  {
    id: "distributed",
    title: "Distributed systems",
    status: "recurring",
    premise:
      "The failure modes that only appear at scale, studied on purpose rather than discovered during an incident.",
    items: [
      "Consistency models and what each one actually costs the caller",
      "Idempotency, retries and compensation in payment-adjacent flows",
      "Observability as a design input: what to emit so the question is answerable later",
      "Cost as an architectural constraint — FinOps applied at design time, not audit time",
    ],
  },
  {
    id: "ai",
    title: "AI applied to engineering itself",
    status: "recurring",
    premise:
      "Less about using models and more about where they measurably change the work: review, exploration, and the parts of a task that are genuinely mechanical.",
    items: [
      "Where model output needs verification and where it does not",
      "Encoding team conventions so guidance is repeatable rather than re-explained",
      "Reading the failure cases as carefully as the successes",
    ],
  },
];

const STATUS_LABEL: Record<Track["status"], string> = {
  active: "IN PROGRESS",
  recurring: "ONGOING",
  queued: "QUEUED",
};

const STATUS_CLASS: Record<Track["status"], string> = {
  active: "s-healthy",
  recurring: "s-warning",
  queued: "s-alert",
};

function StudiesPage() {
  return (
    <main className="shell" style={{ paddingBlock: "clamp(3rem,7vw,5rem)" }}>
      <p className="eyebrow">04 // study log</p>
      <h1 className="section-title">Currently studying</h1>
      <p className="section-note" style={{ maxWidth: "68ch" }}>
        An open record of what I am working through and why. Tracks run in parallel and none of them
        close — the status marks how much attention each is getting right now.
      </p>

      <div className="studies-grid">
        {TRACKS.map((track) => (
          <article key={track.id} className="tile study-tile">
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span className={`dot ${STATUS_CLASS[track.status]}`} aria-hidden="true" />
              <span style={{ fontSize: "0.62rem", letterSpacing: "0.2em", color: "var(--dim)" }}>
                {STATUS_LABEL[track.status]}
              </span>
            </div>

            <h2 className="tile-name">{track.title}</h2>
            <p className="tile-desc">{track.premise}</p>

            <ul className="study-list">
              {track.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="section-note" style={{ marginTop: "2.5rem", maxWidth: "68ch" }}>
        Method, for anyone curious: concept first, then five questions of increasing difficulty,
        then re-explaining the idea in plain language until the gaps stop showing. The last step is
        the one that actually tells you whether you understood it.
      </p>
    </main>
  );
}
