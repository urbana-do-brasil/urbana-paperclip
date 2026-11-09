import { formatApiErrorMessage, parseApiErrorMessage } from "@paperclipai/shared/api-error-messages";
import { resolveLocale } from "@paperclipai/shared/localization";
import { i18n } from "../i18n";
import { ApiUnavailableError } from "./response";

/** Use only at a human-facing display point; protocol and Error.message stay intact. */
export function formatUiError(error: Error): string {
  const body = "body" in error ? (error as Error & { body?: unknown }).body : undefined;
  const presentation = error instanceof ApiUnavailableError ? { key: "service_unavailable" as const } : parseApiErrorMessage(body);
  return formatApiErrorMessage(presentation, error.message, resolveLocale(i18n.language));
}
