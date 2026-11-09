import type { SupportedLocale } from "@paperclipai/shared/localization";

export const HELP_HOME = "start/what-is-paperclip";
export function helpHref(locale: SupportedLocale, slug: string) {
  return `/help/${locale}/${slug}`;
}
