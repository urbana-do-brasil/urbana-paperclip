import path from "node:path";
import { CONNECTION_INTENT_AGENT_GUIDANCE } from "@paperclipai/shared";
import { DEFAULT_USER_LOCALE, isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";
import { expandHomePrefix } from "../config/home.js";
import { readRawProfileLocale } from "../client/context.js";
import type { Command, Option } from "commander";

export const cliMessageCatalog = {
  en: {
    description: "Paperclip CLI — setup, diagnose, and configure your instance",
    languageOption: "Language for this invocation: pt-BR or en (does not save the profile)",
    localeOption: "Save profile language: pt-BR or en (independent of the web account)",
    helpCommand: "Display help for a command",
    versionOption: "Output the version number",
    invalid: "Invalid language. Use pt-BR or en.",
    apiError: "API error",
    usage: "Usage:", arguments: "Arguments:", options: "Options:", globalOptions: "Global Options:", commands: "Commands:",
    emptyList: "(empty)",
    emptyValue: "(null)",
    issueListIdentifier: "Identifier",
    issueListId: "ID",
    issueListStatus: "Status",
    issueListPriority: "Priority",
    issueListTitle: "Title",
    issueListAssigneeAgentId: "Assignee agent ID",
    issueListProjectId: "Project ID",
    issueCreateStandaloneParentConflict: "--standalone cannot be combined with --parent-id",
    issueInvalidInteger: "Invalid integer value: {value}",
    issueDeleteNeedsYes: "Refusing to delete without --yes",
    projectListId: "ID",
    projectListName: "Name",
    projectListStatus: "Status",
    projectListUrlKey: "URL key",
    projectListGoalIds: "Goal IDs",
    projectListLeadAgentId: "Lead agent ID",
    projectDeleteNeedsYes: "Deletion requires --yes.",
    projectInvalidJson: "Invalid JSON: {error}",
    goalListId: "ID",
    goalListStatus: "Status",
    goalListTitle: "Title",
    goalListLevel: "Level",
    goalListParentId: "Parent goal ID",
    goalListOwnerAgentId: "Owner agent ID",
    goalDeleteNeedsYes: "Deletion requires --yes.",
    approvalListId: "ID",
    approvalListType: "Type",
    approvalListStatus: "Status",
    approvalListRequestedByAgentId: "Requested by agent ID",
    approvalListRequestedByUserId: "Requested by user ID",
    activityListId: "ID",
    activityListAction: "Action",
    activityListActorType: "Actor type",
    activityListActorId: "Actor ID",
    activityListEntityType: "Entity type",
    activityListEntityId: "Entity ID",
    activityListCreatedAt: "Created at",
    runListId: "ID",
    runListStatus: "Status",
    runListAgentId: "Agent ID",
    runListInvocationSource: "Invocation source",
    runListTriggerDetail: "Trigger detail",
    runListStartedAt: "Started at",
    runListFinishedAt: "Finished at",
    runListLogBytes: "Log bytes",
    runEventSeq: "Sequence",
    runEventType: "Event type",
    runEventStream: "Stream",
    runEventLevel: "Level",
    runEventMessage: "Message",
    runIssueIdentifier: "Identifier",
    runIssuePriority: "Priority",
    runIssueTitle: "Title",
    runIssueRunStatus: "Run status",
    runWorkspacePhase: "Phase",
    runWorkspaceCommand: "Command",
    runWorkspaceCwd: "Working directory",
    tokenAgentCreateFailed: "Failed to create agent API key",
    tokenAgentReferenceRequired: "Agent reference is required",
    tokenAgentNotFound: "Agent not found: {agentRef}",
    tokenAgentListId: "ID",
    tokenAgentListName: "Name",
    tokenAgentListCreatedAt: "Created at",
    tokenAgentListRevokedAt: "Revoked at",
    tokenBoardCreateFailed: "Failed to create board API key",
    tokenBoardInvalidExpiresAt: "Invalid --expires-at value: {value}",
    tokenBoardInvalidTtlDays: "Invalid --ttl-days value: {value}",
    tokenBoardListId: "ID",
    tokenBoardListName: "Name",
    tokenBoardListCreatedAt: "Created at",
    tokenBoardListLastUsedAt: "Last used at",
    tokenBoardListExpiresAt: "Expires at",
    tokenBoardListRevokedAt: "Revoked at",
    agentInboxIdentifier: "Identifier",
    agentInboxId: "ID",
    agentInboxName: "Name",
    agentInboxStatus: "Status",
    agentInboxPriority: "Priority",
    agentInboxTitle: "Title",
    agentInboxProjectId: "Project ID",
    agentListId: "ID",
    agentListName: "Name",
    agentListRole: "Role",
    agentListStatus: "Status",
    agentListReportsTo: "Reports to",
    agentListMonthlyBudget: "Monthly budget (cents)",
    agentListMonthlySpent: "Monthly spend (cents)",
    agentConfigurationOutput: "Agent configuration (secrets redacted):",
    agentConfigRevisionsOutput: "Agent configuration revisions:",
    agentConfigRevisionOutput: "Agent configuration revision:",
    agentConfigRevisionRollbackOutput: "Agent configuration rolled back to revision",
    agentRuntimeStateOutput: "Agent runtime state:",
    agentTaskSessionsOutput: "Agent task sessions:",
    agentLocalCliShellInstruction: "# Run this in your shell before launching codex/claude:",
    companyCurrentUnavailable: "Current company is not available. Pass --company-id, set PAPERCLIP_COMPANY_ID, set a context profile companyId, or authenticate with an agent API key.",
    companyCreatePermissionRequired: "Creating companies requires board/instance-admin authentication. Agent API keys are scoped to one company; use `paperclipai company list --json` or `paperclipai company current --json` to select the scoped company, or rerun create with a board token/login.",
    connectionRuntimeRequired: "This command requires the runtime connection environment from an active heartbeat run",
    connectionRuntimeRequestFailedStatus: "Runtime connection request failed with {status}",
    connectionGuidance: CONNECTION_INTENT_AGENT_GUIDANCE,
  },
  "pt-BR": {
    description: "CLI do Paperclip — instale, diagnostique e configure sua instância",
    languageOption: "Idioma desta execução: pt-BR ou en (não altera o perfil)",
    localeOption: "Salvar idioma do perfil: pt-BR ou en (independente da conta web)",
    helpCommand: "Mostrar ajuda de um comando",
    versionOption: "Mostrar a versão",
    invalid: "Idioma inválido. Use pt-BR ou en.",
    apiError: "Erro de API",
    usage: "Uso:", arguments: "Argumentos:", options: "Opções:", globalOptions: "Opções globais:", commands: "Comandos:",
    emptyList: "(vazio)",
    emptyValue: "(nulo)",
    issueListIdentifier: "Identificador",
    issueListId: "ID",
    issueListStatus: "Status",
    issueListPriority: "Prioridade",
    issueListTitle: "Título",
    issueListAssigneeAgentId: "ID do agente responsável",
    issueListProjectId: "ID do projeto",
    issueCreateStandaloneParentConflict: "--standalone não pode ser usado junto com --parent-id",
    issueInvalidInteger: "Valor inteiro inválido: {value}",
    issueDeleteNeedsYes: "Informe --yes para confirmar a exclusão",
    projectListId: "ID",
    projectListName: "Nome",
    projectListStatus: "Status",
    projectListUrlKey: "Chave de URL",
    projectListGoalIds: "IDs de metas",
    projectListLeadAgentId: "ID do agente responsável",
    projectDeleteNeedsYes: "A exclusão requer --yes.",
    projectInvalidJson: "JSON inválido: {error}",
    goalListId: "ID",
    goalListStatus: "Status",
    goalListTitle: "Título",
    goalListLevel: "Nível",
    goalListParentId: "ID da meta pai",
    goalListOwnerAgentId: "ID do agente responsável",
    goalDeleteNeedsYes: "A exclusão requer --yes.",
    approvalListId: "ID",
    approvalListType: "Tipo",
    approvalListStatus: "Status",
    approvalListRequestedByAgentId: "Solicitado pelo ID do agente",
    approvalListRequestedByUserId: "Solicitado pelo ID do usuário",
    activityListId: "ID",
    activityListAction: "Ação",
    activityListActorType: "Tipo de ator",
    activityListActorId: "ID do ator",
    activityListEntityType: "Tipo de entidade",
    activityListEntityId: "ID da entidade",
    activityListCreatedAt: "Criado em",
    runListId: "ID",
    runListStatus: "Status",
    runListAgentId: "ID do agente",
    runListInvocationSource: "Origem da invocação",
    runListTriggerDetail: "Detalhe do acionador",
    runListStartedAt: "Iniciado em",
    runListFinishedAt: "Concluído em",
    runListLogBytes: "Bytes de log",
    runEventSeq: "Sequência",
    runEventType: "Tipo do evento",
    runEventStream: "Fluxo",
    runEventLevel: "Nível",
    runEventMessage: "Mensagem",
    runIssueIdentifier: "Identificador",
    runIssuePriority: "Prioridade",
    runIssueTitle: "Título",
    runIssueRunStatus: "Status da execução",
    runWorkspacePhase: "Fase",
    runWorkspaceCommand: "Comando",
    runWorkspaceCwd: "Diretório de trabalho",
    tokenAgentCreateFailed: "Não foi possível criar a chave de API do agente",
    tokenAgentReferenceRequired: "Informe a referência do agente",
    tokenAgentNotFound: "Agente não encontrado: {agentRef}",
    tokenAgentListId: "ID",
    tokenAgentListName: "Nome",
    tokenAgentListCreatedAt: "Criado em",
    tokenAgentListRevokedAt: "Revogado em",
    tokenBoardCreateFailed: "Não foi possível criar a chave de API do board",
    tokenBoardInvalidExpiresAt: "Valor inválido para --expires-at: {value}",
    tokenBoardInvalidTtlDays: "Valor inválido para --ttl-days: {value}",
    tokenBoardListId: "ID",
    tokenBoardListName: "Nome",
    tokenBoardListCreatedAt: "Criado em",
    tokenBoardListLastUsedAt: "Último uso em",
    tokenBoardListExpiresAt: "Expira em",
    tokenBoardListRevokedAt: "Revogado em",
    agentInboxIdentifier: "Identificador",
    agentInboxId: "ID",
    agentInboxName: "Nome",
    agentInboxStatus: "Status",
    agentInboxPriority: "Prioridade",
    agentInboxTitle: "Título",
    agentInboxProjectId: "ID do projeto",
    agentListId: "ID",
    agentListName: "Nome",
    agentListRole: "Papel",
    agentListStatus: "Status",
    agentListReportsTo: "Reporta a",
    agentListMonthlyBudget: "Orçamento mensal (centavos)",
    agentListMonthlySpent: "Gasto mensal (centavos)",
    agentConfigurationOutput: "Configuração do agente (segredos ocultos):",
    agentConfigRevisionsOutput: "Revisões da configuração do agente:",
    agentConfigRevisionOutput: "Revisão da configuração do agente:",
    agentConfigRevisionRollbackOutput: "Configuração do agente restaurada para a revisão",
    agentRuntimeStateOutput: "Estado de runtime do agente:",
    agentTaskSessionsOutput: "Sessões de tarefas do agente:",
    agentLocalCliShellInstruction: "# Execute no seu shell antes de iniciar codex/claude:",
    companyCurrentUnavailable: "A organização atual não está disponível. Informe --company-id, defina PAPERCLIP_COMPANY_ID, configure companyId em um perfil de contexto ou autentique-se com uma chave de API de agente.",
    companyCreatePermissionRequired: "Para criar organizações é necessária autenticação board/instance-admin. Chaves de API de agente são limitadas a uma organização; use `paperclipai company list --json` ou `paperclipai company current --json` para selecionar a organização do escopo, ou execute create novamente com um token do board/login.",
    connectionRuntimeRequired: "Este comando exige o ambiente de conexões do runtime em uma execução ativa de heartbeat",
    connectionRuntimeRequestFailedStatus: "A solicitação de conexão do runtime falhou com status {status}",
    connectionGuidance: [
      "Ferramentas de conexão:",
      "- Quando o usuário pedir para conectar um serviço, chame `connections_search` antes de qualquer ferramenta do serviço, mesmo que ele já esteja instalado. Pesquise também quando uma tarefa precisar de um serviço e não houver certeza de que o acesso está disponível. Pesquise pelo nome ou capacidade e siga a `instruction` retornada.",
      "- Use os identificadores de serviço retornados e as ferramentas de conexão para configurar o acesso. Respeite as escolhas registradas do usuário; nunca invente acesso nem peça credenciais em comentários.",
      "- Se as ferramentas instaladas estiverem Off ou a conexão não estiver habilitada para este agente, chame `connection_request` com o `connectionId` salvo e os `toolNames` necessários. Isso cria um cartão de acesso com aprovação humana; nunca substitua por uma pergunta genérica de permissão nem altere permissões por conta própria.",
      "- Enquanto aguarda uma ação do usuário, conclua o trabalho independente e depois ceda o controle sem tentar novamente nem consultar repetidamente. Ao continuar, siga o resultado registrado e use a conexão instalada.",
      "- Não use ferramentas de conexão para URLs arbitrárias de MCP nem para trabalhos sem relação.",
    ].join("\n"),
  },
} as const;

type MessageKey = keyof typeof cliMessageCatalog.en;
let currentLocale: SupportedLocale = DEFAULT_USER_LOCALE;
let commandLineShape: Command | undefined;
export function getCliLocale(): SupportedLocale { return currentLocale; }
export function cliMessage(
  key: MessageKey,
  values?: Readonly<Record<string, string | number>>,
  locale: SupportedLocale = currentLocale,
): string {
  let message: string = cliMessageCatalog[locale][key];
  for (const [name, value] of Object.entries(values ?? {})) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}
export function setCliLocale(locale: SupportedLocale): void { currentLocale = locale; }
export function setCliCommandLineShape(command?: Command): void { commandLineShape = command; }

/** Check only CLI options; an external command after `--` owns its flags. */
export function isCliJsonRequested(argv: readonly string[] = process.argv.slice(2)): boolean {
  return earlyOptions(argv, commandLineShape).json;
}

/** Never include the supplied value in an error: it can be a mistaken secret. */
export function parseCliLocale(value: unknown): SupportedLocale {
  if (!isSupportedLocale(value)) throw new Error(cliMessage("invalid"));
  return value;
}

/** Read option values without consuming arguments after the end-of-options marker. */
function earlyOptions(argv: readonly string[], root?: Command) {
  const values: { lang?: string; context?: string; profile?: string; dataDir?: string; json: boolean } = { json: false };
  const names = { "--lang": "lang", "--context": "context", "--profile": "profile", "--data-dir": "dataDir", "-d": "dataDir" } as const;
  let command = root;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]!;
    if (arg === "--") break;
    const equals = arg.indexOf("=");
    // Commander accepts a required short option with an attached value (-dfoo).
    const attachedDataDir = arg.startsWith("-d") && !arg.startsWith("--") && arg.length > 2;
    const option = attachedDataDir ? "-d" : equals === -1 ? arg : arg.slice(0, equals);
    const name = names[option as keyof typeof names];
    let known: Option | undefined;
    for (let scope = command; scope && !known; scope = scope.parent ?? undefined) {
      known = scope.options.find((item) => item.long === option || item.short === option);
    }
    if (root && !known && !arg.startsWith("-")) {
      command = command?.commands.find((child) => child.name() === arg || child.aliases().includes(arg)) ?? command;
      continue;
    }
    if (option === "--json" && (!root || known)) { values.json = true; continue; }
    if (!name && !known) continue;
    const requiresValue = known?.required ?? Boolean(name);
    const acceptsValue = requiresValue || known?.optional;
    const value = attachedDataDir ? arg.slice(2) : equals !== -1 ? arg.slice(equals + 1)
      : requiresValue ? argv[++index]
        : acceptsValue && argv[index + 1] && !argv[index + 1]!.startsWith("-") ? argv[++index] : undefined;
    if (name) values[name] = value ?? "";
  }
  return values;
}

/** Runs before Commander processes help or invokes any mutating action. */
export function resolveCliLocale(argv: readonly string[], environment: NodeJS.ProcessEnv = process.env, root?: Command): SupportedLocale {
  const options = earlyOptions(argv, root);
  if (options.lang !== undefined) return parseCliLocale(options.lang);
  if (environment.PAPERCLIP_LANG !== undefined) return parseCliLocale(environment.PAPERCLIP_LANG);
  const contextPath = options.context || environment.PAPERCLIP_CONTEXT
    || (options.dataDir ? path.resolve(expandHomePrefix(options.dataDir), "context.json") : undefined);
  const stored = readRawProfileLocale(contextPath, options.profile);
  return stored === undefined ? DEFAULT_USER_LOCALE : parseCliLocale(stored);
}

/** Translate Commander-owned headings while preserving command names/flags. */
export function localizeHelpTitle(title: string): string {
  const keys: Record<string, MessageKey> = {
    "Usage:": "usage", "Arguments:": "arguments", "Options:": "options",
    "Global Options:": "globalOptions", "Commands:": "commands",
  };
  return keys[title] ? cliMessage(keys[title]) : title;
}
