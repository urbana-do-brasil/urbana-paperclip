import type { SupportedLocale } from "@paperclipai/shared/localization";
import { getCliLocale } from "./index.js";

const worktreeListMarkers = {
  en: {
    current: "current",
    paperclipConfig: "paperclip",
    noPaperclipConfig: "no-paperclip-config",
  },
  "pt-BR": {
    current: "atual",
    paperclipConfig: "config-paperclip",
    noPaperclipConfig: "sem-config-paperclip",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function worktreeListMarkerLabels(locale: SupportedLocale = getCliLocale()): Record<string, string> {
  return worktreeListMarkers[locale];
}
