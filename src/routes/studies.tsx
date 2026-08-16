import { createFileRoute } from "@tanstack/react-router";

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

function StudiesPage() {
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

      <div style={{ display: "flex", justifyContent: "center", marginTop: "2.5rem" }}>
        <a className="btn btn-primary" href={REPO} target="_blank" rel="noreferrer noopener">
          Study repository ↗
        </a>
      </div>
    </main>
  );
}
