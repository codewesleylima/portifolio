import { useEffect, useRef } from "react";

/**
 * Level meter driven by real audio, when real audio is available.
 *
 * An AnalyserNode can only read a stream the page is allowed to touch. The YouTube
 * embed is cross-origin, so its audio is unreachable by design — no amount of code
 * gets past origin isolation. Self-hosted files in <audio> are a different matter:
 * connect them through an AnalyserNode and the bars follow the actual waveform.
 *
 * So this component takes an optional element. Given one, it measures. Given none, it
 * falls back to a fixed animation and says so in the DOM, rather than pretending to
 * measure something it never saw.
 */
export default function SoundBars({
  audio,
  active,
  bars = 5,
}: {
  audio?: HTMLAudioElement | null | undefined;
  active: boolean;
  bars?: number;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audio) return;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    // Small FFT: five bars need coarse buckets, and a large window would smear the
    // transients that make a meter look alive.
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;

    let source: MediaElementAudioSourceNode;
    try {
      source = ctx.createMediaElementSource(audio);
    } catch {
      // Already connected by a previous mount; the existing graph keeps working.
      return;
    }
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const spans = () => Array.from(wrapRef.current?.children ?? []) as HTMLElement[];

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const els = spans();
      const perBar = Math.floor(data.length / els.length) || 1;
      els.forEach((el, i) => {
        let sum = 0;
        for (let j = 0; j < perBar; j++) sum += data[i * perBar + j] ?? 0;
        const level = sum / perBar / 255;
        el.style.height = `${3 + level * 13}px`;
      });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      analyser.disconnect();
      source.disconnect();
      void ctx.close();
    };
  }, [audio]);

  // A suspended context is the browser waiting for a gesture; resuming on play is
  // what makes the meter start rather than sit flat.
  useEffect(() => {
    if (!audio || !active) return;
    const ctx = analyserRef.current?.context as AudioContext | undefined;
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }, [audio, active]);

  const measured = Boolean(audio);

  return (
    <span
      ref={wrapRef}
      className={`sound-bars${active ? " is-playing" : ""}${measured ? " is-measured" : ""}`}
      aria-hidden="true"
      data-measured={measured ? "true" : "false"}
    >
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}
