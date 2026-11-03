import { getCliLocale, isCliJsonRequested } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const assetOperationMessages = {
  en: {
    fileRequired: "--file is required",
  },
  "pt-BR": {
    fileRequired: "A opção --file é obrigatória.",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

type AssetOperationMessageId = keyof typeof assetOperationMessages.en;

export function assetOperationMessage(id: AssetOperationMessageId, locale: SupportedLocale = getCliLocale()): string {
  return assetOperationMessages[locale][id];
}

/** Keep locally generated stderr stable in JSON mode across presentation locales. */
export function assetOperationErrorMessage(id: AssetOperationMessageId): string {
  return assetOperationMessage(id, isCliJsonRequested() ? "en" : getCliLocale());
}
