import { getCliLocale, isCliJsonRequested } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

export const feedbackOperationMessageCatalog = {
  en: {
    companyIdRequired: "Company ID is required. Pass --company-id, set PAPERCLIP_COMPANY_ID, or configure a CLI context default.",
    reportTitle: "Paperclip Feedback Report",
    serverLabel: "Server:",
    organizationLabel: "Organization:",
    noTraces: "[!!] No feedback traces found.",
    summary: "Summary",
    positiveVotes: "positive votes",
    negativeVotes: "negative votes",
    downvotesWithReason: "downvotes with a reason",
    totalTraces: "total traces",
    exportStatus: "Export status:",
    traceDetails: "Trace Details",
    traceLabel: "Trace:",
    statusLabel: "Status:",
    dateLabel: "Date:",
    targetLabel: "Target:",
    excerptLabel: "Excerpt:",
    reasonLabel: "Reason:",
    rawPayloads: "Raw Payloads",
    reportComplete: "Traces displayed: {count}",
  },
  "pt-BR": {
    companyIdRequired: "ID da organização obrigatório. Informe --company-id, defina PAPERCLIP_COMPANY_ID ou configure o padrão no contexto da CLI.",
    reportTitle: "Relatório de feedback do Paperclip",
    serverLabel: "Servidor:",
    organizationLabel: "Organização:",
    noTraces: "[!!] Nenhum trace de feedback encontrado.",
    summary: "Resumo",
    positiveVotes: "votos positivos",
    negativeVotes: "votos negativos",
    downvotesWithReason: "votos negativos com justificativa",
    totalTraces: "traces no total",
    exportStatus: "Status de exportação:",
    traceDetails: "Detalhes dos traces",
    traceLabel: "Rastro:",
    statusLabel: "Status:",
    dateLabel: "Data:",
    targetLabel: "Alvo:",
    excerptLabel: "Trecho:",
    reasonLabel: "Motivo:",
    rawPayloads: "Payloads brutos",
    reportComplete: "Traces exibidos: {count}",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export type FeedbackOperationMessageId = keyof typeof feedbackOperationMessageCatalog.en;

export function feedbackOperationMessage(
  id: FeedbackOperationMessageId,
  values: Readonly<Record<string, string | number>> = {},
  locale: SupportedLocale = getCliLocale(),
): string {
  let message = feedbackOperationMessageCatalog[locale][id];
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

/** Keep locally generated stderr stable when the command requests JSON output. */
export function feedbackOperationErrorMessage(id: FeedbackOperationMessageId): string {
  return feedbackOperationMessage(id, {}, isCliJsonRequested() ? "en" : getCliLocale());
}
