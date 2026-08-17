import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const ITEMS = [
  { to: "/", label: "Home", note: "Service registry and telemetry" },
  { to: "/resume", label: "Resume", note: "Experience and background" },
  { to: "/studies", label: "Studies", note: "What I am working through now" },
  { to: "/recommendations", label: "Recommendations", note: "What colleagues have written" },
  { to: "/channel", label: "Media", note: "Video and short-form posts" },
] as const;

/**
 * Options menu. Labels stay in English like the rest of the site — a recruiter reading
 * "Estudos" next to "Resume" reads inconsistency, not bilingualism.
 */
export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Focus goes back where it came from, or keyboard users are stranded at the
      // top of the document with no idea what just closed.
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="nav-menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`nav-menu-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close options" : "Open options"}
      >
        <span className="nav-menu-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <div className="nav-menu-panel" role="menu">
          {ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              className="nav-menu-item"
              activeProps={{ className: "nav-menu-item is-active" }}
              activeOptions={{ exact: item.to === "/" }}
              onClick={() => setOpen(false)}
            >
              <span className="nav-menu-label">{item.label}</span>
              <span className="nav-menu-note">{item.note}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
