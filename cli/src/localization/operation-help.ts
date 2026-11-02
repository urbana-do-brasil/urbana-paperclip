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
  health: {
    description: { en: "Check API health", "pt-BR": "Verificar a integridade da API" },
    options: commonClientOptions,
  },
  dashboard: {
    description: { en: "Dashboard summary operations", "pt-BR": "Operações de resumo do painel" },
  },
  "dashboard get": {
    description: {
      en: "Get dashboard summary for a company",
      "pt-BR": "Consultar o resumo do painel de uma organização",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  connections: {
    description: {
      en: "Search or request connections from an active heartbeat run",
      "pt-BR": "Pesquisar ou solicitar conexões durante uma execução ativa de heartbeat",
    },
  },
  "connections search": {
    description: {
      en: "Search available connections for a service or capability",
      "pt-BR": "Pesquisar conexões disponíveis por serviço ou capacidade",
    },
    arguments: { query: { en: "Service name or capability", "pt-BR": "Nome do serviço ou capacidade" } },
    options: {
      "--retry-provider-choice": {
        en: "Reconsider a provider choice only at the user’s explicit request",
        "pt-BR": "Reavaliar uma escolha de provedor somente a pedido explícito do usuário",
      },
      "--json": { en: "Print formatted JSON", "pt-BR": "Exibir JSON formatado" },
    },
  },
  "connections request": {
    description: {
      en: "Request a connection to a service",
      "pt-BR": "Solicitar conexão com um serviço",
    },
    arguments: { service: { en: "Connectable service slug", "pt-BR": "Slug do serviço que pode ser conectado" } },
    options: {
      "--target-service": {
        en: "Requested app when the user explicitly names an external provider",
        "pt-BR": "Aplicativo solicitado quando o usuário mencionar explicitamente um provedor externo",
      },
      "--selection-interaction-id": {
        en: "Answered external-provider question ID",
        "pt-BR": "ID da pergunta sobre o provedor externo que já foi respondida",
      },
      "--json": { en: "Print formatted JSON", "pt-BR": "Exibir JSON formatado" },
    },
  },
  activity: {
    description: { en: "Activity log operations", "pt-BR": "Operações do registro de atividade" },
  },
  "activity list": {
    description: {
      en: "List company activity log entries",
      "pt-BR": "Listar entradas do registro de atividade da organização",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--agent-id": { en: "Filter by agent ID", "pt-BR": "Filtrar pelo ID do agente" },
      "--entity-type": { en: "Filter by entity type", "pt-BR": "Filtrar pelo tipo de entidade" },
      "--entity-id": { en: "Filter by entity ID", "pt-BR": "Filtrar pelo ID da entidade" },
    },
  },
  "activity create": {
    description: {
      en: "Create a company activity log entry",
      "pt-BR": "Criar uma entrada no registro de atividade da organização",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--payload-json": { en: "CreateActivity JSON payload", "pt-BR": "Payload JSON de CreateActivity" },
    },
  },
  "activity issue": {
    description: {
      en: "List activity for an issue",
      "pt-BR": "Listar a atividade de uma tarefa",
    },
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: commonClientOptions,
  },
  profile: {
    description: {
      en: "Current user profile operations",
      "pt-BR": "Operações do perfil do usuário atual",
    },
  },
  "profile session": {
    description: {
      en: "Get auth session",
      "pt-BR": "Consultar a sessão de autenticação",
    },
    options: commonClientOptions,
  },
  "profile get": {
    description: {
      en: "Get current auth profile",
      "pt-BR": "Consultar o perfil de autenticação atual",
    },
    options: commonClientOptions,
  },
  "profile update": {
    description: {
      en: "Update current auth profile",
      "pt-BR": "Atualizar o perfil de autenticação atual",
    },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  "profile company-user": {
    description: {
      en: "Get a user profile within a company",
      "pt-BR": "Consultar o perfil de um usuário em uma organização",
    },
    arguments: { userSlug: { en: "User slug", "pt-BR": "Slug do usuário" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  approval: {
    description: { en: "Approval operations", "pt-BR": "Operações de aprovação" },
  },
  "approval list": {
    description: { en: "List approvals for a company", "pt-BR": "Listar aprovações de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--status": { en: "Status filter", "pt-BR": "Filtro de status" },
    },
  },
  "approval get": {
    description: { en: "Get one approval", "pt-BR": "Consultar uma aprovação" },
    arguments: { approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" } },
    options: commonClientOptions,
  },
  "approval create": {
    description: { en: "Create an approval request", "pt-BR": "Criar uma solicitação de aprovação" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--type": {
        en: "Approval type (hire_agent|approve_ceo_strategy)",
        "pt-BR": "Tipo de aprovação (hire_agent|approve_ceo_strategy)",
      },
      "--payload": { en: "Approval payload as JSON object", "pt-BR": "Payload da aprovação como objeto JSON" },
      "--requested-by-agent-id": { en: "Requesting agent ID", "pt-BR": "ID do agente solicitante" },
      "--issue-ids": { en: "Comma-separated linked issue IDs", "pt-BR": "IDs das tarefas vinculadas, separados por vírgulas" },
    },
  },
  "approval approve": {
    description: { en: "Approve an approval request", "pt-BR": "Aprovar uma solicitação de aprovação" },
    arguments: { approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" } },
    options: {
      ...commonClientOptions,
      "--decision-note": { en: "Decision note", "pt-BR": "Nota da decisão" },
      "--decided-by-user-id": { en: "Decision actor user ID", "pt-BR": "ID do usuário responsável pela decisão" },
    },
  },
  "approval reject": {
    description: { en: "Reject an approval request", "pt-BR": "Rejeitar uma solicitação de aprovação" },
    arguments: { approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" } },
    options: {
      ...commonClientOptions,
      "--decision-note": { en: "Decision note", "pt-BR": "Nota da decisão" },
      "--decided-by-user-id": { en: "Decision actor user ID", "pt-BR": "ID do usuário responsável pela decisão" },
    },
  },
  "approval request-revision": {
    description: { en: "Request revision for an approval", "pt-BR": "Solicitar revisão de uma aprovação" },
    arguments: { approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" } },
    options: {
      ...commonClientOptions,
      "--decision-note": { en: "Decision note", "pt-BR": "Nota da decisão" },
      "--decided-by-user-id": { en: "Decision actor user ID", "pt-BR": "ID do usuário responsável pela decisão" },
    },
  },
  "approval resubmit": {
    description: {
      en: "Resubmit an approval (optionally with new payload)",
      "pt-BR": "Reenviar uma aprovação (opcionalmente com um novo payload)",
    },
    arguments: { approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" } },
    options: {
      ...commonClientOptions,
      "--payload": { en: "Payload JSON object", "pt-BR": "Payload como objeto JSON" },
    },
  },
  "approval comment": {
    description: { en: "Add comment to an approval", "pt-BR": "Adicionar comentário a uma aprovação" },
    arguments: { approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" } },
    options: {
      ...commonClientOptions,
      "--body": { en: "Comment body", "pt-BR": "Conteúdo do comentário" },
    },
  },
  goal: {
    description: { en: "Goal operations", "pt-BR": "Operações de metas" },
  },
  "project list": {
    description: { en: "List projects for a company", "pt-BR": "Listar projetos de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "project get": {
    description: { en: "Get one project by ID or shortname", "pt-BR": "Consultar um projeto por ID ou nome curto" },
    arguments: { project: { en: "Project ID or shortname", "pt-BR": "ID ou nome curto do projeto" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID for shortname lookup", "pt-BR": "ID da organização para buscar pelo nome curto" },
    },
  },
  "project create": {
    description: { en: "Create a project", "pt-BR": "Criar um projeto" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--name": { en: "Project name", "pt-BR": "Nome do projeto" },
      "--description": { en: "Project description", "pt-BR": "Descrição do projeto" },
      "--status": { en: "Project status", "pt-BR": "Status do projeto" },
      "--goal-id": { en: "Deprecated single goal ID", "pt-BR": "ID único de meta (obsoleto)" },
      "--goal-ids": { en: "Comma-separated goal IDs", "pt-BR": "IDs de metas separados por vírgulas" },
      "--lead-agent-id": { en: "Lead agent ID", "pt-BR": "ID do agente responsável" },
      "--target-date": { en: "Target date", "pt-BR": "Data de destino" },
      "--color": { en: "Project color", "pt-BR": "Cor do projeto" },
      "--env-json": { en: "Project env binding JSON", "pt-BR": "JSON de variáveis de ambiente do projeto" },
      "--execution-workspace-policy-json": { en: "Execution workspace policy JSON", "pt-BR": "JSON da política de espaço de execução" },
    },
  },
  "project update": {
    description: { en: "Update a project", "pt-BR": "Atualizar um projeto" },
    arguments: { project: { en: "Project ID or shortname", "pt-BR": "ID ou nome curto do projeto" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID for shortname lookup", "pt-BR": "ID da organização para buscar pelo nome curto" },
      "--name": { en: "Project name", "pt-BR": "Nome do projeto" },
      "--description": { en: "Project description", "pt-BR": "Descrição do projeto" },
      "--status": { en: "Project status", "pt-BR": "Status do projeto" },
      "--goal-id": { en: "Deprecated single goal ID", "pt-BR": "ID único de meta (obsoleto)" },
      "--goal-ids": { en: "Comma-separated goal IDs", "pt-BR": "IDs de metas separados por vírgulas" },
      "--lead-agent-id": { en: "Lead agent ID", "pt-BR": "ID do agente responsável" },
      "--target-date": { en: "Target date", "pt-BR": "Data de destino" },
      "--color": { en: "Project color", "pt-BR": "Cor do projeto" },
      "--env-json": { en: "Project env binding JSON", "pt-BR": "JSON de variáveis de ambiente do projeto" },
      "--execution-workspace-policy-json": { en: "Execution workspace policy JSON", "pt-BR": "JSON da política de espaço de execução" },
      "--archived-at": { en: "Archive timestamp or null", "pt-BR": "Timestamp de arquivamento ou null" },
    },
  },
  "project delete": {
    description: { en: "Delete a project", "pt-BR": "Excluir um projeto" },
    arguments: { project: { en: "Project ID or shortname", "pt-BR": "ID ou nome curto do projeto" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID for shortname lookup", "pt-BR": "ID da organização para buscar pelo nome curto" },
      "--yes": { en: "Confirm deletion", "pt-BR": "Confirmar exclusão" },
    },
  },
  "goal list": {
    description: { en: "List goals for a company", "pt-BR": "Listar metas de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "goal get": {
    description: { en: "Get one goal", "pt-BR": "Consultar uma meta" },
    arguments: { goalId: { en: "Goal ID", "pt-BR": "ID da meta" } },
    options: commonClientOptions,
  },
  "goal create": {
    description: { en: "Create a goal", "pt-BR": "Criar uma meta" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--title": { en: "Goal title", "pt-BR": "Título da meta" },
      "--description": { en: "Goal description", "pt-BR": "Descrição da meta" },
      "--level": { en: "Goal level", "pt-BR": "Nível da meta" },
      "--status": { en: "Goal status", "pt-BR": "Status da meta" },
      "--parent-id": { en: "Parent goal ID", "pt-BR": "ID da meta pai" },
      "--owner-agent-id": { en: "Owner agent ID", "pt-BR": "ID do agente responsável" },
    },
  },
  "goal update": {
    description: { en: "Update a goal", "pt-BR": "Atualizar uma meta" },
    arguments: { goalId: { en: "Goal ID", "pt-BR": "ID da meta" } },
    options: {
      ...commonClientOptions,
      "--title": { en: "Goal title", "pt-BR": "Título da meta" },
      "--description": { en: "Goal description", "pt-BR": "Descrição da meta" },
      "--level": { en: "Goal level", "pt-BR": "Nível da meta" },
      "--status": { en: "Goal status", "pt-BR": "Status da meta" },
      "--parent-id": { en: "Parent goal ID", "pt-BR": "ID da meta pai" },
      "--owner-agent-id": { en: "Owner agent ID", "pt-BR": "ID do agente responsável" },
    },
  },
  "goal delete": {
    description: { en: "Delete a goal", "pt-BR": "Excluir uma meta" },
    arguments: { goalId: { en: "Goal ID", "pt-BR": "ID da meta" } },
    options: {
      ...commonClientOptions,
      "--yes": { en: "Confirm deletion", "pt-BR": "Confirmar exclusão" },
    },
  },
  "issue list": {
    description: { en: "List issues for a company", "pt-BR": "Listar tarefas de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--status": { en: "Comma-separated statuses", "pt-BR": "Status separados por vírgulas" },
      "--assignee-agent-id": { en: "Filter by assignee agent ID", "pt-BR": "Filtrar pelo ID do agente responsável" },
      "--project-id": { en: "Filter by project ID", "pt-BR": "Filtrar pelo ID do projeto" },
      "--match": { en: "Local text match on identifier/title/description", "pt-BR": "Busca local no identificador/título/descrição" },
    },
  },
  "issue get": {
    description: {
      en: "Get an issue by UUID or identifier (e.g. PC-12)",
      "pt-BR": "Consultar uma tarefa por UUID ou identificador (ex.: PC-12)",
    },
    arguments: { idOrIdentifier: { en: "Issue ID or identifier", "pt-BR": "ID ou identificador da tarefa" } },
    options: commonClientOptions,
  },
  "issue create": {
    description: { en: "Create an issue", "pt-BR": "Criar uma tarefa" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--title": { en: "Issue title", "pt-BR": "Título da tarefa" },
      "--description": { en: "Issue description", "pt-BR": "Descrição da tarefa" },
      "--status": { en: "Issue status", "pt-BR": "Status da tarefa" },
      "--priority": { en: "Issue priority", "pt-BR": "Prioridade da tarefa" },
      "--assignee-agent-id": { en: "Assignee agent ID", "pt-BR": "ID do agente responsável" },
      "--project-id": { en: "Project ID", "pt-BR": "ID do projeto" },
      "--goal-id": { en: "Goal ID", "pt-BR": "ID da meta" },
      "--parent-id": { en: "Parent issue ID", "pt-BR": "ID da tarefa pai" },
      "--standalone": {
        en: "Create a top-level issue. Without --parent-id, an agent run's issue otherwise becomes the parent.",
        "pt-BR": "Criar uma tarefa de nível superior. Sem --parent-id, a tarefa da execução do agente será usada como tarefa pai.",
      },
      "--request-depth": { en: "Request depth integer", "pt-BR": "Profundidade da solicitação (inteiro)" },
      "--billing-code": { en: "Billing code", "pt-BR": "Código de faturamento" },
    },
  },
  "issue update": {
    description: { en: "Update an issue", "pt-BR": "Atualizar uma tarefa" },
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...commonClientOptions,
      "--title": { en: "Issue title", "pt-BR": "Título da tarefa" },
      "--description": { en: "Issue description", "pt-BR": "Descrição da tarefa" },
      "--status": { en: "Issue status", "pt-BR": "Status da tarefa" },
      "--priority": { en: "Issue priority", "pt-BR": "Prioridade da tarefa" },
      "--assignee-agent-id": { en: "Assignee agent ID", "pt-BR": "ID do agente responsável" },
      "--project-id": { en: "Project ID", "pt-BR": "ID do projeto" },
      "--goal-id": { en: "Goal ID", "pt-BR": "ID da meta" },
      "--parent-id": { en: "Parent issue ID", "pt-BR": "ID da tarefa pai" },
      "--request-depth": { en: "Request depth integer", "pt-BR": "Profundidade da solicitação (inteiro)" },
      "--billing-code": { en: "Billing code", "pt-BR": "Código de faturamento" },
      "--comment": { en: "Optional comment to add with update", "pt-BR": "Comentário opcional para adicionar junto com a atualização" },
      "--hidden-at": { en: "Set hiddenAt timestamp or literal 'null'", "pt-BR": "Definir o timestamp de hiddenAt ou o literal 'null'" },
    },
  },
  "issue delete": {
    description: { en: "Delete an issue", "pt-BR": "Excluir uma tarefa" },
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...commonClientOptions,
      "--yes": { en: "Confirm deletion", "pt-BR": "Confirmar exclusão" },
    },
  },
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
  token: {
    description: { en: "Manage Paperclip API tokens", "pt-BR": "Gerenciar tokens de API do Paperclip" },
  },
  "token agent": {
    description: { en: "Manage agent API keys", "pt-BR": "Gerenciar chaves de API de agentes" },
  },
  "token agent create": {
    description: { en: "Create an agent API key", "pt-BR": "Criar uma chave de API de agente" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--agent": { en: "Agent ID, shortname, or unambiguous name", "pt-BR": "ID, nome curto ou nome sem ambiguidade do agente" },
      "--name": { en: "API key label", "pt-BR": "Nome da chave de API" },
    },
  },
  "token agent list": {
    description: { en: "List agent API keys", "pt-BR": "Listar chaves de API de um agente" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--agent": { en: "Agent ID, shortname, or unambiguous name", "pt-BR": "ID, nome curto ou nome sem ambiguidade do agente" },
    },
  },
  "token agent revoke": {
    description: { en: "Revoke an agent API key", "pt-BR": "Revogar uma chave de API de agente" },
    arguments: { keyId: { en: "Agent API key ID", "pt-BR": "ID da chave de API do agente" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--agent": { en: "Agent ID, shortname, or unambiguous name", "pt-BR": "ID, nome curto ou nome sem ambiguidade do agente" },
    },
  },
  "token board": {
    description: { en: "Manage board API keys", "pt-BR": "Gerenciar chaves de API do board" },
  },
  "token board create": {
    description: { en: "Create a named board API key", "pt-BR": "Criar uma chave de API nomeada do board" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID used for audit context", "pt-BR": "ID da organização usada no contexto de auditoria" },
      "--name": { en: "API key label", "pt-BR": "Nome da chave de API" },
      "--expires-at": { en: "Expiration timestamp", "pt-BR": "Data e hora de expiração" },
      "--ttl-days": { en: "Expiration in days from now", "pt-BR": "Prazo de expiração em dias a partir de agora" },
      "--never-expires": { en: "Create a non-expiring key", "pt-BR": "Criar uma chave sem expiração" },
    },
  },
  "token board list": {
    description: { en: "List board API keys for the current board user", "pt-BR": "Listar as chaves de API do usuário atual do board" },
    options: commonClientOptions,
  },
  "token board revoke": {
    description: { en: "Revoke a board API key", "pt-BR": "Revogar uma chave de API do board" },
    arguments: { keyId: { en: "Board API key ID", "pt-BR": "ID da chave de API do board" } },
    options: commonClientOptions,
  },
  "board-claim": {
    description: { en: "Board claim token operations", "pt-BR": "Operações de reivindicação de acesso do board" },
  },
  "board-claim show": {
    description: { en: "Inspect a board claim token", "pt-BR": "Consultar um token de reivindicação do board" },
    arguments: { token: { en: "Claim token", "pt-BR": "Token de reivindicação" } },
    options: commonClientOptions,
  },
  "board-claim claim": {
    description: { en: "Claim a board claim token", "pt-BR": "Reivindicar um token de acesso do board" },
    arguments: { token: { en: "Claim token", "pt-BR": "Token de reivindicação" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "Claim JSON payload", "pt-BR": "Payload JSON de reivindicação" },
    },
  },
  "run list": {
    description: { en: "List heartbeat runs for a company", "pt-BR": "Listar execuções de heartbeat de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--agent-id": { en: "Filter by agent ID", "pt-BR": "Filtrar pelo ID do agente" },
      "--limit": { en: "Maximum runs to return", "pt-BR": "Número máximo de execuções retornadas" },
    },
  },
  "run live": {
    description: { en: "List queued and running heartbeat runs for a company", "pt-BR": "Listar execuções de heartbeat na fila ou em andamento de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--limit": { en: "Maximum runs to return", "pt-BR": "Número máximo de execuções retornadas" },
      "--min-count": { en: "Pad with recent completed runs up to this count", "pt-BR": "Completar com execuções recentes concluídas até esta quantidade" },
    },
  },
  "run events": {
    description: { en: "List heartbeat run events", "pt-BR": "Listar eventos de uma execução de heartbeat" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: {
      ...commonClientOptions,
      "--after-seq": { en: "Only return events after this sequence", "pt-BR": "Retornar somente eventos após esta sequência" },
      "--limit": { en: "Maximum events to return", "pt-BR": "Número máximo de eventos retornados" },
    },
  },
  "run get": {
    description: { en: "Get a heartbeat run", "pt-BR": "Consultar uma execução de heartbeat" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: commonClientOptions,
  },
  "run cancel": {
    description: { en: "Cancel a queued or running heartbeat run", "pt-BR": "Cancelar uma execução de heartbeat na fila ou em andamento" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: commonClientOptions,
  },
  "run issues": {
    description: { en: "List issues associated with a heartbeat run", "pt-BR": "Listar tarefas associadas a uma execução de heartbeat" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: commonClientOptions,
  },
  "run workspace-operations": {
    description: { en: "List workspace operations for a heartbeat run", "pt-BR": "Listar operações do espaço de trabalho de uma execução de heartbeat" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: commonClientOptions,
  },
  "run log": {
    description: { en: "Read heartbeat run log bytes", "pt-BR": "Ler bytes do log de uma execução de heartbeat" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: {
      ...commonClientOptions,
      "--offset": { en: "Byte offset", "pt-BR": "Deslocamento em bytes" },
      "--limit-bytes": { en: "Maximum bytes to read", "pt-BR": "Número máximo de bytes para leitura" },
      "--text": { en: "Print only the log text when the API returns a text field", "pt-BR": "Exibir somente o texto do log quando a API retornar um campo text" },
    },
  },
  "run workspace-log": {
    description: { en: "Read a workspace operation log", "pt-BR": "Ler o log de uma operação do espaço de trabalho" },
    arguments: { operationId: { en: "Workspace operation ID", "pt-BR": "ID da operação do espaço de trabalho" } },
    options: {
      ...commonClientOptions,
      "--offset": { en: "Byte offset", "pt-BR": "Deslocamento em bytes" },
      "--limit-bytes": { en: "Maximum bytes to read", "pt-BR": "Número máximo de bytes para leitura" },
      "--text": { en: "Print only the log text when the API returns a text field", "pt-BR": "Exibir somente o texto do log quando a API retornar um campo text" },
    },
  },
  "run watchdog-decision": {
    description: { en: "Record a watchdog decision for a heartbeat run", "pt-BR": "Registrar uma decisão do watchdog para uma execução de heartbeat" },
    arguments: { runId: { en: "Heartbeat run ID", "pt-BR": "ID da execução de heartbeat" } },
    options: {
      ...commonClientOptions,
      "--decision": { en: "snooze, continue, or dismissed_false_positive", "pt-BR": "snooze, continue ou dismissed_false_positive" },
      "--reason": { en: "Decision reason", "pt-BR": "Motivo da decisão" },
      "--snoozed-until": { en: "Required for snooze decisions", "pt-BR": "Obrigatório para decisões snooze" },
      "--evaluation-issue-id": { en: "Related watchdog evaluation issue ID", "pt-BR": "ID da tarefa de avaliação do watchdog relacionada" },
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
