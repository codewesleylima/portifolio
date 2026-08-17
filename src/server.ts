import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { fetchLivePortfolio, LIVE_TTL_SECONDS } from "./lib/github-live";

/**
 * Translation proxy.
 *
 * Kept on the Worker rather than called from the browser for two reasons: the upstream
 * has a per-IP quota that a single origin can pool and cache against, and a browser
 * call would be blocked by CORS on most providers.
 *
 * MyMemory is used because it needs no key, which keeps this working on a fresh deploy
 * with nothing to configure. It is rate limited and occasionally slow; every failure
 * path returns the source string unchanged, so a page never ends up half translated.
 */
const translationMemo = new Map<string, string>();

/**
 * One upstream call per batch, not per string.
 *
 * The first version called the provider once per text node. A page here carries well
 * over a hundred of them, which meant over a hundred subrequests — past the Worker's
 * per-request subrequest ceiling, and far past what a keyless provider tolerates
 * before it starts answering with quota notices instead of translations. That is why
 * only the dictionary strings ever changed: everything else silently fell back to the
 * source text.
 *
 * The endpoint below accepts repeated q parameters and answers with one entry per
 * input, so a batch of twenty costs a single subrequest.
 */
async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: target, dt: "t" });
  for (const text of texts) params.append("q", text);

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; portfolio-i18n)" },
  });
  if (!response.ok) throw new Error(`translate responded ${response.status}`);

  const payload = (await response.json()) as unknown;

  // A single q returns [[[translated, source, ...]], ...]; several return one such
  // structure per input. Normalising both shapes here keeps the caller simple.
  const groups: unknown[] =
    texts.length === 1 ? [payload] : Array.isArray(payload) ? (payload as unknown[]) : [];

  return texts.map((source, i) => {
    const group = groups[i] as unknown[] | undefined;
    const segments = (group?.[0] ?? []) as unknown[];
    if (!Array.isArray(segments) || segments.length === 0) return source;
    const joined = segments.map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : "")).join("");
    return joined.trim() ? joined : source;
  });
}

/**
 * Most-viewed video for the channel page.
 *
 * The Data API would need a key; the public RSS feed does not, and each entry carries
 * <media:statistics views="..."> alongside the video id. It only covers the 15 most
 * recent uploads, which is the honest limit of this approach and is stated on the page.
 */
async function handleFeaturedVideo(request: Request, ctx: unknown): Promise<Response> {
  const channelId = new URL(request.url).searchParams.get("channel") ?? "";
  if (!/^UC[\w-]{20,}$/.test(channelId)) {
    return new Response(JSON.stringify({ error: "bad channel id" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  try {
    const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: { "User-Agent": "portfolio-featured-video" },
    });
    if (!feed.ok) throw new Error(`feed responded ${feed.status}`);

    const xml = await feed.text();
    const entries = xml.split("<entry>").slice(1);

    const videos = entries
      .map((entry) => ({
        id: /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1] ?? "",
        title: /<media:title>([^<]*)<\/media:title>/.exec(entry)?.[1] ?? "",
        published: /<published>([^<]+)<\/published>/.exec(entry)?.[1] ?? "",
        views: Number(/<media:statistics[^>]*views="(\d+)"/.exec(entry)?.[1] ?? 0),
      }))
      .filter((v) => v.id);

    if (videos.length === 0) throw new Error("no entries");

    // Sort by views; fall back to newest when the feed omits statistics, which it
    // does for very recent uploads.
    const featured = [...videos].sort(
      (a, b) => b.views - a.views || b.published.localeCompare(a.published),
    )[0];

    const waitUntil = (ctx as { waitUntil?: (p: Promise<unknown>) => void } | undefined)?.waitUntil;
    void waitUntil;

    return new Response(JSON.stringify({ featured, count: videos.length }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("featured video failed:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

async function handleTranslate(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = (await request.json()) as { target?: string; texts?: string[] };
    const target = (body.target ?? "").slice(0, 5);
    const texts = (body.texts ?? []).slice(0, 40);

    if (!/^[a-z]{2}$/.test(target) || texts.length === 0) {
      return new Response(JSON.stringify({ translations: {} }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const translations: Record<string, string> = {};
    const missing: string[] = [];

    for (const text of texts) {
      const cached = translationMemo.get(`${target}::${text}`);
      if (cached) translations[text] = cached;
      else missing.push(text);
    }

    if (missing.length > 0) {
      const translated = await translateBatch(missing, target);
      missing.forEach((source, i) => {
        const value = translated[i] ?? source;
        translationMemo.set(`${target}::${source}`, value);
        translations[source] = value;
      });
    }

    return new Response(JSON.stringify({ translations }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("translate failed:", error);
    return new Response(JSON.stringify({ translations: {} }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Live registry endpoint, handled before the app router sees the request.
 *
 * Intercepting here rather than going through a framework server function keeps the
 * GitHub token on the Worker and the caching in one obvious place. Responses are held
 * in the edge cache for LIVE_TTL_SECONDS, so traffic volume does not translate into
 * GitHub API calls: one call per TTL window, however many visitors arrive.
 */
async function handleLiveRepos(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(new URL("/api/repos", request.url).toString(), { method: "GET" });

  const hit = await cache?.match(cacheKey);
  if (hit) return hit;

  try {
    const token = (env as { GITHUB_TOKEN?: string } | undefined)?.GITHUB_TOKEN;
    const payload = await fetchLivePortfolio(token);

    const response = new Response(JSON.stringify(payload), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${LIVE_TTL_SECONDS}`,
        // Diagnostic: curl -I /api/repos tells you whether the token is wired up,
        // instead of leaving a 503 to be guessed at.
        "x-live-auth": token ? "token" : "anonymous",
      },
    });

    const waitUntil = (ctx as { waitUntil?: (p: Promise<unknown>) => void } | undefined)?.waitUntil;
    if (cache) {
      const store = cache.put(cacheKey, response.clone());
      if (waitUntil) waitUntil(store);
      else await store;
    }
    return response;
  } catch (error) {
    // 503 rather than 500: the client treats this as "keep the baked data" and the
    // page carries on with what it shipped with.
    console.error("live repos failed:", error);
    return new Response(JSON.stringify({ error: "live read unavailable", detail: String(error) }), {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const path = new URL(request.url).pathname;
    if (path === "/api/repos") return handleLiveRepos(request, env, ctx);
    if (path === "/api/translate") return handleTranslate(request);
    if (path === "/api/featured-video") return handleFeaturedVideo(request, ctx);

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
