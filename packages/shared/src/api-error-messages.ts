import type { SupportedLocale } from "./localization.js";

/** Stable, application-owned identities; never infer these from free text. */
export const API_ERROR_MESSAGE_KEYS = [
  "validation",
  "locale_auth_required",
  "locale_user_required",
  "locale_user_not_found",
  "locale_invalid_query",
  "service_unavailable",
  "retry_after_seconds",
] as const;
export type ApiErrorMessageKey = (typeof API_ERROR_MESSAGE_KEYS)[number];
export type ApiErrorMessage = { key: Exclude<ApiErrorMessageKey, "retry_after_seconds"> } | { key: "retry_after_seconds"; params: { seconds: number } };

/**
 * Metadata crosses a trust boundary: allow only recognized identities and a
 * bounded numeric parameter. Never interpolate provider/user-controlled text.
 */
export function parseApiErrorMessage(value: unknown): ApiErrorMessage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.messageKey !== "string" || !(API_ERROR_MESSAGE_KEYS as readonly string[]).includes(obj.messageKey)) return undefined;
  const key = obj.messageKey as ApiErrorMessageKey;
  if (key !== "retry_after_seconds") {
    if (obj.messageParams !== undefined) return undefined;
    return { key };
  }
  const params = obj.messageParams;
  if (!params || typeof params !== "object" || Array.isArray(params)) return undefined;
  const record = params as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Number.isInteger(record.seconds) || (record.seconds as number) < 1 || (record.seconds as number) > 86_400) return undefined;
  return { key, params: { seconds: record.seconds as number } };
}

export function apiErrorMessageFields(message: ApiErrorMessage | undefined): { messageKey?: ApiErrorMessageKey; messageParams?: { seconds: number } } {
  if (!message) return {};
  // Validate at runtime even when an upstream caller bypasses TypeScript.
  const validated = parseApiErrorMessage({ messageKey: message.key, ...(message.key === "retry_after_seconds" ? { messageParams: message.params } : {}) });
  return validated ? { messageKey: validated.key, ...(validated.key === "retry_after_seconds" ? { messageParams: validated.params } : {}) } : {};
}

/** Localized explanation plus the previously exposed original detail, if unknown. */
export function formatApiErrorMessage(message: ApiErrorMessage | undefined, original: string, locale: SupportedLocale): string {
  const labels = locale === "en" ? {
    validation: "The submitted data is invalid. Check the fields and try again.",
    locale_auth_required: "Sign in to manage your language preference.",
    locale_user_required: "A signed-in user account is required to manage language preferences.",
    locale_user_not_found: "The signed-in account could not be found.",
    locale_invalid_query: "The language preference request contains unsupported parameters.",
    service_unavailable: "Paperclip is temporarily unavailable. Please try again in a moment.",
    generic: "The request could not be completed.", detail: "Details",
    retry: (n: number) => `Try again in ${n} ${n === 1 ? "second" : "seconds"}.`,
  } : {
    validation: "Os dados enviados são inválidos. Revise os campos e tente novamente.",
    locale_auth_required: "Entre na sua conta para alterar a preferência de idioma.",
    locale_user_required: "É necessário entrar em uma conta para alterar a preferência de idioma.",
    locale_user_not_found: "Não foi possível encontrar a conta autenticada.",
    locale_invalid_query: "A solicitação de preferência de idioma contém parâmetros não permitidos.",
    service_unavailable: "O Paperclip está temporariamente indisponível. Tente novamente em instantes.",
    generic: "Não foi possível concluir a solicitação.", detail: "Detalhes",
    retry: (n: number) => `Tente novamente em ${n} ${n === 1 ? "segundo" : "segundos"}.`,
  };
  if (message?.key === "retry_after_seconds") return labels.retry(message.params.seconds);
  if (message) return labels[message.key];
  // The original message was already available to this client; preserve it as
  // a detail, never claim to have translated arbitrary third-party content.
  return original.trim() ? `${labels.generic} ${labels.detail}: ${original}` : labels.generic;
}
