import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

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

/** Strings that would only be corrupted by translation. */
function shouldTranslate(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  // No letters at all: numbers, timestamps, separators, arrows.
  if (!/\p{L}/u.test(trimmed)) return false;
  // Identifiers and paths: repo names, file names, kebab and snake case.
  if (/^[\w./-]+$/.test(trimmed) && !/\s/.test(trimmed)) return false;
  return true;
}

function collect(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!shouldTranslate(node.nodeValue ?? "")) return NodeFilter.FILTER_REJECT;
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

/** Original text per node, so switching locales re-translates the source, not a translation. */
const originals = new WeakMap<Text, string>();

const memory = new Map<string, string>();
const cacheKey = (locale: Locale, text: string) => `${locale}::${text}`;

function readCache(locale: Locale) {
  try {
    const raw = window.sessionStorage.getItem(`i18n:${locale}`);
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
    const raw = window.sessionStorage.getItem(`i18n:${locale}`);
    const merged = { ...(raw ? (JSON.parse(raw) as Record<string, string>) : {}), ...pairs };
    window.sessionStorage.setItem(`i18n:${locale}`, JSON.stringify(merged));
  } catch {
    /* quota or private mode — the in-memory map still serves this session */
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

/**
 * Applies `locale` to every eligible text node under `root`.
 *
 * Restoring to English is synchronous and always works, because the originals are held
 * in a WeakMap rather than re-fetched. Any failure in the upstream call leaves the page
 * exactly as it is — a half-translated page is worse than an untranslated one.
 */
export async function translatePage(locale: Locale, root: HTMLElement = document.body) {
  const token = ++runToken;
  const nodes = collect(root);

  for (const node of nodes) {
    if (!originals.has(node)) originals.set(node, node.nodeValue ?? "");
  }

  if (locale === DEFAULT_LOCALE) {
    for (const node of nodes) {
      const original = originals.get(node);
      if (original !== undefined) node.nodeValue = original;
    }
    return;
  }

  readCache(locale);

  const pending = new Set<string>();
  for (const node of nodes) {
    const source = originals.get(node) ?? "";
    const hit = memory.get(cacheKey(locale, source.trim()));
    if (hit) {
      node.nodeValue = source.replace(source.trim(), hit);
    } else {
      pending.add(source.trim());
    }
  }

  if (pending.size === 0) return;

  try {
    const list = [...pending];
    // Chunked so one oversized request cannot fail the whole page, and so partial
    // results land progressively instead of all-or-nothing.
    const CHUNK = 24;
    for (let i = 0; i < list.length; i += CHUNK) {
      if (token !== runToken) return; // a newer locale switch superseded this run
      const slice = list.slice(i, i + CHUNK);
      const translations = await requestTranslations(slice, locale);

      for (const [source, translated] of Object.entries(translations)) {
        memory.set(cacheKey(locale, source), translated);
      }
      writeCache(locale, translations);

      for (const node of nodes) {
        const source = (originals.get(node) ?? "").trim();
        const translated = translations[source];
        if (translated) {
          const raw = originals.get(node) ?? "";
          node.nodeValue = raw.replace(source, translated);
        }
      }
    }
  } catch (error) {
    console.error("translation unavailable:", error);
  }
}
