import type { SupportedLocale } from "@paperclipai/shared/localization";
import { getCliLocale } from "./index.js";

export const routineOperationMessageCatalog = {
  en: {
    noRoutines: "No routines found for company {companyId}.",
    pausedSummary: "Paused {pausedCount} routine(s) for company {companyId} ({alreadyPausedCount} already paused, {archivedCount} archived).",
  },
  "pt-BR": {
    noRoutines: "Nenhuma rotina encontrada para a organização {companyId}.",
    pausedSummary: "Rotinas pausadas: {pausedCount} para a organização {companyId} ({alreadyPausedCount} já pausadas, {archivedCount} arquivadas).",
  },
} as const;

type RoutineOperationMessageKey = keyof typeof routineOperationMessageCatalog.en;

export function routineOperationMessage(
  key: RoutineOperationMessageKey,
  values: Readonly<Record<string, string | number>> = {},
  locale: SupportedLocale = getCliLocale(),
): string {
  let message: string = routineOperationMessageCatalog[locale][key];
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}
