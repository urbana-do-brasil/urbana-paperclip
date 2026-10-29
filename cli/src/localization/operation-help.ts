import type { SupportedLocale } from "@paperclipai/shared/localization";
import type { Command } from "commander";

type LocaleText = Record<SupportedLocale, string>;
type CommandHelp = { description: LocaleText; options?: Record<string, LocaleText> };

const operationHelp: Record<string, CommandHelp> = {
  company: {
    description: {
      en: "Company operations",
      "pt-BR": "Operações de organizações",
    },
  },
  "company list": {
    description: {
      en: "List companies",
      "pt-BR": "Listar organizações",
    },
    options: {
      "--config": { en: "Path to Paperclip config file", "pt-BR": "Caminho para o arquivo de configuração do Paperclip" },
      "--data-dir": { en: "Paperclip data directory root (isolates state from ~/.paperclip)", "pt-BR": "Diretório raiz dos dados do Paperclip (isola o estado de ~/.paperclip)" },
      "--context": { en: "Path to CLI context file", "pt-BR": "Caminho para o arquivo de contexto da CLI" },
      "--profile": { en: "CLI context profile name", "pt-BR": "Nome do perfil do contexto da CLI" },
      "--api-base": { en: "Base URL for the Paperclip API", "pt-BR": "URL base da API do Paperclip" },
      "--api-key": { en: "Bearer token for agent-authenticated calls", "pt-BR": "Token bearer para chamadas autenticadas de agente" },
      "--run-id": {
        en: "Heartbeat run id for agent-authenticated mutations (checkout/release/interactions/in-progress update); falls back to $PAPERCLIP_RUN_ID",
        "pt-BR": "ID da execução do heartbeat para alterações autenticadas de agente (checkout/release/interactions/atualização em andamento); usa $PAPERCLIP_RUN_ID como alternativa",
      },
      "--json": { en: "Output raw JSON", "pt-BR": "Exibir JSON bruto" },
    },
  },
};

export function applyOperationHelpLocalization(root: Command, locale: SupportedLocale): void {
  const visit = (command: Command, parents: string[]) => {
    const parts = command === root ? [] : [...parents, command.name()];
    const help = operationHelp[parts.join(" ")];
    if (help) {
      command.description(help.description[locale]);
      for (const option of command.options) {
        const description = option.long ? help.options?.[option.long]?.[locale] : undefined;
        if (description) option.description = description;
      }
    }
    for (const child of command.commands) visit(child, parts);
  };
  visit(root, []);
}
