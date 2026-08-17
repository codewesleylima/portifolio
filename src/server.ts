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

async function translateOne(text: string, target: string): Promise<string> {
  const key = `${target}::${text}`;
  const cached = translationMemo.get(key);
  if (cached) return cached;

  const url =
    "https://api.mymemory.translated.net/get" +
    `?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`en|${target}`)}`;

  const response = await fetch(url, { headers: { "User-Agent": "portfolio-translate" } });
  if (!response.ok) return text;

  const payload = (await response.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  const translated = payload.responseData?.translatedText;

  // The provider returns its own error strings inside a 200, so reject anything that
  // looks like a quota notice rather than writing it onto the page.
  if (!translated || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) return text;

  translationMemo.set(key, translated);
  return translated;
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

    const results = await Promise.all(
      texts.map(async (text) => [text, await translateOne(text, target)] as const),
    );

    return new Response(JSON.stringify({ translations: Object.fromEntries(results) }), {
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
