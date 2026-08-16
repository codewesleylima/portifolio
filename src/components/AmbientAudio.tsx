import { useEffect, useRef, useState } from "react";

/**
 * Lofi / darksynth livestreams in the same register as the original track. Each is a
 * long continuous stream, so a shuffle lands mid-set rather than at a track boundary —
 * which suits ambient background better than a playlist would.
 */
const TRACKS = ["IjseQOHq_mU", "Z-VfaG9ZN_U", "_tUBCmGBO3A", "AF8LSurfct4", "b0bRw1faiws"] as const;

interface AmbientAudioProps {
  isMuted: boolean;
  /** Bumped by the caller to request a different track. */
  trackNonce?: number;
  onFirstGesture?: () => void;
}

/**
 * Ambient soundtrack embedded as part of the page (no visible player).
 * Starts muted-autoplay (the only autoplay browsers allow), then unmutes
 * on the very first user gesture — click, key, scroll or touch.
 * The caller can also toggle mute state at any time via the isMuted prop.
 */
export function AmbientAudio({ isMuted, trackNonce = 0, onFirstGesture }: AmbientAudioProps) {
  // Index rather than a random pick at render time: the first track must match on
  // server and client, or hydration mismatches. Shuffling is a user action, so it
  // only ever happens after mount.
  const [index, setIndex] = useState(0);
  const lastNonce = useRef(trackNonce);

  useEffect(() => {
    if (trackNonce === lastNonce.current) return;
    lastNonce.current = trackNonce;
    setIndex((current) => {
      if (TRACKS.length < 2) return current;
      // Never repeat the current track: pick from the others and map back.
      const offset = Math.floor(Math.random() * (TRACKS.length - 1));
      return offset >= current ? offset + 1 : offset;
    });
  }, [trackNonce]);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const hasWokenRef = useRef(false);

  const post = (func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  };

  /* React to external mute toggle. */
  useEffect(() => {
    if (isMuted) {
      post("mute");
    } else {
      post("unMute");
      post("setVolume", [35]);
      post("playVideo");
    }
  }, [isMuted]);

  /* Initial wake on first user gesture. */
  useEffect(() => {
    const wake = () => {
      if (hasWokenRef.current) return;
      hasWokenRef.current = true;
      post("unMute");
      post("setVolume", [35]);
      post("playVideo");
      onFirstGesture?.();
    };

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "wheel",
      "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, wake, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, wake));
  }, [onFirstGesture]);

  const src =
    `https://www.youtube-nocookie.com/embed/${TRACKS[index]}` +
    `?autoplay=1&mute=1&loop=1&playlist=${TRACKS[index]}&controls=0&playsinline=1` +
    `&modestbranding=1&rel=0&enablejsapi=1&iv_load_policy=3`;

  return (
    <div className="ambient-audio no-print" aria-hidden="true">
      <iframe
        ref={frameRef}
        src={src}
        title="Ambient soundtrack"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
        data-muted={isMuted ? "true" : "false"}
      />
    </div>
  );
}
