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

const companySkillOptions = {
  ...commonClientOptions,
  "--company-id": { en: "Company ID (overrides context default)", "pt-BR": "ID da organização (substitui o padrão do contexto)" },
};
const skillReferenceArgument = { skillRef: { en: "Company skill ID, key, or unique slug", "pt-BR": "ID, chave ou slug exclusivo da skill da organização" } };
const skillIdArgument = { skillId: { en: "Skill ID", "pt-BR": "ID da skill" } };
const catalogReferenceArgument = { catalogRef: { en: "Catalog skill ID, key, or unique slug", "pt-BR": "ID, chave ou slug exclusivo da skill do catálogo" } };

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
  "agent create": {
    description: {
      en: "Create an agent from a JSON payload",
      "pt-BR": "Criar um agente a partir de um payload JSON",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--payload-json": { en: "CreateAgent JSON payload", "pt-BR": "Payload JSON de CreateAgent" },
    },
  },
  "agent hire": {
    description: {
      en: "Create an agent hire request",
      "pt-BR": "Criar uma solicitação de contratação de agente",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--payload-json": { en: "CreateAgentHire JSON payload", "pt-BR": "Payload JSON de CreateAgentHire" },
    },
  },
  "agent update": {
    description: {
      en: "Update an agent from a JSON payload",
      "pt-BR": "Atualizar um agente a partir de um payload JSON",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "UpdateAgent JSON payload", "pt-BR": "Payload JSON de UpdateAgent" },
    },
  },
  "agent delete": {
    description: { en: "Delete an agent", "pt-BR": "Excluir um agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--yes": { en: "Confirm deletion", "pt-BR": "Confirmar exclusão" },
    },
  },
  "agent permissions:update": {
    description: { en: "Update agent permissions", "pt-BR": "Atualizar as permissões do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "UpdateAgentPermissions JSON payload", "pt-BR": "Payload JSON de UpdateAgentPermissions" },
    },
  },
  "agent heartbeat:invoke": {
    description: { en: "Invoke an agent heartbeat", "pt-BR": "Invocar um heartbeat do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent claude-login": {
    description: { en: "Trigger Claude login for an agent", "pt-BR": "Iniciar o login do Claude para um agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
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
  "agent runtime-state": {
    description: {
      en: "Get agent runtime state",
      "pt-BR": "Consultar o estado de runtime do agente",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent runtime-state:reset-session": {
    description: {
      en: "Reset an agent runtime session",
      "pt-BR": "Redefinir uma sessão de runtime do agente",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--task-key": {
        en: "Specific task session key",
        "pt-BR": "Chave específica da sessão da tarefa",
      },
    },
  },
  "agent task-sessions": {
    description: {
      en: "List agent task sessions",
      "pt-BR": "Listar sessões de tarefas do agente",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent skills": {
    description: { en: "List agent skills", "pt-BR": "Listar skills do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent skills:sync": {
    description: { en: "Sync desired skills onto an agent", "pt-BR": "Sincronizar as skills desejadas no agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--desired-skills": { en: "Comma-separated desired skill names", "pt-BR": "Nomes das skills desejadas, separados por vírgulas" },
      "--mode": { en: "Merge mode: add keeps other skills; remove deletes only named skills; replace overwrites the complete set", "pt-BR": "Modo de mesclagem: add mantém as demais skills; remove exclui apenas as indicadas; replace substitui o conjunto completo" },
    },
  },
  "agent instructions-bundle": {
    description: { en: "Get an agent instructions bundle", "pt-BR": "Consultar o pacote de instruções do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent instructions-file:get": {
    description: { en: "Get an agent instructions file", "pt-BR": "Consultar um arquivo de instruções do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--path": { en: "Bundle-relative file path", "pt-BR": "Caminho do arquivo relativo ao pacote de instruções" },
    },
  },
  "agent instructions-file:put": {
    description: { en: "Create or update an agent instructions file", "pt-BR": "Criar ou atualizar um arquivo de instruções do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--path": { en: "Bundle-relative file path", "pt-BR": "Caminho do arquivo relativo ao pacote de instruções" },
      "--content": { en: "File content", "pt-BR": "Conteúdo do arquivo" },
      "--content-file": { en: "Read file content from disk", "pt-BR": "Ler o conteúdo do arquivo do disco" },
      "--clear-legacy-prompt-template": { en: "Clear legacy prompt template", "pt-BR": "Limpar o template de prompt legado" },
    },
  },
  "agent instructions-file:delete": {
    description: { en: "Delete an agent instructions file", "pt-BR": "Excluir um arquivo de instruções do agente" },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--path": { en: "Bundle-relative file path", "pt-BR": "Caminho do arquivo relativo ao pacote de instruções" },
    },
  },
  "agent instructions-path:update": {
    description: {
      en: "Update an agent instructions path. Process adapters require adapterConfigKey and relative paths require adapterConfig.cwd.",
      "pt-BR": "Atualizar o caminho de instruções do agente. Adapters process exigem adapterConfigKey; caminhos relativos exigem adapterConfig.cwd.",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--payload-json": {
        en: 'UpdateAgentInstructionsPath JSON payload, for example {"path":"/tmp/AGENTS.md","adapterConfigKey":"instructionsFilePath"}',
        "pt-BR": 'Payload JSON de UpdateAgentInstructionsPath, por exemplo {"path":"/tmp/AGENTS.md","adapterConfigKey":"instructionsFilePath"}',
      },
    },
  },
  skill: {
    description: { en: "Company skill operations", "pt-BR": "Operações de skills da organização" },
  },
  "skill list": {
    description: { en: "List company skills", "pt-BR": "Listar skills da organização" },
    options: companySkillOptions,
  },
  "skill get": {
    description: { en: "Get company skill details", "pt-BR": "Consultar detalhes de uma skill da organização" },
    arguments: skillIdArgument,
    options: companySkillOptions,
  },
  "skill file": {
    description: { en: "Read a company skill file", "pt-BR": "Ler um arquivo de skill da organização" },
    arguments: skillIdArgument,
    options: {
      ...companySkillOptions,
      "--path": { en: "Skill-relative file path", "pt-BR": "Caminho do arquivo relativo à skill" },
    },
  },
  "skill create": {
    description: { en: "Create a local company skill", "pt-BR": "Criar uma skill local da organização" },
    options: { ...companySkillOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "skill import": {
    description: { en: "Import company skills from a source", "pt-BR": "Importar skills para a organização a partir de uma origem" },
    options: { ...companySkillOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "skill scan-projects": {
    description: { en: "Scan project workspaces for company skills", "pt-BR": "Procurar skills da organização nos espaços de trabalho dos projetos" },
    options: { ...companySkillOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "skill file:update": {
    description: { en: "Update a company skill file", "pt-BR": "Atualizar um arquivo de skill da organização" },
    arguments: skillIdArgument,
    options: { ...companySkillOptions, "--payload-json": { en: "CompanySkillFileUpdate JSON payload", "pt-BR": "Payload JSON de CompanySkillFileUpdate" } },
  },
  "skill update-status": {
    description: { en: "Get company skill update status", "pt-BR": "Consultar o status de atualização da skill" },
    arguments: skillIdArgument,
    options: companySkillOptions,
  },
  "skill install-update": {
    description: { en: "Install an available company skill update", "pt-BR": "Instalar uma atualização disponível da skill" },
    arguments: skillIdArgument,
    options: companySkillOptions,
  },
  "skill delete": {
    description: { en: "Delete a company skill", "pt-BR": "Excluir uma skill da organização" },
    arguments: skillIdArgument,
    options: companySkillOptions,
  },
  skills: {
    description: { en: "Company and agent skill operations", "pt-BR": "Operações de skills de organizações e agentes" },
  },
  "skills browse": {
    description: { en: "Browse app-shipped catalog skills without installing them", "pt-BR": "Explorar skills incluídas no catálogo sem instalá-las" },
    options: {
      "--kind": { en: "Catalog kind filter (bundled or optional)", "pt-BR": "Filtrar pelo tipo do catálogo (bundled ou optional)" },
      "--category": { en: "Catalog category filter", "pt-BR": "Filtrar pela categoria do catálogo" },
      "--query": { en: "Search catalog text", "pt-BR": "Buscar texto no catálogo" },
      ...commonClientOptions,
    },
  },
  "skills search": {
    description: { en: "Search app-shipped catalog skills without installing them", "pt-BR": "Buscar skills incluídas no catálogo sem instalá-las" },
    arguments: { query: { en: "Search text", "pt-BR": "Texto da busca" } },
    options: {
      "--kind": { en: "Catalog kind filter (bundled or optional)", "pt-BR": "Filtrar pelo tipo do catálogo (bundled ou optional)" },
      "--category": { en: "Catalog category filter", "pt-BR": "Filtrar pela categoria do catálogo" },
      ...commonClientOptions,
    },
  },
  "skills inspect": {
    description: { en: "Inspect an app-shipped catalog skill before installing it", "pt-BR": "Inspecionar uma skill do catálogo antes de instalá-la" },
    arguments: catalogReferenceArgument,
    options: commonClientOptions,
  },
  "skills install": {
    description: { en: "Install a catalog skill into the company library; does not attach it to agents", "pt-BR": "Instalar uma skill do catálogo na biblioteca da organização; não a associa a agentes" },
    arguments: catalogReferenceArgument,
    options: {
      ...companySkillOptions,
      "--as": { en: "Company skill slug override", "pt-BR": "Slug da skill na organização" },
      "--force": { en: "Replace a same-key catalog-managed skill when the server allows it", "pt-BR": "Substituir uma skill gerenciada pelo catálogo com a mesma chave, se o servidor permitir" },
    },
  },
  "skills list": { description: { en: "List company skills", "pt-BR": "Listar skills da organização" }, options: companySkillOptions },
  "skills show": { description: { en: "Show company skill details", "pt-BR": "Mostrar detalhes de uma skill da organização" }, arguments: skillReferenceArgument, options: companySkillOptions },
  "skills file": {
    description: { en: "Print a company skill file", "pt-BR": "Exibir um arquivo de skill da organização" },
    arguments: skillReferenceArgument,
    options: { ...companySkillOptions, "--path": { en: "Relative file path", "pt-BR": "Caminho relativo do arquivo" } },
  },
  "skills import": {
    description: { en: "Import company skills from a local path, GitHub, skills.sh, or URL source", "pt-BR": "Importar skills de um caminho local, GitHub, skills.sh ou URL" },
    arguments: { source: { en: "Skill source", "pt-BR": "Origem da skill" } },
    options: companySkillOptions,
  },
  "skills create": {
    description: { en: "Create a managed local company skill", "pt-BR": "Criar uma skill local gerenciada da organização" },
    options: {
      ...companySkillOptions,
      "--name": { en: "Skill name", "pt-BR": "Nome da skill" },
      "--slug": { en: "Skill slug", "pt-BR": "Slug da skill" },
      "--description": { en: "Skill description", "pt-BR": "Descrição da skill" },
      "--body-file": { en: "Markdown body file; use - to read stdin", "pt-BR": "Arquivo Markdown do conteúdo; use - para ler de stdin" },
    },
  },
  "skills scan-projects": {
    description: { en: "Scan project workspaces for skills", "pt-BR": "Procurar skills nos espaços de trabalho dos projetos" },
    options: {
      ...companySkillOptions,
      "--project-id": { en: "Project ID to scan; may be repeated", "pt-BR": "ID do projeto a verificar; pode ser repetido" },
      "--workspace-id": { en: "Workspace ID to scan; may be repeated", "pt-BR": "ID do espaço de trabalho a verificar; pode ser repetido" },
    },
  },
  "skills check": { description: { en: "Check company skill update status", "pt-BR": "Verificar o status de atualização das skills da organização" }, arguments: skillReferenceArgument, options: companySkillOptions },
  "skills update": {
    description: { en: "Install company skill updates", "pt-BR": "Instalar atualizações de skills da organização" },
    arguments: skillReferenceArgument,
    options: {
      ...companySkillOptions,
      "--all": { en: "Check all skills and install available updates", "pt-BR": "Verificar todas as skills e instalar as atualizações disponíveis" },
      "--force": { en: "Discard local-modification or soft-audit holds; hard-stop audit findings still fail", "pt-BR": "Ignorar bloqueios por alterações locais ou avisos de auditoria; falhas críticas de auditoria continuam impedindo a atualização" },
    },
  },
  "skills audit": { description: { en: "Audit installed company skill bytes without executing them", "pt-BR": "Auditar os arquivos das skills instaladas sem executá-los" }, arguments: skillReferenceArgument, options: companySkillOptions },
  "skills reset": {
    description: { en: "Reset a catalog-managed company skill to its pinned installed origin", "pt-BR": "Restaurar uma skill gerenciada pelo catálogo à origem fixada na instalação" },
    arguments: skillReferenceArgument,
    options: { ...companySkillOptions, "--yes": { en: "Confirm reset without prompting", "pt-BR": "Confirmar a restauração sem perguntar" }, "--force": { en: "Discard local modifications or accept soft audit warnings; hard-stop audit findings still fail", "pt-BR": "Descartar alterações locais ou aceitar avisos de auditoria; falhas críticas de auditoria continuam impedindo a operação" } },
  },
  "skills remove": {
    description: { en: "Remove a company skill", "pt-BR": "Remover uma skill da organização" },
    arguments: skillReferenceArgument,
    options: { ...companySkillOptions, "--yes": { en: "Confirm removal without prompting", "pt-BR": "Confirmar a remoção sem perguntar" } },
  },
  "skills agent": {
    description: { en: "Agent desired-skill and runtime sync operations", "pt-BR": "Operações de skills desejadas e sincronização de runtime do agente" },
  },
  "skills agent list": {
    description: { en: "List an agent runtime skill snapshot", "pt-BR": "Listar o snapshot de skills do runtime de um agente" },
    arguments: { agentRef: { en: "Agent ID or shortname/url-key", "pt-BR": "ID ou nome curto/chave de URL do agente" } },
    options: companySkillOptions,
  },
  "skills agent sync": {
    description: { en: "Merge an agent's desired company skills and sync runtime state", "pt-BR": "Mesclar as skills desejadas da organização para um agente e sincronizar o estado do runtime" },
    arguments: { agentRef: { en: "Agent ID or shortname/url-key", "pt-BR": "ID ou nome curto/chave de URL do agente" } },
    options: {
      ...companySkillOptions,
      "--skill": { en: "Desired company skill ID, key, or slug; may be repeated", "pt-BR": "ID, chave ou slug da skill desejada; pode ser repetido" },
      "--mode": { en: "Merge mode: add keeps other skills; remove deletes only named skills; replace destructively overwrites the complete set", "pt-BR": "Modo de mesclagem: add mantém as demais skills; remove exclui apenas as indicadas; replace substitui o conjunto completo" },
    },
  },
  "skills agent clear": {
    description: { en: "Clear an agent's desired company skills and sync runtime state", "pt-BR": "Limpar as skills desejadas da organização para um agente e sincronizar o estado do runtime" },
    arguments: { agentRef: { en: "Agent ID or shortname/url-key", "pt-BR": "ID ou nome curto/chave de URL do agente" } },
    options: { ...companySkillOptions, "--yes": { en: "Confirm clear without prompting", "pt-BR": "Confirmar a limpeza sem perguntar" } },
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
  "agent configuration": {
    description: {
      en: "Get redacted agent configuration",
      "pt-BR": "Consultar a configuração do agente com segredos ocultos",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent config-revisions": {
    description: {
      en: "List agent config revisions",
      "pt-BR": "Listar revisões da configuração do agente",
    },
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: commonClientOptions,
  },
  "agent config-revision:get": {
    description: {
      en: "Get one agent config revision",
      "pt-BR": "Consultar uma revisão da configuração do agente",
    },
    arguments: {
      agentId: { en: "Agent ID", "pt-BR": "ID do agente" },
      revisionId: { en: "Revision ID", "pt-BR": "ID da revisão" },
    },
    options: commonClientOptions,
  },
  "agent config-revision:rollback": {
    description: {
      en: "Roll an agent back to a config revision",
      "pt-BR": "Restaurar a configuração do agente para uma revisão",
    },
    arguments: {
      agentId: { en: "Agent ID", "pt-BR": "ID do agente" },
      revisionId: { en: "Revision ID", "pt-BR": "ID da revisão" },
    },
    options: commonClientOptions,
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
