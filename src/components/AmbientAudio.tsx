import { useEffect, useRef } from "react";

const VIDEO_ID = "IjseQOHq_mU";

interface AmbientAudioProps {
  isMuted: boolean;
  onFirstGesture?: () => void;
}

/**
 * Ambient soundtrack embedded as part of the page (no visible player).
 * Starts muted-autoplay (the only autoplay browsers allow), then unmutes
 * on the very first user gesture — click, key, scroll or touch.
 * The caller can also toggle mute state at any time via the isMuted prop.
 */
export function AmbientAudio({ isMuted, onFirstGesture }: AmbientAudioProps) {
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
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
    `?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&playsinline=1` +
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
