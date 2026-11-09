import type { Resource } from "i18next";
import { DEFAULT_USER_LOCALE, FALLBACK_LOCALE, SUPPORTED_LOCALES, isSupportedLocale } from "@paperclipai/shared/localization";

import { assertValidLocaleMessages } from "./locale-validation";

export const DEFAULT_LOCALE = DEFAULT_USER_LOCALE;
export { FALLBACK_LOCALE };
export type { SupportedLocale } from "@paperclipai/shared/localization";

const localeModules = import.meta.glob("./locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export const localeMessages = Object.fromEntries(
  Object.entries(localeModules).flatMap(([path, messages]) => {
    const locale = path.match(/\/([A-Za-z0-9_-]+)\.json$/)?.[1];
    if (!locale) {
      throw new Error(`Invalid locale file path: ${path}`);
    }
    // Upstream includes seed catalogs for other languages. Only the two
    // supported product languages participate in this rollout and its parity gate.
    return isSupportedLocale(locale) ? [[locale, messages]] : [];
  }),
);

for (const locale of SUPPORTED_LOCALES) {
  if (!(locale in localeMessages)) throw new Error(`Missing locale messages for ${locale}`);
}

for (const [locale, messages] of Object.entries(localeMessages)) {
  try {
    if (!isSupportedLocale(locale)) throw new Error(`Unsupported locale: ${locale}`);
    // CI validates full parity. At runtime a missing translation must use the
    // English fallback, while malformed or unsafe supplied content still fails.
    assertValidLocaleMessages(messages, undefined, locale, { allowMissing: locale !== FALLBACK_LOCALE });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${locale} locale messages: ${message}`);
  }
}

export const supportedLocales = [...SUPPORTED_LOCALES];

export const i18nextResources: Resource = Object.fromEntries(
  Object.entries(localeMessages).map(([locale, messages]) => [locale, { translation: messages }]),
) as Resource;
