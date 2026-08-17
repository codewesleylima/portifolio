import { useEffect, useRef, useState } from "react";
import { Shuffle, Volume2, VolumeX } from "lucide-react";
import SoundBars from "@/components/SoundBars";

interface Props {
  isMuted: boolean;
  /** When present the level meter reads this element instead of animating blind. */
  audio?: HTMLAudioElement | null;
  volume: number;
  onToggleMute: () => void;
  onVolume: (value: number) => void;
  onShuffle: () => void;
}

/**
 * Audio controls: shuffle, mute, and a volume slider that appears on hover or focus.
 *
 * The bars read real audio when the soundtrack is self-hosted, and fall back to a
 * fixed animation when it is a cross-origin embed whose stream the page cannot touch.
 * See SoundBars for the distinction.
 */
export default function SoundControl({
  isMuted,
  audio,
  volume,
  onToggleMute,
  onVolume,
  onShuffle,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const show = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Small delay so the pointer can travel from the button to the slider without the
  // panel vanishing under it.
  const hide = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 220);
  };

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  return (
    <div
      className="sound-control"
      ref={wrapRef}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      <button
        type="button"
        className="sound-toggle"
        onClick={onShuffle}
        aria-label="Shuffle soundtrack"
        title="Shuffle soundtrack"
      >
        <Shuffle size={16} />
      </button>

      <SoundBars audio={audio} active={!isMuted} />

      <button
        type="button"
        className="sound-toggle"
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute soundtrack" : "Mute soundtrack"}
        title={isMuted ? "Unmute soundtrack" : "Mute soundtrack"}
        aria-pressed={!isMuted}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span className="sound-toggle-pip" aria-hidden="true" />
      </button>

      {open && (
        <div className="volume-panel">
          <label className="sr-only" htmlFor="volume-slider">
            Volume
          </label>
          <input
            id="volume-slider"
            className="volume-slider"
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
          <span className="volume-value">{volume}</span>
        </div>
      )}
    </div>
  );
}
