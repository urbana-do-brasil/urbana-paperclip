import type { SupportedLocale } from "@paperclipai/shared/localization";
import type { Command } from "commander";

type LocaleText = Record<SupportedLocale, string>;
type CommandHelp = {
  description: LocaleText;
  arguments?: Record<string, LocaleText>;
  options?: Record<string, LocaleText>;
};

const commonClientOptions: Record<string, LocaleText> = {
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
};

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
    options: commonClientOptions,
  },
  "company get": {
    description: { en: "Get one company", "pt-BR": "Consultar uma organização" },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: commonClientOptions,
  },
  "company current": {
    description: {
      en: "Get the current scoped company from --company-id, context, env, or agent authentication",
      "pt-BR": "Consultar a organização atual do escopo usando --company-id, contexto, ambiente ou autenticação de agente",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID (overrides context default)", "pt-BR": "ID da organização (substitui o padrão do contexto)" },
    },
  },
  "company stats": {
    description: { en: "Get company stats", "pt-BR": "Consultar estatísticas da organização" },
    options: commonClientOptions,
  },
  "company create": {
    description: { en: "Create a company", "pt-BR": "Criar uma organização" },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "CreateCompany JSON payload", "pt-BR": "Payload JSON de CreateCompany" },
    },
  },
  "company update": {
    description: { en: "Update a company", "pt-BR": "Atualizar uma organização" },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "UpdateCompany JSON payload", "pt-BR": "Payload JSON de UpdateCompany" },
    },
  },
  "company branding:update": {
    description: { en: "Update company branding", "pt-BR": "Atualizar a identidade visual da organização" },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: {
      ...commonClientOptions,
      "--payload-json": {
        en: "UpdateCompanyBranding JSON payload",
        "pt-BR": "Payload JSON de UpdateCompanyBranding",
      },
    },
  },
  "company archive": {
    description: { en: "Archive a company", "pt-BR": "Arquivar uma organização" },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: commonClientOptions,
  },
  "company export": {
    description: {
      en: "Export a company into a portable markdown package",
      "pt-BR": "Exportar uma organização como pacote Markdown portátil",
    },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: {
      ...commonClientOptions,
      "--out": { en: "Output directory", "pt-BR": "Diretório de saída" },
      "--include": {
        en: "Comma-separated include set: company,agents,projects,issues,tasks,skills",
        "pt-BR": "Conjunto de conteúdo separado por vírgulas: company,agents,projects,issues,tasks,skills",
      },
      "--skills": {
        en: "Comma-separated skill slugs/keys to export",
        "pt-BR": "Slugs/chaves de skills para exportar, separados por vírgulas",
      },
      "--projects": {
        en: "Comma-separated project shortnames/ids to export",
        "pt-BR": "Nomes curtos/IDs de projetos para exportar, separados por vírgulas",
      },
      "--issues": {
        en: "Comma-separated issue identifiers/ids to export",
        "pt-BR": "Identificadores/IDs de tarefas para exportar, separados por vírgulas",
      },
      "--project-issues": {
        en: "Comma-separated project shortnames/ids whose issues should be exported",
        "pt-BR": "Nomes curtos/IDs dos projetos cujas tarefas devem ser exportadas, separados por vírgulas",
      },
      "--expand-referenced-skills": {
        en: "Vendor skill contents instead of exporting upstream references",
        "pt-BR": "Incluir o conteúdo das skills em vez de exportar referências upstream",
      },
      "--force": {
        en: "Overwrite a non-empty output directory without the interactive confirmation (required for non-interactive/automated runs such as the nightly backup routine)",
        "pt-BR": "Sobrescrever diretório de saída não vazio sem confirmação interativa (necessário em execuções não interativas/automatizadas, como a rotina de backup noturno)",
      },
    },
  },
  "company import": {
    description: {
      en: "Import a portable markdown company package from local path, URL, or GitHub",
      "pt-BR": "Importar um pacote Markdown de organização a partir de um caminho local, URL ou GitHub",
    },
    arguments: {
      fromPathOrUrl: { en: "Source path or URL", "pt-BR": "Caminho de origem ou URL" },
    },
    options: {
      ...commonClientOptions,
      "--include": {
        en: "Comma-separated include set: company,agents,projects,issues,tasks,skills",
        "pt-BR": "Conteúdo separado por vírgulas: company,agents,projects,issues,tasks,skills",
      },
      "--target": { en: "Target mode: new | existing", "pt-BR": "Modo de destino: new | existing" },
      "--company-id": { en: "Existing target company ID", "pt-BR": "ID da organização de destino existente" },
      "--new-company-name": { en: "Name override for --target new", "pt-BR": "Substituir o nome com --target new" },
      "--agents": {
        en: "Comma-separated agent slugs to import, or all",
        "pt-BR": "Slugs de agentes separados por vírgulas para importar, ou all",
      },
      "--collision": {
        en: "Collision strategy: rename | skip | replace",
        "pt-BR": "Estratégia para conflitos: rename | skip | replace",
      },
      "--ref": {
        en: "Git ref to use for GitHub imports (branch, tag, or commit)",
        "pt-BR": "Referência Git para importações do GitHub (branch, tag ou commit)",
      },
      "--paperclip-url": { en: "Alias for --api-base on this command", "pt-BR": "Alias de --api-base neste comando" },
      "--yes": {
        en: "Accept default selection and skip the pre-import confirmation prompt",
        "pt-BR": "Aceitar a seleção padrão e ignorar a confirmação antes da importação",
      },
      "--dry-run": { en: "Run preview only without applying", "pt-BR": "Executar somente a prévia, sem aplicar" },
    },
  },
  "company import:preview": {
    description: {
      en: "Preview a safe company import through the raw API route",
      "pt-BR": "Pré-visualizar uma importação segura pelo endpoint bruto da API",
    },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  "company import:apply": {
    description: {
      en: "Apply a safe company import through the raw API route",
      "pt-BR": "Aplicar uma importação segura pelo endpoint bruto da API",
    },
    arguments: { companyId: { en: "Company ID", "pt-BR": "ID da organização" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  "agent list": {
    description: {
      en: "List agents for a company",
      "pt-BR": "Listar agentes de uma organização",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "agent get": {
    description: { en: "Get one agent", "pt-BR": "Consultar um agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent pause": {
    description: { en: "Pause an agent", "pt-BR": "Pausar um agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent resume": {
    description: { en: "Resume an agent", "pt-BR": "Retomar um agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent approve": {
    description: { en: "Approve a pending agent", "pt-BR": "Aprovar um agente pendente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent terminate": {
    description: { en: "Terminate an agent", "pt-BR": "Encerrar um agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent me": {
    description: {
      en: "Show the current agent identity",
      "pt-BR": "Mostrar a identidade do agente atual",
    },
    options: commonClientOptions,
  },
  "agent inbox": {
    description: {
      en: "List current agent assigned inbox items",
      "pt-BR": "Listar tarefas atribuídas ao agente atual",
    },
    options: commonClientOptions,
  },
  "agent inbox-mine": {
    description: {
      en: "List the current agent's inbox items touched or archived by a board user",
      "pt-BR": "Listar tarefas do agente atual com atividade ou arquivadas por um usuário do board",
    },
    options: {
      ...commonClientOptions,
      "--user-id": { en: "Board user ID", "pt-BR": "ID do usuário do board" },
      "--status": {
        en: "Comma-separated issue statuses",
        "pt-BR": "Status das tarefas separados por vírgulas",
      },
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
      for (const argument of command.registeredArguments) {
        const description = help.arguments?.[argument.name()]?.[locale];
        if (description) argument.description = description;
      }
    }
    for (const child of command.commands) visit(child, parts);
  };
  visit(root, []);
}
