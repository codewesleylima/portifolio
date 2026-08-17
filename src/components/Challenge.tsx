import { useState } from "react";

interface Test {
  args: unknown[];
  expected: unknown;
}

export interface ChallengeSpec {
  id: string;
  title: string;
  block: string;
  brief: string;
  starter: string;
  fn: string;
  tests: Test[];
}

interface Result {
  index: number;
  args: unknown[];
  expected: unknown;
  received: unknown;
  passed: boolean;
  ms: number;
  error?: string;
}

const show = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const same = (a: unknown, b: unknown) => show(a) === show(b);

export default function Challenge({ spec }: { spec: ChallengeSpec }) {
  const [code, setCode] = useState(spec.starter);
  const [results, setResults] = useState<Result[] | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);

  /**
   * Runs the visitor's own code in their own browser. JavaScript rather than Java,
   * because Java has no client-side runtime — the pattern being practised is the
   * same, and the alternative was a run button that could not run anything.
   *
   * console.log is captured per test so the log reads as a trace of the run rather
   * than as noise in the browser devtools.
   */
  const run = () => {
    setFatal(null);
    const captured: string[] = [];
    const original = console.log;

    let solution: (...args: unknown[]) => unknown;
    try {
      // eslint-disable-next-line no-new-func
      const factory = new Function(
        `${code}\n;return typeof ${spec.fn} === "function" ? ${spec.fn} : null;`,
      );
      solution = factory() as (...args: unknown[]) => unknown;
      if (typeof solution !== "function") {
        setFatal(`No function named ${spec.fn} was defined. Keep the signature as given.`);
        setResults(null);
        setLogs([]);
        return;
      }
    } catch (error) {
      setFatal(`Could not parse your code — ${String(error)}`);
      setResults(null);
      setLogs([]);
      return;
    }

    console.log = (...args: unknown[]) => {
      captured.push(args.map((a) => (typeof a === "string" ? a : show(a))).join(" "));
    };

    const collected: Result[] = spec.tests.map((test, index) => {
      captured.push(`› case ${index + 1}: ${spec.fn}(${test.args.map(show).join(", ")})`);
      const started = performance.now();
      try {
        // Structured clone keeps a mutating solution from corrupting later cases.
        const received = solution(...structuredClone(test.args));
        const ms = performance.now() - started;
        const passed = same(received, test.expected);
        captured.push(
          `  ${passed ? "pass" : "FAIL"} — expected ${show(test.expected)}, got ${show(received)} (${ms.toFixed(2)}ms)`,
        );
        return { index, args: test.args, expected: test.expected, received, passed, ms };
      } catch (error) {
        const ms = performance.now() - started;
        captured.push(`  THREW — ${String(error)}`);
        return {
          index,
          args: test.args,
          expected: test.expected,
          received: undefined,
          passed: false,
          ms,
          error: String(error),
        };
      }
    });

    console.log = original;
    setResults(collected);
    setLogs(captured);
  };

  const reset = () => {
    setCode(spec.starter);
    setResults(null);
    setLogs([]);
    setFatal(null);
  };

  const passed = results?.filter((r) => r.passed).length ?? 0;
  const total = spec.tests.length;
  const allPassed = results !== null && passed === total;

  return (
    <div className="challenge">
      <div className="challenge-head">
        <span className="block-id">{spec.block.split(" ")[1] ?? "?"}</span>
        <div>
          <h3 className="challenge-title">{spec.title}</h3>
          <p className="challenge-block">{spec.block}</p>
        </div>
      </div>

      <p className="tile-desc challenge-brief">{spec.brief}</p>

      <label className="sr-only" htmlFor={`code-${spec.id}`}>
        Your solution
      </label>
      <textarea
        id={`code-${spec.id}`}
        className="challenge-editor"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={12}
      />

      <div className="challenge-actions">
        <button type="button" className="btn btn-primary" onClick={run}>
          Run tests
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
        {results !== null && (
          <span className={`challenge-verdict ${allPassed ? "t-healthy" : "t-alert"}`}>
            {passed} / {total} passing
          </span>
        )}
      </div>

      {fatal && <p className="challenge-fatal">{fatal}</p>}

      {results && (
        <ol className="challenge-results">
          {results.map((r) => (
            <li key={r.index} className={r.passed ? "is-pass" : "is-fail"}>
              <span className={`dot ${r.passed ? "s-healthy" : "s-alert"}`} aria-hidden="true" />
              <code>
                {spec.fn}({r.args.map(show).join(", ")})
              </code>
              <span className="challenge-expect">
                {r.error ? r.error : `expected ${show(r.expected)}, got ${show(r.received)}`}
              </span>
            </li>
          ))}
        </ol>
      )}

      {logs.length > 0 && (
        <div className="challenge-log">
          <p className="eyebrow">run log</p>
          <pre>{logs.join("\n")}</pre>
        </div>
      )}
    </div>
  );
}
