/**
 * Locale identity, isolated from the dictionary and from the DOM pass.
 *
 * `i18n.tsx` and `translate-dom.ts` need each other: the provider drives the DOM pass,
 * and the DOM pass skips strings the dictionary already owns. That mutual import is
 * fine while every access happens inside a function, but a module-scope read of a
 * constant living in the other half evaluates before the cycle resolves and throws
 * `Cannot access '...' before initialization`.
 *
 * Keeping the constants here gives both modules a dependency-free source to read at
 * module scope, so neither half has to be evaluated first.
 */

export const LOCALES = {
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский",
} as const;

export type Locale = keyof typeof LOCALES;

export const DEFAULT_LOCALE: Locale = "en";
