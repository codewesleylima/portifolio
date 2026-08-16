import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { LOCALES, useLocale, type Locale } from "@/lib/i18n";

export default function LanguageMenu() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
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
    <div className="nav-menu lang-menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`nav-menu-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav.language")}
        title={t("nav.language")}
      >
        <Languages size={15} />
      </button>

      {open && (
        <div className="nav-menu-panel lang-panel" role="menu">
          {(Object.keys(LOCALES) as Locale[]).map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={locale === code}
              className={`lang-item${locale === code ? " is-active" : ""}`}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
            >
              {/* Each language is written in its own script — a reader looking for
                  日本語 should not have to find "Japanese" first. */}
              <span className="lang-name">{LOCALES[code]}</span>
              <span className="lang-code">{code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
