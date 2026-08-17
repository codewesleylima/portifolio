import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Challenge, { type ChallengeSpec } from "@/components/Challenge";
import Quiz, { type QuizQuestion } from "@/components/Quiz";
import questions from "@/data/questions.json";
import studies from "@/data/studies.json";

export const Route = createFileRoute("/studies")({
  component: StudiesPage,
  head: () => ({
    meta: [
      { title: "Studies — Wesley Lima" },
      {
        name: "description",
        content:
          "A structured protocol for building algorithmic proficiency: 60 topics across 8 blocks, governed by spaced repetition, interleaving, active recall and elaboration.",
      },
    ],
  }),
});

const REPO = "https://github.com/codewesleylima/leetcode";

/** The four findings the schedule is actually derived from, not decoration. */
const BASIS = [
  {
    citation: "Bjork & Bjork (1992)",
    finding: "Desirable difficulties",
    applied: "Reasoning is externalised in writing and out loud before a topic counts as done.",
  },
  {
    citation: "Ericsson (2008)",
    finding: "Deliberate practice",
    applied: "Work sits at the edge of current competence, with immediate specific feedback.",
  },
  {
    citation: "Karpicke & Roediger (2008)",
    finding: "Spacing effect",
    applied: "Fixed review checkpoints at T+2 and T+7 days, widening as retention holds.",
  },
  {
    citation: "Dunlosky et al. (2013)",
    finding: "Technique efficacy",
    applied: "Topics rotate across blocks; self-testing always precedes the worked solution.",
  },
];

const BLOCKS = [
  {
    id: "0",
    name: "Fundamentals",
    weight: "continuous",
    detail:
      "Java syntax from memory, overflow and type pitfalls, Big-O analysis, manual tracing, clean code under time pressure.",
  },
  {
    id: "1",
    name: "Arrays & strings",
    weight: "high",
    detail:
      "Two pointers, convergent and divergent. Fixed and dynamic sliding windows. Prefix sums. Binary search, classical and over answer space.",
  },
  {
    id: "2",
    name: "Stacks, heaps & queues",
    weight: "high",
    detail:
      "Stack-based parsing, monotonic stack and queue, heap operations, priority queues, two-heap patterns, quickselect.",
  },
  {
    id: "3",
    name: "Graphs & trees",
    weight: "maximum",
    detail:
      "The highest-frequency cluster. Adjacency and implicit representations, layered and multi-source BFS, recursive and iterative DFS, cycle detection, topological sort, Union-Find, Dijkstra, LCA, BST validation, Trie.",
  },
  {
    id: "4",
    name: "Recursion & DP",
    weight: "high",
    detail:
      "Backtracking over subsets, combinations and permutations. Memoisation top-down, tabulation bottom-up, grid DP, knapsack variants, LIS, LCS, edit distance.",
  },
  {
    id: "5",
    name: "Complementary patterns",
    weight: "medium",
    detail:
      "Interval merging, sweep line, linked lists, matrix traversal, bit manipulation, greedy with exchange arguments, Fisher-Yates, reservoir sampling.",
  },
  {
    id: "6",
    name: "Communication",
    weight: "transversal",
    detail:
      "Narrating design decisions in English while writing. Handling incomplete statements, asking for the missing constraint, self-correcting mid-solution.",
  },
  {
    id: "7",
    name: "Metacognition",
    weight: "transversal",
    detail:
      "Error analysis by category, transfer of learning, recall strategy, sustained attention across long sessions.",
  },
];

const RULES = [
  "Write first — never read a complete solution before attempting one.",
  "Brute force before optimisation; articulating the naive approach counts.",
  "Trace by hand against real inputs before declaring anything finished.",
  "State time and space complexity with the reasoning, not just the notation.",
  "Narrate continuously — silence past twenty seconds signals a gap.",
];

const WEIGHT_CLASS: Record<string, string> = {
  maximum: "s-alert",
  high: "s-warning",
  medium: "s-healthy",
  continuous: "s-healthy",
  transversal: "s-healthy",
};

function CurriculumMap() {
  return (
    <svg
      className="study-map"
      viewBox="0 0 720 120"
      role="img"
      aria-label="Eight curriculum blocks, with graphs and trees carrying the highest weight"
    >
      {BLOCKS.map((b, i) => {
        const x = 10 + i * 88;
        const h = b.weight === "maximum" ? 74 : b.weight === "high" ? 54 : 34;
        return (
          <g key={b.id}>
            <rect
              x={x}
              y={92 - h}
              width={64}
              height={h}
              rx={4}
              fill={b.weight === "maximum" ? "var(--phosphor)" : "var(--phosphor-deep)"}
              opacity={b.weight === "maximum" ? 0.95 : 0.55}
            />
            <text x={x + 32} y={108} textAnchor="middle" className="study-map-label">
              {b.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ProgressChart() {
  const weeks = studies.progress.weeks;
  const max = Math.max(...weeks.map((w) => w.solved)) * 1.15;
  const W = 720;
  const H = 200;
  const pad = 28;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (weeks.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);

  const areaPath =
    `M ${x(0)} ${H - pad} ` +
    weeks.map((w, i) => `L ${x(i)} ${y(w.solved)}`).join(" ") +
    ` L ${x(weeks.length - 1)} ${H - pad} Z`;
  const linePath = weeks.map((w, i) => `${i ? "L" : "M"} ${x(i)} ${y(w.unaided)}`).join(" ");

  return (
    <svg
      className="progress-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Problems solved per week, with the unaided subset as a line"
    >
      <path d={areaPath} fill="var(--phosphor-deep)" opacity="0.45" />
      <path d={linePath} fill="none" stroke="var(--phosphor)" strokeWidth="2.5" />
      {weeks.map((w, i) => (
        <g key={w.label}>
          <circle cx={x(i)} cy={y(w.unaided)} r="3.5" fill="var(--phosphor)" />
          <text x={x(i)} y={H - 8} textAnchor="middle" className="chart-label">
            {w.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Ordered by recency of study, not by seniority of the subject: LeetCode is the live
 * track, Java the standing one, AWS the certification track behind it.
 */
const TRACKS = [
  {
    id: "leetcode",
    label: "LeetCode",
    blurb:
      "The active track. Algorithms and data structures worked through under protocol, with solutions drafted in plain text and reasoning narrated out loud.",
    /** Only this track has a verified reference channel; the others are left without
        rather than pointed at something unvetted. */
    reference: studies.reference.channelId,
  },
  {
    id: "java",
    label: "Java",
    blurb:
      "The standing track. Language and library behaviour recalled from memory rather than from a dropdown — collections and their guarantees, concurrency, the contracts the compiler does not enforce.",
    reference: null,
  },
  {
    id: "aws",
    label: "AWS",
    blurb:
      "The certification track. Service selection under real constraints: which storage class, which network path, which delivery guarantee, and what each one costs.",
    reference: null,
  },
] as const;

function StudiesPage() {
  const [active, setActive] = useState((studies.challenges as ChallengeSpec[])[0]?.id ?? "");
  const [track, setTrack] = useState<(typeof TRACKS)[number]["id"]>("leetcode");
  const current = TRACKS.find((t) => t.id === track) ?? TRACKS[0];
  const bank = (questions as Record<string, QuizQuestion[]>)[track] ?? [];

  return (
    <main className="shell" style={{ paddingBlock: "clamp(3rem,7vw,5rem)" }}>
      <p className="eyebrow">04 // study protocol</p>
      <h1 className="section-title">Algorithms, under protocol</h1>
      <p className="section-note" style={{ maxWidth: "70ch" }}>
        A sequenced curriculum for building algorithmic proficiency — 60 topics across 8 blocks,
        with the schedule derived from published findings on skill acquisition rather than from
        intuition. The premise is that this is a trainable system property, measurable and
        correctable like any other engineering outcome.
      </p>

      <CurriculumMap />

      <section className="study-section">
        <h2 className="study-h2">Right now</h2>
        <article className="tile current-card">
          <div className="current-head">
            <span className="block-id">{studies.current.block}</span>
            <div>
              <p className="current-topic">{studies.current.topic}</p>
              <p className="current-sub">{studies.current.subtopic}</p>
            </div>
            <span className="current-since">since {studies.current.since}</span>
          </div>
          <p className="tile-desc">{studies.current.why}</p>
          <p className="current-next">
            <span className="eyebrow">up next</span> {studies.current.next}
          </p>
        </article>
      </section>

      <section className="study-section">
        <h2 className="study-h2">Progress</h2>
        <div className="metric-row">
          <div className="metric">
            <span className="metric-value">{studies.progress.solved}</span>
            <span className="metric-label">problems solved</span>
          </div>
          <div className="metric">
            <span className="metric-value">
              {studies.progress.topicsDone}/{studies.progress.topicsTotal}
            </span>
            <span className="metric-label">topics closed</span>
          </div>
          <div className="metric">
            <span className="metric-value">{studies.progress.unaidedRate}%</span>
            <span className="metric-label">solved unaided</span>
          </div>
          <div className="metric">
            <span className="metric-value">{studies.progress.avgMinutes}m</span>
            <span className="metric-label">median time</span>
          </div>
          <div className="metric">
            <span className="metric-value">{studies.progress.reviewsDue}</span>
            <span className="metric-label">reviews due</span>
          </div>
        </div>
        <ProgressChart />
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          Two series, because volume alone flatters. The filled area is problems solved; the line is
          those solved with no reference consulted. The gap between them closing is the actual
          signal — solving more while still looking things up is motion, not progress.
        </p>
      </section>

      <section className="study-section">
        <h2 className="study-h2">Worked examples</h2>
        <div className="exercise-list">
          {studies.exercises.map((ex) => (
            <article key={ex.name} className="tile exercise-card">
              <div className="exercise-head">
                <h3 className="block-name">{ex.name}</h3>
                <span className="block-weight">{ex.block}</span>
              </div>
              <div className="exercise-tags">
                <span className="badge">{ex.pattern}</span>
                <span className="label-chip">{ex.complexity}</span>
              </div>
              <p className="tile-desc">{ex.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="study-section">
        <h2 className="study-h2">Theoretical basis</h2>
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          Four findings constrain the design. Each maps to a concrete mechanism rather than sitting
          in a bibliography.
        </p>
        <div className="basis-grid">
          {BASIS.map((b) => (
            <article key={b.citation} className="tile basis-card">
              <p className="basis-citation">{b.citation}</p>
              <p className="basis-finding">{b.finding}</p>
              <p className="tile-desc">{b.applied}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="study-section">
        <h2 className="study-h2">Curriculum</h2>
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          Blocks are weighted by observed frequency, not by personal preference. Block 3 carries the
          most weight because it earns it.
        </p>
        <div className="block-list">
          {BLOCKS.map((b) => (
            <article key={b.id} className="tile block-card">
              <div className="block-head">
                <span className="block-id">{b.id}</span>
                <h3 className="block-name">{b.name}</h3>
                <span className={`dot ${WEIGHT_CLASS[b.weight]}`} aria-hidden="true" />
                <span className="block-weight">{b.weight}</span>
              </div>
              <p className="tile-desc">{b.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="study-section">
        <h2 className="study-h2">Working conditions</h2>
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          Solutions are drafted in plain text — no IDE, no autocomplete, no compiler. Removing the
          tooling is the point: it exposes precisely which parts of the language are known and which
          were being carried. Sessions are timed at 45 minutes and scored across four dimensions —
          problem solving, coding, communication and verification.
        </p>
        <ol className="rules-list">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>

      <section className="study-section">
        <h2 className="study-h2">Questions</h2>
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          One question at a time, scored as you go. Every option is explained after you answer —
          knowing why the other three fail is what stops the same mistake next time. References
          appear with the explanation rather than before it.
        </p>

        <div className="challenge-tabs" role="tablist">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={track === t.id}
              className={`chip${track === t.id ? " is-active" : ""}`}
              onClick={() => setTrack(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="section-note" style={{ maxWidth: "70ch", marginTop: "0.9rem" }}>
          {current.blurb}
        </p>

        <Quiz questions={bank} topicLabel={current.label} />

        {current.reference && (
          <div className="channel-frame" style={{ marginTop: "1.6rem" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/videoseries?list=UU${current.reference.slice(2)}&rel=0&modestbranding=1`}
              title={`Study sessions for ${current.label}`}
              loading="lazy"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </section>

      <section className="study-section">
        <h2 className="study-h2">Want to try?</h2>
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          The same patterns, as runnable problems. Write a solution, run it against the cases and
          read the log — the log is the point, not the score. These run in JavaScript because that
          is what a browser executes; the reasoning transfers unchanged.
        </p>

        <div className="challenge-tabs" role="tablist">
          {(studies.challenges as ChallengeSpec[]).map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active === c.id}
              className={`chip${active === c.id ? " is-active" : ""}`}
              onClick={() => setActive(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>

        {(studies.challenges as ChallengeSpec[])
          .filter((c) => c.id === active)
          .map((c) => (
            <Challenge key={c.id} spec={c} />
          ))}
      </section>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "2.5rem" }}>
        <a className="btn btn-primary" href={REPO} target="_blank" rel="noreferrer noopener">
          Study repository ↗
        </a>
      </div>
    </main>
  );
}
