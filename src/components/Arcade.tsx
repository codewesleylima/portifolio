import { useCallback, useEffect, useRef, useState } from "react";

type State = "idle" | "running" | "over";

interface Obstacle {
  x: number;
  w: number;
  h: number;
  kind: 0 | 1;
}

const W = 720;
const H = 220;
const GROUND = H - 34;
const GRAVITY = 0.58;
const JUMP = -10.6;
const BASE_SPEED = 3.2;
const MAX_SPEED = 5.8;

const STORAGE_KEY = "debug-run:scores";
const RUN_HISTORY = 5;

const LABELS = ["NPE", "TIMEOUT", "5XX", "OOM", "DEADLOCK"];

/** DEBUG RUN — a tiny keyboard/tap runner. Jump the incidents, keep uptime green. */
export default function Arcade() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<State>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [runs, setRuns] = useState<number[]>([]);

  const game = useRef({
    y: GROUND,
    vy: 0,
    obstacles: [] as Obstacle[],
    speed: 5.2,
    t: 0,
    frame: 0,
    raf: 0,
    dead: false,
  });

  // Scores persist per browser. There is no backend and no account, so this is a
  // personal record rather than a leaderboard — claiming otherwise would be a lie
  // the first time someone opened the site on a second device.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { best?: number; runs?: number[] };
      if (typeof saved.best === "number") setBest(saved.best);
      if (Array.isArray(saved.runs)) setRuns(saved.runs.slice(0, RUN_HISTORY));
    } catch {
      /* private mode, disabled storage, corrupted value — play without history */
    }
  }, []);

  const jump = useCallback(() => {
    const g = game.current;
    if (state === "running" && g.y >= GROUND - 0.5) {
      g.vy = JUMP;
    }
  }, [state]);

  const start = useCallback(() => {
    const g = game.current;
    g.y = GROUND;
    g.vy = 0;
    g.obstacles = [];
    g.speed = BASE_SPEED;
    g.t = 0;
    g.frame = 0;
    g.dead = false;
    setScore(0);
    setState("running");
  }, []);

  useEffect(() => {
    if (state !== "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const g = game.current;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // grid floor
      ctx.strokeStyle = "rgba(107,122,128,0.22)";
      ctx.lineWidth = 1;
      for (let x = -((g.t * g.speed) % 48); x < W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND + 16);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(0,255,156,0.55)";
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 16);
      ctx.lineTo(W, GROUND + 16);
      ctx.stroke();

      // player
      const py = g.y - 26;
      ctx.fillStyle = "#00ff9c";
      ctx.shadowColor = "rgba(0,255,156,0.7)";
      ctx.shadowBlur = 14;
      ctx.fillRect(70, py, 22, 26);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#080a0c";
      ctx.fillRect(75, py + 7, 5, 5);
      ctx.fillRect(84, py + 7, 5, 5);

      // obstacles
      ctx.font = "10px ui-monospace, monospace";
      for (const o of g.obstacles) {
        ctx.fillStyle = o.kind === 0 ? "#ff2d55" : "#ffb020";
        ctx.shadowColor = o.kind === 0 ? "rgba(255,45,85,0.6)" : "rgba(255,176,32,0.6)";
        ctx.shadowBlur = 10;
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
        ctx.shadowBlur = 0;
      }
    };

    const tick = () => {
      g.t += 1;
      g.frame += 1;

      // physics
      g.vy += GRAVITY;
      g.y = Math.min(GROUND, g.y + g.vy);
      if (g.y === GROUND) g.vy = 0;

      // spawn
      const last = g.obstacles[g.obstacles.length - 1];
      if (!last || last.x < W - 240 - Math.random() * 220) {
        g.obstacles.push({
          x: W + 20,
          w: 16 + Math.round(Math.random() * 14),
          h: 22 + Math.round(Math.random() * 26),
          kind: Math.random() > 0.65 ? 1 : 0,
        });
      }

      g.speed = BASE_SPEED + Math.min(MAX_SPEED - BASE_SPEED, g.t / 1400);
      for (const o of g.obstacles) o.x -= g.speed;
      g.obstacles = g.obstacles.filter((o) => o.x + o.w > -30);

      // collision
      const px = 70;
      const pw = 22;
      const ph = 26;
      const py = g.y - ph;
      for (const o of g.obstacles) {
        if (px < o.x + o.w && px + pw > o.x && py + ph > GROUND - o.h) {
          g.dead = true;
          break;
        }
      }

      draw();

      if (g.dead) {
        setState("over");
        setScore((s) => {
          setBest((b) => Math.max(b, s));
          setRuns((prev) => {
            const next = [s, ...prev].slice(0, RUN_HISTORY);
            try {
              window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ best: Math.max(...next), runs: next }),
              );
            } catch {
              /* storage unavailable — the run still counts for this session */
            }
            return next;
          });
          return s;
        });
        return;
      }

      if (g.frame % 6 === 0) setScore((s) => s + 1);
      g.raf = window.requestAnimationFrame(tick);
    };

    g.raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(g.raf);
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (state === "running") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, state]);

  const label = LABELS[score % LABELS.length];

  return (
    <div className="console-frame arcade">
      <div className="console-bar">
        <span className={`dot ${state === "over" ? "s-alert" : "s-healthy"}`} aria-hidden="true" />
        <span>arcade / debug-run</span>
        <span style={{ marginLeft: "auto" }}>
          uptime {String(score).padStart(4, "0")} · best {String(best).padStart(4, "0")}
        </span>
      </div>

      {runs.length > 0 && (
        <div className="arcade-scores">
          <span className="arcade-scores-label">last runs</span>
          <ol>
            {runs.map((run, i) => (
              <li key={i} className={run === best ? "is-best" : ""}>
                {String(run).padStart(4, "0")}
              </li>
            ))}
          </ol>
          <span className="arcade-scores-label">
            {runs.length} {runs.length === 1 ? "run" : "runs"}
          </span>
        </div>
      )}

      <div
        className="arcade-stage"
        onPointerDown={() => (state === "running" ? jump() : start())}
        role="presentation"
      >
        <canvas ref={canvasRef} width={W} height={H} aria-hidden="true" />

        {state !== "running" && (
          <div className="arcade-overlay">
            <p className="eyebrow" style={{ color: "var(--phosphor)" }}>
              {state === "over" ? `incident: ${label} — service down` : "arcade mode"}
            </p>
            <p style={{ color: "#9fb1b3", fontSize: "0.78rem", margin: "0.5rem 0 1rem" }}>
              Jump the incidents. Space / ↑ / tap to hop.
            </p>
            <button className="btn btn-primary" type="button" onClick={start}>
              {state === "over" ? "Restart service" : "Start run"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
