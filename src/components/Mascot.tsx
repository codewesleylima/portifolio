import { Link } from "@tanstack/react-router";

/**
 * Pixel-art sprite of the engineer at the console — now the door into the arcade
 * session. The accessible name lives on the link (what happens on click); the image's
 * alt is empty so the two aren't announced back to back by a screen reader.
 */
export default function Mascot() {
  return (
    <Link to="/arcade" className="mascot" aria-label="Play Debug Run — a hidden arcade session">
      <span className="mascot-phosphor" aria-hidden="true" />
      <img
        className="mascot-sprite"
        src="/mascot.webp"
        alt=""
        decoding="async"
        width={512}
        height={464}
        fetchPriority="high"
      />
      <span className="mascot-ghost mascot-ghost-a" aria-hidden="true" />
      <span className="mascot-ghost mascot-ghost-b" aria-hidden="true" />
      <span className="mascot-hint" aria-hidden="true">
        ▶ play
      </span>
    </Link>
  );
}
