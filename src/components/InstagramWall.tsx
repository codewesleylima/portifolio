import { useEffect } from "react";
import posts from "@/data/instagram.json";

const PROFILE = "https://www.instagram.com/ochicodev/";

/**
 * Instagram posts, embedded individually.
 *
 * Instagram has no supported profile embed and its API needs a token, so there is no
 * way to fetch "the most reacted" posts programmatically — that selection has to be
 * made by a human and listed in src/data/instagram.json. Each entry is rendered with
 * the official blockquote embed, which is the only method that keeps working without
 * credentials.
 *
 * With the list empty this renders a link to the profile rather than an empty frame.
 */
export default function InstagramWall() {
  useEffect(() => {
    if (posts.length === 0) return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="instagram.com/embed.js"]',
    );
    if (existing) {
      (
        window as unknown as { instgrm?: { Embeds: { process: () => void } } }
      ).instgrm?.Embeds.process();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (posts.length === 0) {
    return (
      <div className="ig-empty">
        <p className="tile-desc">
          No posts are pinned here yet. Add post URLs to src/data/instagram.json and they will
          appear as embeds — Instagram has no profile embed, so each one is listed deliberately.
        </p>
        <a className="btn btn-primary" href={PROFILE} target="_blank" rel="noreferrer noopener">
          @ochicodev ↗
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="ig-wall">
        {posts.map((url) => (
          <blockquote
            key={url}
            className="instagram-media"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            data-no-translate
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "1.4rem" }}>
        <a className="btn" href={PROFILE} target="_blank" rel="noreferrer noopener">
          @ochicodev ↗
        </a>
      </div>
    </>
  );
}
