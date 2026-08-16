import { useEffect, useState } from "react";

// Original ASCII console daemon — idles, blinks, and reacts to hover/click.
const IDLE = ["[ o.o ]", "[ o.o ]", "[ -.- ]"];
const ALERTED = "[ O.O ]";
const HAPPY = "[ ^.^ ]";

export default function Daemon() {
  const [frame, setFrame] = useState(0);
  const [mood, setMood] = useState<"idle" | "alert" | "happy">("idle");

  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => (f + 1) % IDLE.length), 1400);
    return () => window.clearInterval(id);
  }, []);

  const face = mood === "alert" ? ALERTED : mood === "happy" ? HAPPY : IDLE[frame];

  return (
    <button
      type="button"
      className="daemon"
      aria-label="Console daemon mascot"
      onMouseEnter={() => setMood("alert")}
      onMouseLeave={() => setMood("idle")}
      onClick={() => {
        setMood("happy");
        window.setTimeout(() => setMood("idle"), 900);
      }}
    >
      {`  .---.
 /${face}\\
 |  ___  |
 '--\u2500\u2500\u2500--'
   \u2534   \u2534`}
    </button>
  );
}
