/** User-facing language is independent of storage, money and execution identity. */
export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_USER_LOCALE: SupportedLocale = "pt-BR";
export const FALLBACK_LOCALE: SupportedLocale = "en";
export const LOCALE_LABELS: Readonly<Record<SupportedLocale, string>> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "pt-BR" || value === "en";
}

/** Reject aliases rather than silently changing persisted/API values. */
export function resolveLocale(value: unknown): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_USER_LOCALE;
}

export function intlLocale(locale: SupportedLocale): string {
  return locale === "en" ? "en-US" : "pt-BR";
}
