import { getCliLocale } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const pipelineListLabels = {
  en: {
    id: "ID",
    key: "Key",
    name: "Name",
    enforceTransitions: "Enforce transitions",
    stageCount: "Stages",
    openCaseCount: "Open cases",
  },
  "pt-BR": {
    id: "ID",
    key: "Chave",
    name: "Nome",
    enforceTransitions: "Exigir transições",
    stageCount: "Etapas",
    openCaseCount: "Casos abertos",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function pipelineListColumnLabels(locale: SupportedLocale = getCliLocale()): Record<string, string> {
  return pipelineListLabels[locale];
}
