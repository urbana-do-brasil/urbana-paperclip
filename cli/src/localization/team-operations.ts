import { getCliLocale } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const teamListColumnCatalog = {
  en: {
    id: "ID",
    key: "Key",
    kind: "Kind",
    category: "Category",
    slug: "Slug",
    name: "Name",
    trust: "Trust",
    agents: "Agents",
    projects: "Projects",
  },
  "pt-BR": {
    id: "ID",
    key: "Chave",
    kind: "Tipo",
    category: "Categoria",
    slug: "Slug",
    name: "Nome",
    trust: "Confiança",
    agents: "Agentes",
    projects: "Projetos",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function teamListColumnLabels(locale: SupportedLocale = getCliLocale()): Record<string, string> {
  return teamListColumnCatalog[locale];
}
