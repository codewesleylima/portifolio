import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import InstagramWall from "@/components/InstagramWall";

export const Route = createFileRoute("/channel")({
  component: ChannelPage,
  head: () => ({
    meta: [
      { title: "Media — Wesley Lima" },
      {
        name: "description",
        content: "Video and social: engineering walkthroughs, study sessions and short-form posts.",
      },
    ],
  }),
});

const CHANNEL_ID = "UC33xMgp2uLAVvxTTnCXEvcQ";
const CHANNEL = `https://www.youtube.com/channel/${CHANNEL_ID}`;

interface Featured {
  id: string;
  title: string;
  views: number;
}

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
  // Most-viewed video, resolved from the public RSS feed rather than the Data API,
  // which would need a key. The feed covers the 15 most recent uploads, so this is
  // the most-watched recent video — stated plainly below rather than implied.
  const [featured, setFeatured] = useState<Featured | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/featured-video?channel=${CHANNEL_ID}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { featured?: Featured }) => {
        if (!cancelled && data.featured?.id) setFeatured(data.featured);
      })
      .catch(() => {
        /* fall back to the uploads playlist below */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell" style={{ paddingBlock: "clamp(3rem,7vw,5rem)" }}>
      <p className="eyebrow">06 // media</p>
      <h1 className="section-title">Media</h1>
      <p className="section-note" style={{ maxWidth: "70ch" }}>
        Where the written material gets spoken out loud. Explaining a decision to a camera is a
        harder test than writing it down — the gaps show up immediately.
      </p>

      {featured && (
        <div className="featured-video is-compact">
          <div className="featured-head">
            <span className="dot s-healthy" aria-hidden="true" />
            <span className="featured-label">most watched</span>
            <span className="featured-views">{featured.views.toLocaleString()} views</span>
          </div>
          <div className="channel-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${featured.id}?rel=0&modestbranding=1`}
              title={featured.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="featured-title">{featured.title}</p>
        </div>
      )}

      <section style={{ marginTop: "2.6rem" }}>
        <p className="eyebrow">instagram · @ochicodev</p>
        <p className="section-note" style={{ maxWidth: "70ch" }}>
          Shorter form: fragments of the same work, posted as it happens.
        </p>
        <InstagramWall />
      </section>

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
