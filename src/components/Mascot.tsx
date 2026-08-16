interface Props {
  booted?: boolean;
}

/** Pixel-art sprite of the engineer at the console. Decorative-adjacent, keeps its alt text. */
export default function Mascot({ booted = false }: Props) {
  return (
    <div className={`mascot${booted ? " is-booted" : ""}`}>
      <span className="mascot-phosphor" aria-hidden="true" />
      <img
        className="mascot-sprite"
        src="/mascot.png"
        alt="Pixel-art engineer typing at a CRT workstation"
        decoding="async"
      />
      <span className="mascot-ghost mascot-ghost-a" aria-hidden="true" />
      <span className="mascot-ghost mascot-ghost-b" aria-hidden="true" />
    </div>
  );
}
