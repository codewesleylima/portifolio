import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lofi / darksynth livestreams in the same register as the original track. Each is a
 * long continuous stream, so a shuffle lands mid-set rather than at a track boundary —
 * which suits ambient background better than a playlist would.
 */
const TRACKS = ["IjseQOHq_mU", "Z-VfaG9ZN_U", "_tUBCmGBO3A", "AF8LSurfct4", "b0bRw1faiws"] as const;

/**
 * Changing the track swaps the iframe src, which tears down the old player and builds
 * a new one. The new player always starts muted — browsers only allow autoplay that
 * way — and it is not listening for commands until it finishes loading. Commands sent
 * before that point are dropped silently.
 *
 * So the desired state is reapplied at three moments, and the retries below exist
 * because the player accepts postMessage slightly after load fires, not at it.
 */
const REAPPLY_DELAYS_MS = [0, 250, 700, 1500];

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
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const hasWokenRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  // Read inside the timers rather than captured at schedule time, so a mute toggle
  // during the reapply window wins instead of being overwritten by a stale value.
  const mutedRef = useRef(isMuted);
  mutedRef.current = isMuted;

  const post = useCallback((func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  const applyState = useCallback(() => {
    if (mutedRef.current) {
      post("mute");
      return;
    }
    post("unMute");
    post("setVolume", [35]);
    post("playVideo");
  }, [post]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  /** Push the desired state repeatedly while a freshly loaded player wakes up. */
  const applyWithRetries = useCallback(() => {
    clearTimers();
    timersRef.current = REAPPLY_DELAYS_MS.map((delay) => window.setTimeout(applyState, delay));
  }, [applyState]);

  useEffect(() => clearTimers, []);

  /* Shuffle request from the caller. */
  useEffect(() => {
    if (trackNonce === lastNonce.current) return;
    lastNonce.current = trackNonce;
    setIndex((current) => {
      if (TRACKS.length < 2) return current;
      // Never repeat the current track: pick from the others and map back.
      const offset = Math.floor(Math.random() * (TRACKS.length - 1));
      return offset >= current ? offset + 1 : offset;
    });
    // A shuffle is a deliberate user action, so it also counts as the first gesture:
    // asking someone to press play after they just asked for a different track is
    // one interaction too many.
    if (!hasWokenRef.current) {
      hasWokenRef.current = true;
      onFirstGesture?.();
    }
  }, [trackNonce, onFirstGesture]);

  /* External mute toggle, and every track change. */
  useEffect(() => {
    applyWithRetries();
  }, [isMuted, index, applyWithRetries]);

  /* Initial wake on first user gesture. */
  useEffect(() => {
    const wake = () => {
      if (hasWokenRef.current) return;
      hasWokenRef.current = true;
      applyState();
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
  }, [applyState, onFirstGesture]);

  const src =
    `https://www.youtube-nocookie.com/embed/${TRACKS[index]}` +
    `?autoplay=1&mute=1&loop=1&playlist=${TRACKS[index]}&controls=0&playsinline=1` +
    `&modestbranding=1&rel=0&enablejsapi=1&iv_load_policy=3`;

  return (
    <div className="ambient-audio no-print" aria-hidden="true">
      <iframe
        // Keyed by track: React replaces the element instead of mutating src, so
        // onLoad reliably fires for the new player.
        key={TRACKS[index]}
        ref={frameRef}
        src={src}
        title="Ambient soundtrack"
        allow="autoplay; encrypted-media"
        tabIndex={-1}
        data-muted={isMuted ? "true" : "false"}
        onLoad={() => {
          // The handshake the YouTube iframe API expects before it will act on
          // commands from this origin.
          frameRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "listening", id: TRACKS[index] }),
            "*",
          );
          applyWithRetries();
        }}
      />
    </div>
  );
}
