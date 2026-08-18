import { DEFAULT_LOCALE, type Locale } from "@/lib/locale-config";
import { DICTIONARY_VALUES } from "@/lib/i18n";

/**
 * Whole-page translation.
 *
 * The static dictionary covers the chrome — nav, headings, buttons — instantly and
 * with correct technical vocabulary. Everything else is prose written in components,
 * and there is far too much of it to maintain by hand in ten languages. So the rest
 * is translated by walking the rendered DOM and swapping text nodes.
 *
 * This is the layer that makes "the whole page changes language" true rather than
 * "the menu changes language".
 */

/** Never translated: code, technical identifiers, and other people's quoted words. */
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "IFRAME",
  "NOSCRIPT",
  "SVG",
]);

const SKIP_SELECTOR = "[data-no-translate]";

/**
 * Names and terms that must survive untouched.
 *
 * Every corruption observed in production landed on one of these: the brand read back
 * as an MD5 plus a translation-memory filename, and project names came back the same
 * way. Providers answer short unknown strings with an internal reference instead of
 * declining, so the only reliable defence is never sending them.
 */
const NEVER_TRANSLATE = [
  "wesley lima",
  "wesley",
  "lima",
  "codewesleylima",
  "itaú unibanco",
  "itau unibanco",
  "cazé tv",
  "github",
  "linkedin",
  "leetcode",
  "cloudflare",
  "datadog",
  "spring boot",
  "java",
  "aws",
  "kafka",
  "docker",
  "kubernetes",
  "terraform",
  "postgresql",
  "mongodb",
  "redis",
  "dynamodb",
  "grafana",
  "cloudwatch",
  "finops",
  "fiap",
];

const neverSet = new Set(NEVER_TRANSLATE);

/**
 * Rejects a provider response that is not a translation.
 *
 * Providers do not always fail loudly. A 200 can carry a translation-memory id, a
 * filename, or a quota notice, and writing any of those onto the page is worse than
 * leaving the sentence in English.
 */
export function looksLikeGarbage(source: string, translated: string) {
  if (!translated.trim()) return true;
  if (/[0-9a-f]{16,}/i.test(translated)) return true; // hash-shaped token
  if (/\.(md|json|txt|xml|tmx|csv)\b/i.test(translated)) return true; // filename
  if (/MYMEMORY|QUERY LENGTH|QUOTA|API KEY|INVALID/i.test(translated)) return true;
  // A translation many times longer than its source is a payload, not a sentence.
  if (translated.length > source.length * 6 + 40) return true;
  return false;
}

/**
 * Strings that would only be corrupted by translation.
 *
 * Deliberately permissive: everything a reader can read should switch language. Only
 * brand/person names (the list above), pure punctuation/numbers and bare identifiers
 * are held back — headings, labels and short phrases all go through.
 */
function shouldTranslate(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (neverSet.has(trimmed.toLowerCase())) return false;
  // No letters at all: numbers, timestamps, separators, arrows.
  if (!/\p{L}/u.test(trimmed)) return false;
  // Bare identifiers and paths: repo names, file names, kebab/snake case, URLs.
  if (!/\s/.test(trimmed) && /^[\w./_-]+$/.test(trimmed) && /[./_-]/.test(trimmed)) return false;
  return true;
}

/** Splits prose too long for one upstream call into sentence-sized pieces. */
function splitLong(text: string, limit = 1200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > limit) {
      parts.push(current);
      current = "";
    }
    if (sentence.length > limit) {
      for (let i = 0; i < sentence.length; i += limit) parts.push(sentence.slice(i, i + limit));
      continue;
    }
    current += sentence;
  }
  if (current) parts.push(current);
  return parts;
}

function collect(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      const value = (node.nodeValue ?? "").trim();
      if (!shouldTranslate(value)) return NodeFilter.FILTER_REJECT;
      // Owned by the dictionary — already in the target language, not English.
      if (DICTIONARY_VALUES.has(value)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

/**
 * Attributes carrying visible prose. Text nodes alone were never going to be enough:
 * the search placeholder, tooltips and image descriptions are all read by users and
 * none of them is a text node.
 */
const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;

interface AttrTarget {
  el: Element;
  attr: string;
}

function collectAttrs(root: HTMLElement): AttrTarget[] {
  const targets: AttrTarget[] = [];
  const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(",");
  for (const el of Array.from(root.querySelectorAll(selector))) {
    if (el.closest(SKIP_SELECTOR)) continue;
    for (const attr of TRANSLATABLE_ATTRS) {
      const value = el.getAttribute(attr);
      if (value && shouldTranslate(value) && !DICTIONARY_VALUES.has(value.trim())) {
        targets.push({ el, attr });
      }
    }
  }
  return targets;
}

const attrOriginals = new WeakMap<Element, Map<string, string>>();

function rememberAttr({ el, attr }: AttrTarget) {
  let map = attrOriginals.get(el);
  if (!map) {
    map = new Map();
    attrOriginals.set(el, map);
  }
  if (!map.has(attr)) map.set(attr, el.getAttribute(attr) ?? "");
  return map.get(attr) ?? "";
}

/** Original text per node, so switching locales re-translates the source, not a translation. */
const originals = new WeakMap<Text, string>();

const memory = new Map<string, string>();
const cacheKey = (locale: Locale, text: string) => `${locale}::${text}`;

/**
 * Persisted across visits, not just across routes: the source strings are static site
 * copy, so a returning visitor's chosen locale applies with no network at all. The key
 * is versioned; bumping it invalidates every stored translation at once.
 */
const CACHE_VERSION = "v1";
const storeKey = (locale: Locale) => `i18n:${CACHE_VERSION}:${locale}`;

function readCache(locale: Locale) {
  try {
    const raw = window.localStorage.getItem(storeKey(locale));
    if (!raw) return;
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, string>)) {
      memory.set(cacheKey(locale, k), v);
    }
  } catch {
    /* storage unavailable — translate again, just slower */
  }
}

function writeCache(locale: Locale, pairs: Record<string, string>) {
  try {
    const key = storeKey(locale);
    const raw = window.localStorage.getItem(key);
    const merged = { ...(raw ? (JSON.parse(raw) as Record<string, string>) : {}), ...pairs };
    window.localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // Quota reached: drop this locale's history and keep only the newest pairs rather
    // than leaving a half-written blob behind.
    try {
      window.localStorage.setItem(storeKey(locale), JSON.stringify(pairs));
    } catch {
      /* private mode — the in-memory map still serves this session */
    }
  }
}

async function requestTranslations(
  texts: string[],
  locale: Locale,
): Promise<Record<string, string>> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target: locale, texts }),
  });
  if (!response.ok) throw new Error(`translate responded ${response.status}`);
  const payload = (await response.json()) as { translations?: Record<string, string> };
  return payload.translations ?? {};
}

let runToken = 0;
let activeLocale: Locale = DEFAULT_LOCALE;
let observer: MutationObserver | null = null;
let rerunTimer: number | null = null;

/**
 * React owns these text nodes. Any re-render or remount — a filter chip, the arcade
 * loop, the live repository fetch resolving, a route change — writes English back over
 * whatever was translated. A single pass therefore cannot hold.
 *
 * The observer re-runs the pass, debounced, whenever new text lands in the document.
 * It is disconnected during the pass itself so the translation does not observe its
 * own writes and loop forever.
 */
function ensureObserver() {
  if (observer || typeof MutationObserver === "undefined") return;

  observer = new MutationObserver(() => {
    if (activeLocale === DEFAULT_LOCALE) return;
    if (rerunTimer !== null) window.clearTimeout(rerunTimer);
    rerunTimer = window.setTimeout(() => void translatePage(activeLocale), 120);
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

/**
 * Applies `locale` to every eligible text node under `root`.
 *
 * Restoring to English is synchronous and always works, because the originals are held
 * in a WeakMap rather than re-fetched. Any failure in the upstream call leaves the page
 * exactly as it is — a half-translated page is worse than an untranslated one.
 */
export async function translatePage(
  locale: Locale,
  root: HTMLElement = document.body,
  attempt = 0,
) {
  const token = ++runToken;
  activeLocale = locale;
  ensureObserver();

  // Muted while we write, or every swap below would queue another pass.
  observer?.disconnect();
  const reconnect = () =>
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true });

  const nodes = collect(root);
  const attrs = collectAttrs(root);

  for (const node of nodes) {
    if (!originals.has(node)) originals.set(node, node.nodeValue ?? "");
  }
  for (const target of attrs) rememberAttr(target);

  if (locale === DEFAULT_LOCALE) {
    for (const node of nodes) {
      const original = originals.get(node);
      if (original !== undefined) node.nodeValue = original;
    }
    for (const { el, attr } of attrs) {
      const original = attrOriginals.get(el)?.get(attr);
      if (original !== undefined) el.setAttribute(attr, original);
    }
    reconnect();
    return;
  }

  readCache(locale);

  const pending = new Set<string>();
  for (const target of attrs) {
    const source = rememberAttr(target).trim();
    const hit = memory.get(cacheKey(locale, source));
    if (hit && !looksLikeGarbage(source, hit)) target.el.setAttribute(target.attr, hit);
    else pending.add(source);
  }
  for (const node of nodes) {
    const source = originals.get(node) ?? "";
    const trimmed = source.trim();
    const hit = memory.get(cacheKey(locale, trimmed));
    if (hit && !looksLikeGarbage(trimmed, hit)) {
      node.nodeValue = source.replace(trimmed, hit);
    } else {
      pending.add(trimmed);
    }
  }

  if (pending.size === 0) {
    reconnect();
    return;
  }

  try {
    /**
     * Batches are sized by encoded length, not by item count.
     *
     * A fixed count of twenty was the reason long prose never translated while the
     * menu did. The provider takes its input as repeated query parameters, so twenty
     * paragraphs of two hundred characters build a URL of several thousand — past
     * what the request survives. Short strings fit and came back translated; the
     * About panel and the hero paragraph did not, and failed silently.
     *
     * Anything longer than the budget on its own is sent alone rather than dropped.
     */
    const URL_BUDGET = 1400;

    const batches: string[][] = [];
    let batch: string[] = [];
    let weight = 0;

    // A paragraph past the provider's per-string ceiling used to be dropped, leaving
    // the longest — and most visible — prose in English. It is split on sentence
    // boundaries instead, translated in pieces and reassembled.
    const MAX_SINGLE = 2400;
    const pieces = new Map<string, string[]>();
    const units: string[] = [];

    for (const text of pending) {
      if (encodeURIComponent(text).length <= MAX_SINGLE) {
        units.push(text);
        continue;
      }
      const parts = splitLong(text);
      pieces.set(text, parts);
      for (const part of parts) units.push(part);
    }

    for (const text of units) {
      const cost = encodeURIComponent(text).length + 4;
      if (batch.length > 0 && (weight + cost > URL_BUDGET || batch.length >= 20)) {
        batches.push(batch);
        batch = [];
        weight = 0;
      }
      batch.push(text);
      weight += cost;
    }
    if (batch.length > 0) batches.push(batch);

    /**
     * Everything is collected before anything is written.
     *
     * Applying chunk by chunk meant a provider failing partway left the page half
     * translated — a Japanese heading over an English paragraph, which reads as broken
     * rather than as untranslated. Gathering first makes the outcome binary: the page
     * switches language completely, or it stays in English.
     */
    const gathered: Record<string, string> = {};

    let failed = 0;
    let superseded = false;
    for (const slice of batches) {
      try {
        const translations = await requestTranslations(slice, locale);
        for (const [source, translated] of Object.entries(translations)) {
          if (looksLikeGarbage(source, translated)) continue;
          gathered[source] = translated;
          // Cached the moment it arrives. React re-renders while requests are in
          // flight, which starts a newer pass and supersedes this one; without this
          // the work already paid for would be thrown away and the page would keep
          // asking for the same strings forever, never applying any of them.
          memory.set(cacheKey(locale, source), translated);
        }
      } catch {
        // One rate-limited batch used to abort the entire switch, which is why whole
        // sections stayed English. Failures are counted and retried instead.
        failed += 1;
      }
      // A locale switch mid-flight must stop; a re-render must not.
      if (activeLocale !== locale) return;
      if (token !== runToken) superseded = true;
    }

    // Reassemble split paragraphs from their translated pieces.
    for (const [source, parts] of pieces) {
      const translatedParts = parts.map(
        (part) => gathered[part] ?? memory.get(cacheKey(locale, part)),
      );
      if (translatedParts.every((part): part is string => Boolean(part))) {
        gathered[source] = translatedParts.join(" ");
      }
    }

    if ((failed > 0 || superseded) && activeLocale === locale && attempt < 3) {
      // Backs off and retries only the gaps — everything that succeeded is cached, so
      // a retry costs a fraction of the first pass. Capped so a provider that is down
      // does not retry forever.
      const delay = 1200 * (attempt + 1);
      window.setTimeout(() => void translatePage(locale, root, attempt + 1), delay);
    }

    writeCache(locale, gathered);

    // Re-collected rather than reusing the earlier list: React may have replaced
    // nodes while the requests were in flight, and writing to detached nodes is
    // invisible work.
    for (const node of collect(root)) {
      if (!originals.has(node)) originals.set(node, node.nodeValue ?? "");
      const raw = originals.get(node) ?? "";
      const source = raw.trim();
      const translated = gathered[source] ?? memory.get(cacheKey(locale, source));
      if (translated) node.nodeValue = raw.replace(source, translated);
    }

    for (const target of collectAttrs(root)) {
      const source = rememberAttr(target).trim();
      const translated = gathered[source] ?? memory.get(cacheKey(locale, source));
      if (translated) target.el.setAttribute(target.attr, translated);
    }
  } catch (error) {
    console.error("translation unavailable:", error);
  } finally {
    reconnect();
  }
}
