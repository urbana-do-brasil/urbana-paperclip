import { getCliLocale } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const secretListLabels = {
  en: {
    id: "ID",
    name: "Name",
    key: "Key",
    provider: "Provider",
    status: "Status",
    managedMode: "Managed mode",
    latestVersion: "Latest version",
    externalRef: "External reference",
  },
  "pt-BR": {
    id: "ID",
    name: "Nome",
    key: "Chave",
    provider: "Provedor",
    status: "Status",
    managedMode: "Modo de gerenciamento",
    latestVersion: "Última versão",
    externalRef: "Referência externa",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function secretListColumnLabels(locale: SupportedLocale = getCliLocale()): Record<string, string> {
  return secretListLabels[locale];
}
