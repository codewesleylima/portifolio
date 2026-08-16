import { useEffect, useRef, useState } from "react";

const LINES = [
  { p: "$", t: "systemctl status wesley-lima.service", cls: "key" },
  { p: ">", t: "identity ......... Wesley Lima — Backend Software Engineer II", cls: "ok" },
  { p: ">", t: "environment ...... Itaú Unibanco / São Paulo, BR", cls: "ok" },
  { p: ">", t: "runtime .......... Java 21 · Spring Boot 3 · AWS · Kafka", cls: "ok" },
  { p: ">", t: "years shipping ... 7 (insurance & payments, production critical)", cls: "ok" },
  { p: ">", t: "current focus .... event-driven microservices, observability, FinOps", cls: "ok" },
  { p: "$", t: "console online — 9 services registered", cls: "ok" },
];

interface Props {
  onBooted?: (() => void) | undefined;
}

/** Types out the system check, then hands control to the console. */
export default function BootSequence({ onBooted }: Props) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [line, setLine] = useState(reduced ? LINES.length : 0);
  const [chars, setChars] = useState(0);
  const done = line >= LINES.length;
  const booted = useRef(false);

  useEffect(() => {
    if (done) {
      if (!booted.current) {
        booted.current = true;
        onBooted?.();
      }
      return;
    }
    const full = LINES[line]!.t.length;
    if (chars < full) {
      const id = window.setTimeout(() => setChars((c) => c + 2), 12);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setLine((l) => l + 1);
      setChars(0);
    }, 190);
    return () => window.clearTimeout(id);
  }, [line, chars, done, onBooted]);

  const visible = LINES.slice(0, done ? LINES.length : line + 1);

  return (
    <div className="console-frame">
      <div className="console-bar">
        <span className="dot s-healthy" aria-hidden="true" />
        <span>boot.log</span>
        <span style={{ marginLeft: "auto" }}>{done ? "ONLINE" : "BOOTING"}</span>
      </div>
      <div className="term" role="status" aria-live="polite">
        {visible.map((entry, i) => {
          const isLast = !done && i === visible.length - 1;
          const text = isLast ? entry.t.slice(0, chars) : entry.t;
          return (
            <div key={entry.t}>
              <span className="prompt">{entry.p} </span>
              <span className={entry.cls}>{text}</span>
              {isLast && <span className="caret" aria-hidden="true" />}
            </div>
          );
        })}
        {done && <span className="caret" aria-hidden="true" />}
      </div>
    </div>
  );
}
