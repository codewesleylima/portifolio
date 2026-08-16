import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/channel")({
  component: ChannelPage,
  head: () => ({
    meta: [
      { title: "Channel — Wesley Lima" },
      {
        name: "description",
        content: "Video channel: engineering walkthroughs, study sessions and technical talks.",
      },
    ],
  }),
});

const CHANNEL = "https://www.youtube.com/channel/UC33xMgp2uLAVvxTTnCXEvcQ";

const TOPICS = [
  {
    title: "Engineering walkthroughs",
    detail:
      "Backend decisions taken apart in the open — why a design was chosen, what it cost, and what broke afterwards.",
  },
  {
    title: "Study sessions",
    detail:
      "The algorithm protocol applied live: reading a problem cold, reasoning out loud, and correcting the wrong first instinct.",
  },
  {
    title: "Technical talks",
    detail:
      "Longer-form material on observability, event-driven design and applying AI to engineering work itself.",
  },
];

function ChannelPage() {
  return (
    <main className="shell" style={{ paddingBlock: "clamp(3rem,7vw,5rem)" }}>
      <p className="eyebrow">06 // broadcast</p>
      <h1 className="section-title">Channel</h1>
      <p className="section-note" style={{ maxWidth: "70ch" }}>
        Where the written material gets spoken out loud. Explaining a decision to a camera is a
        harder test than writing it down — the gaps show up immediately.
      </p>

      <div className="channel-frame">
        {/* Uploads playlist rather than a single video, so the embed never goes stale:
            YouTube derives it from the channel id by swapping the UC prefix for UU. */}
        <iframe
          src="https://www.youtube-nocookie.com/embed/videoseries?list=UU33xMgp2uLAVvxTTnCXEvcQ&rel=0&modestbranding=1"
          title="Latest videos"
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="channel-grid">
        {TOPICS.map((t) => (
          <article key={t.title} className="tile">
            <h2 className="tile-name">{t.title}</h2>
            <p className="tile-desc">{t.detail}</p>
          </article>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "2.5rem" }}>
        <a className="btn btn-primary" href={CHANNEL} target="_blank" rel="noreferrer noopener">
          Open the channel ↗
        </a>
      </div>
    </main>
  );
}
