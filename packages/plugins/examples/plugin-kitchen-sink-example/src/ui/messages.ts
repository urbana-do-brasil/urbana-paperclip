import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";

type CountLabel = (count: number) => string;

/**
 * Copy owned by the Kitchen Sink example UI. Values returned by Paperclip,
 * editable demo payloads, IDs, routes, statuses, and protocol names stay raw.
 */
export interface KitchenSinkMessages {
  overview: string;
  loadingOverview: string;
  paperclipDomainApis: string;
  loadingValue: string;
  requestFailed: (status: number) => string;
  selectCompanyForPluginConfig: string;
  selectCompanyToSavePluginConfig: string;
  demoEventFallback: string;
  printWorkspacePath: string;
  listWorkspaceFiles: string;
  gitStatusCommand: string;
  runtimeSummary: string;
  quickActions: string;
  tryIt: string;
  companies: string;
  projects: string;
  issues: string;
  agents: string;
  goals: string;
  entities: string;
  companyCount: CountLabel;
  projectCount: CountLabel;
  issueCount: CountLabel;
  agentCount: CountLabel;
  jobCount: CountLabel;
  webhookCount: CountLabel;
  toolCount: CountLabel;
  launcherCount: CountLabel;
  successToast: string;
  successToastBody: string;
  warningToast: string;
  warningToastBody: string;
  openDashboardToast: string;
  openDashboardToastBody: string;
  go: string;
  successToastButton: string;
  warningToastButton: string;
  actionToastButton: string;
  emitEvent: string;
  startStream: string;
  writeMetric: string;
  recentProgressEvents: CountLabel;
  progressStreamUpdate: string;
  progressStep: (step: number | string) => string;
  eventEmitted: string;
  eventFailed: string;
  streamStarted: string;
  streamStartedBody: string;
  streamFailed: string;
  metricRecorded: string;
  metricRecordedBody: (value: number) => string;
  metricFailed: string;
  surfaceMap: string;
  ui: string;
  sidebarAndPanel: string;
  dashboardWidget: string;
  projectSurfaces: string;
  issueSurfaces: string;
  commentSurfaces: string;
  manifestCoverage: string;
  worker: string;
  latestRuntimeState: string;
  diagnostics: string;
  runtimeStateDescription: string;
  issueCrud: string;
  issueCrudDescription: string;
  selectCompanyForIssues: string;
  issueTitle: string;
  goalTitle: string;
  issueDescription: string;
  issueStatusBacklog: string;
  issueStatusTodo: string;
  issueStatusInProgress: string;
  issueStatusInReview: string;
  issueStatusDone: string;
  issueStatusBlocked: string;
  issueStatusCancelled: string;
  companyStatusActive: string;
  companyStatusPaused: string;
  companyStatusArchived: string;
  companyStatus: string;
  createIssue: string;
  loadingIssues: string;
  save: string;
  delete: string;
  issueStatus: string;
  noIssues: string;
  issueCreated: string;
  issueCreateFailed: string;
  issueUpdated: string;
  issueUpdateFailed: string;
  issueDeleted: string;
  issueDeleteFailed: string;
  companyCrud: string;
  companyCrudDescription: string;
  currentCompany: string;
  noCurrentCompany: string;
  demoCompanyPlaceholder: string;
  createDemoCompany: string;
  loadingCompanies: string;
  currentCompanyCannotDelete: string;
  noDemoCompanies: string;
  createCompanyAbove: string;
  demoCompanyCreated: string;
  companyCreateFailed: string;
  companyUpdated: string;
  companyUpdateFailed: string;
  demoCompanyDeleted: string;
  companyDeleteFailed: string;
  embeddedAppDemo: string;
  embeddedAppDescription: string;
  pluginPageRoute: string;
  pluginPageRouteDescription: string;
  paperclipAnimation: string;
  paperclipAnimationDescription: string;
  pluginStorage: string;
  pluginStorageDescription: string;
  selectCompanyForStorage: string;
  storedAt: (companyId: string, stateKey: string) => string;
  reset: string;
  storageWriteFailed: string;
  revenueCounterReset: string;
  storageResetFailed: string;
  hostIntegrations: string;
  hostIntegrationsDescription: string;
  companyRoute: string;
  mountedCompanyRoute: string;
  selectCompanyForRuns: string;
  liveRuns: string;
  refresh: string;
  loadingRunData: string;
  noLiveRuns: string;
  openRun: string;
  recentHeartbeats: string;
  noRecentHeartbeatRuns: string;
  sharedHostPickers: string;
  sharedHostPickersDescription: string;
  selectCompanyForPickers: string;
  selectedAssignee: string;
  selectedProject: string;
  noneSelected: string;
  openPluginPage: string;
  openProjectTab: string;
  openSelectedIssue: string;
  loadMore: string;
  noCompanies: string;
  noProjects: string;
  noGoals: string;
  unknown: string;
  issueGoalActions: string;
  advanceSelectedIssue: string;
  moveToInReview: string;
  createGoal: string;
  advanceSelectedGoal: string;
  moveToActive: string;
  stateAndEntities: string;
  scopeIdOptional: string;
  namespaceOptional: string;
  stateKey: string;
  writeState: string;
  deleteState: string;
  upsertEntity: string;
  eventsAndStreams: string;
  emitDemoEvent: string;
  startProgressStream: string;
  progressStream: string;
  recentRecords: string;
  httpSecretsActivityMetrics: string;
  http: string;
  fetchUrl: string;
  secrets: string;
  resolveSecretRef: string;
  activityAndMetrics: string;
  metricName: string;
  metricValue: string;
  writeActivity: string;
  workspaceAndProcess: string;
  selectProjectWorkspace: string;
  selectProject: string;
  selectWorkspace: string;
  workspaceFile: string;
  workspaceContent: string;
  stateValue: string;
  toolMessage: string;
  writeScratchFile: string;
  readFile: string;
  curatedProcessDemo: string;
  runCommand: string;
  agentsAndSessions: string;
  agentControls: string;
  invoke: string;
  pause: string;
  resume: string;
  agentChatStream: string;
  startChatDemo: string;
  jobsWebhooksTools: string;
  jobDemo: string;
  triggerDemoJob: string;
  webhookDemo: string;
  sendDemoWebhook: string;
  toolDispatcherDemo: string;
  runEchoTool: string;
  runSummaryTool: string;
  runCreateIssueTool: string;
  latestResult: string;
  runActionForResults: string;
  noProcessRun: string;
  noJobOutput: string;
  noWebhook: string;
  noToolOutput: string;
  selectCompanyProjectAgent: string;
  noPluginJobs: string;
  settingsLoading: string;
  saved: string;
  about: string;
  aboutDescription: string;
  currentCompanyContext: string;
  dangerTrustModel: string;
  trustModelDescription: string;
  settings: string;
  showSidebarEntry: string;
  showSidebarPanel: string;
  showProjectSidebarItem: string;
  showCommentAnnotation: string;
  showCommentContextAction: string;
  enableWorkspaceDemos: string;
  enableProcessDemos: string;
  httpDemoUrl: string;
  secretReferenceExample: string;
  workspaceScratchFile: string;
  saving: string;
  saveSettings: string;
  companySettingsSlot: string;
  mountedInsideCompanySettings: string;
  companySettingsDescription: string;
  pluginRuntimeSurfaceDescription: string;
  openPage: string;
  sidebarEntryName: string;
  sidebarPanelTitle: string;
  recentPluginRecords: CountLabel;
  projectDetailTab: string;
  issueDetailTab: string;
  taskDetailView: string;
  surfaceDemoDescription: string;
  recordDemoMetric: string;
  toolbarAction: string;
  contextAction: string;
  commentLength: string;
  copiedCount: string;
  copied: string;
  copyToKitchenSink: string;
  launcherModal: string;
  launcherModalDescription: string;
  noRenderEnvironment: string;
  plugin: string;
  version: string;
  company: string;
  entity: string;
}

const en: KitchenSinkMessages = {
  overview: "Overview",
  loadingOverview: "Loading overview…",
  paperclipDomainApis: "Paperclip Domain APIs",
  loadingValue: "loading",
  requestFailed: (status) => `Request failed: ${status}`,
  selectCompanyForPluginConfig: "Select a company before loading plugin config.",
  selectCompanyToSavePluginConfig: "Select a company before saving plugin config.",
  demoEventFallback: "Demo event emitted",
  printWorkspacePath: "Print workspace path",
  listWorkspaceFiles: "List workspace files",
  gitStatusCommand: "Git status",
  runtimeSummary: "Runtime Summary",
  quickActions: "Quick Actions",
  tryIt: "Try It",
  companies: "Companies",
  projects: "Projects",
  issues: "Issues",
  agents: "Agents",
  goals: "Goals",
  entities: "Entities",
  companyCount: (count) => `${count} ${count === 1 ? "company" : "companies"}`,
  projectCount: (count) => `${count} ${count === 1 ? "project" : "projects"}`,
  issueCount: (count) => `${count} ${count === 1 ? "issue" : "issues"}`,
  agentCount: (count) => `${count} ${count === 1 ? "agent" : "agents"}`,
  jobCount: (count) => `${count} ${count === 1 ? "job" : "jobs"}`,
  webhookCount: (count) => `${count} ${count === 1 ? "webhook" : "webhooks"}`,
  toolCount: (count) => `${count} ${count === 1 ? "tool" : "tools"}`,
  launcherCount: (count) => `${count} ${count === 1 ? "launcher" : "launchers"}`,
  successToast: "Kitchen Sink success toast",
  successToastBody: "This is rendered by the host toast system from plugin UI.",
  warningToast: "Kitchen Sink warning toast",
  warningToastBody: "Use this pattern for user-facing plugin feedback.",
  openDashboardToast: "Open dashboard",
  openDashboardToastBody: "Toasts can link back into host pages.",
  go: "Go",
  successToastButton: "Success toast",
  warningToastButton: "Warning toast",
  actionToastButton: "Action toast",
  emitEvent: "Emit event",
  startStream: "Start stream",
  writeMetric: "Write metric",
  recentProgressEvents: (count) => `Recent progress events: ${count}`,
  progressStreamUpdate: "Progress stream update",
  progressStep: (step) => `Step ${step}`,
  eventEmitted: "Event emitted",
  eventFailed: "Event failed",
  streamStarted: "Stream started",
  streamStartedBody: "Watch the live progress updates below.",
  streamFailed: "Stream failed",
  metricRecorded: "Metric recorded",
  metricRecordedBody: (value) => `Recorded demo.page_quick_action = ${value}`,
  metricFailed: "Metric failed",
  surfaceMap: "Surface Map",
  ui: "UI",
  sidebarAndPanel: "Sidebar link and panel",
  dashboardWidget: "Dashboard widget",
  projectSurfaces: "Project link, tab, toolbar button, launcher",
  issueSurfaces: "Issue tab, task view, toolbar button, launcher",
  commentSurfaces: "Comment annotation and comment action",
  manifestCoverage: "Manifest Coverage",
  worker: "Worker",
  latestRuntimeState: "Latest Runtime State",
  diagnostics: "Diagnostics",
  runtimeStateDescription: "This updates as you use the worker demos below.",
  issueCrud: "Issue CRUD",
  issueCrudDescription: "This is a regular embedded React page inside Paperclip calling the board API directly. It creates, updates, and deletes issues for the current company.",
  selectCompanyForIssues: "Select a company to use issue demos.",
  issueTitle: "Issue title",
  goalTitle: "Goal title",
  issueDescription: "Issue description",
  issueStatusBacklog: "backlog",
  issueStatusTodo: "todo",
  issueStatusInProgress: "in_progress",
  issueStatusInReview: "in_review",
  issueStatusDone: "done",
  issueStatusBlocked: "blocked",
  issueStatusCancelled: "cancelled",
  companyStatusActive: "active",
  companyStatusPaused: "paused",
  companyStatusArchived: "archived",
  companyStatus: "Company status",
  createIssue: "Create issue",
  loadingIssues: "Loading issues…",
  save: "Save",
  delete: "Delete",
  issueStatus: "Issue status",
  noIssues: "No issues yet for this company.",
  issueCreated: "Issue created",
  issueCreateFailed: "Issue create failed",
  issueUpdated: "Issue updated",
  issueUpdateFailed: "Issue update failed",
  issueDeleted: "Issue deleted",
  issueDeleteFailed: "Issue delete failed",
  companyCrud: "Company CRUD",
  companyCrudDescription: "The worker SDK currently exposes company reads. This page shows a pragmatic embedded-app pattern for broader board actions by calling the host REST API directly.",
  currentCompany: "Current Company",
  noCurrentCompany: "No current company selected",
  demoCompanyPlaceholder: "Kitchen Sink Demo Company",
  createDemoCompany: "Create demo company",
  loadingCompanies: "Loading companies…",
  currentCompanyCannotDelete: "Current company cannot be deleted from this demo.",
  noDemoCompanies: "No demo companies yet.",
  createCompanyAbove: "Create one above and manage it from this page.",
  demoCompanyCreated: "Demo company created",
  companyCreateFailed: "Company create failed",
  companyUpdated: "Company updated",
  companyUpdateFailed: "Company update failed",
  demoCompanyDeleted: "Demo company deleted",
  companyDeleteFailed: "Company delete failed",
  embeddedAppDemo: "Embedded App Demo",
  embeddedAppDescription: "Plugins can host their own React page and behave like a native company page. Kitchen Sink uses this route as a practical demo app, then keeps the lower-level worker console below for the rest of the SDK surface.",
  pluginPageRoute: "Plugin Page Route",
  pluginPageRouteDescription: "The company sidebar entry opens this route directly, so the plugin feels like a first-class company page instead of a settings subpage.",
  paperclipAnimation: "Paperclip Animation",
  paperclipAnimationDescription: "This is the same Paperclip ASCII treatment used in onboarding, copied into the example plugin so the package stays self-contained.",
  pluginStorage: "Plugin Storage",
  pluginStorageDescription: "This clicker persists into plugin-scoped company storage. A real revenue plugin could store counters, sync cursors, or cached external IDs the same way.",
  selectCompanyForStorage: "Select a company to use company-scoped plugin storage.",
  storedAt: (companyId, stateKey) => `Stored at company/${companyId}/${stateKey}`,
  reset: "Reset",
  storageWriteFailed: "Storage write failed",
  revenueCounterReset: "Revenue counter reset",
  storageResetFailed: "Storage reset failed",
  hostIntegrations: "Host Integrations",
  hostIntegrationsDescription: "Plugin pages can feel like native Paperclip pages. This section demonstrates host toasts, company-scoped routing, and reading live heartbeat data from the embedded page.",
  companyRoute: "Company Route",
  mountedCompanyRoute: "This page is mounted as a real company route instead of living only under /plugins/:pluginId.",
  selectCompanyForRuns: "Select a company to read run data.",
  liveRuns: "Live Runs",
  refresh: "Refresh",
  loadingRunData: "Loading run data…",
  noLiveRuns: "No live runs right now.",
  openRun: "Open run",
  recentHeartbeats: "Recent Heartbeats",
  noRecentHeartbeatRuns: "No recent heartbeat runs.",
  sharedHostPickers: "Shared Host Pickers",
  sharedHostPickersDescription: "These controls are imported from @paperclipai/plugin-sdk/ui and reuse the host's assignee and project pickers from the new issue pane.",
  selectCompanyForPickers: "Select a company to load picker options.",
  selectedAssignee: "Selected assignee",
  selectedProject: "selected project",
  noneSelected: "none",
  openPluginPage: "Open plugin page",
  openProjectTab: "Open project tab",
  openSelectedIssue: "Open selected issue",
  loadMore: "Load 20 more",
  noCompanies: "No companies.",
  noProjects: "No projects.",
  noGoals: "No goals.",
  unknown: "unknown",
  issueGoalActions: "Issue + Goal Actions",
  advanceSelectedIssue: "Advance selected issue",
  moveToInReview: "Move to in_review",
  createGoal: "Create goal",
  advanceSelectedGoal: "Advance selected goal",
  moveToActive: "Move to active",
  stateAndEntities: "State + Entities",
  scopeIdOptional: "scopeId (optional)",
  namespaceOptional: "namespace (optional)",
  stateKey: "stateKey",
  writeState: "Write state",
  deleteState: "Delete state",
  upsertEntity: "Upsert entity",
  eventsAndStreams: "Events + Streams",
  emitDemoEvent: "Emit demo event",
  startProgressStream: "Start progress stream",
  progressStream: "Progress stream",
  recentRecords: "Recent records",
  httpSecretsActivityMetrics: "HTTP + Secrets + Activity + Metrics",
  http: "HTTP",
  fetchUrl: "Fetch URL",
  secrets: "Secrets",
  resolveSecretRef: "Resolve secret ref",
  activityAndMetrics: "Activity + Metrics",
  metricName: "metric name",
  metricValue: "metric value",
  writeActivity: "Write activity",
  workspaceAndProcess: "Workspace + Process",
  selectProjectWorkspace: "Select project/workspace",
  selectProject: "Select project",
  selectWorkspace: "Select workspace",
  workspaceFile: "Workspace file",
  workspaceContent: "Workspace file content",
  stateValue: "State value (JSON)",
  toolMessage: "Tool message",
  writeScratchFile: "Write scratch file",
  readFile: "Read file",
  curatedProcessDemo: "Curated process demo",
  runCommand: "Run command",
  agentsAndSessions: "Agents + Sessions",
  agentControls: "Agent controls",
  invoke: "Invoke",
  pause: "Pause",
  resume: "Resume",
  agentChatStream: "Agent chat stream",
  startChatDemo: "Start chat demo",
  jobsWebhooksTools: "Jobs + Webhooks + Tools",
  jobDemo: "Job demo",
  triggerDemoJob: "Trigger demo job",
  webhookDemo: "Webhook demo",
  sendDemoWebhook: "Send demo webhook",
  toolDispatcherDemo: "Tool dispatcher demo",
  runEchoTool: "Run echo tool",
  runSummaryTool: "Run summary tool",
  runCreateIssueTool: "Run create-issue tool",
  latestResult: "Latest Result",
  runActionForResults: "Run an action to see results here.",
  noProcessRun: "No process run yet.",
  noJobOutput: "No job output yet.",
  noWebhook: "No webhook yet.",
  noToolOutput: "No tool output yet.",
  selectCompanyProjectAgent: "Select a company, project, and agent first.",
  noPluginJobs: "No plugin jobs returned by the host.",
  settingsLoading: "Loading plugin config…",
  saved: "Saved",
  about: "About",
  aboutDescription: "Kitchen Sink demonstrates the current Paperclip plugin API surface in one local, trusted example. It intentionally includes domain mutations, event handling, streams, tools, jobs, webhooks, and local workspace/process demos.",
  currentCompanyContext: "Current company context",
  dangerTrustModel: "Danger / Trust Model",
  trustModelDescription: "Workspace and process demos run as trusted local code. Keep process demos off unless you explicitly want to exercise local child process behavior.",
  settings: "Settings",
  showSidebarEntry: "Show sidebar entry",
  showSidebarPanel: "Show sidebar panel",
  showProjectSidebarItem: "Show project sidebar item",
  showCommentAnnotation: "Show comment annotation",
  showCommentContextAction: "Show comment context action",
  enableWorkspaceDemos: "Enable workspace demos",
  enableProcessDemos: "Enable curated process demos",
  httpDemoUrl: "HTTP demo URL",
  secretReferenceExample: "Secret reference example",
  workspaceScratchFile: "Workspace scratch file",
  saving: "Saving…",
  saveSettings: "Save settings",
  companySettingsSlot: "Company Settings Slot",
  mountedInsideCompanySettings: "Mounted inside company settings",
  companySettingsDescription: "This fixture proves a ready plugin can add a settings sidebar item and render with company context.",
  pluginRuntimeSurfaceDescription: "Plugin runtime surface demo for the current company.",
  openPage: "Open page",
  sidebarEntryName: "Kitchen Sink",
  sidebarPanelTitle: "Kitchen Sink Panel",
  recentPluginRecords: (count) => `Recent plugin records: ${count}`,
  projectDetailTab: "Project Detail Tab",
  issueDetailTab: "Issue Detail Tab",
  taskDetailView: "Task Detail View",
  surfaceDemoDescription: "This surface demo shows the host context for the current mount point. The metric button records a demo counter so you can verify plugin metrics wiring from a contextual surface.",
  recordDemoMetric: "Record demo metric",
  toolbarAction: "Kitchen Sink Action",
  contextAction: "Kitchen Sink Context",
  commentLength: "Comment length",
  copiedCount: "Copied count",
  copied: "Copied",
  copyToKitchenSink: "Copy To Kitchen Sink",
  launcherModal: "Kitchen Sink Launcher Modal",
  launcherModalDescription: "This export exists so launcher infrastructure has a concrete modal target.",
  noRenderEnvironment: "No render environment metadata.",
  plugin: "Plugin",
  version: "Version",
  company: "Company",
  entity: "Entity",
};

const ptBR: KitchenSinkMessages = {
  overview: "Visão geral",
  loadingOverview: "Carregando visão geral…",
  paperclipDomainApis: "APIs de domínio do Paperclip",
  loadingValue: "carregando",
  requestFailed: (status) => `A solicitação falhou: ${status}`,
  selectCompanyForPluginConfig: "Selecione uma empresa antes de carregar a configuração do plugin.",
  selectCompanyToSavePluginConfig: "Selecione uma empresa antes de salvar a configuração do plugin.",
  demoEventFallback: "Evento de demonstração emitido",
  printWorkspacePath: "Imprimir caminho do espaço de trabalho",
  listWorkspaceFiles: "Listar arquivos do espaço de trabalho",
  gitStatusCommand: "Status do Git",
  runtimeSummary: "Resumo do runtime",
  quickActions: "Ações rápidas",
  tryIt: "Experimente",
  companies: "Empresas",
  projects: "Projetos",
  issues: "Tarefas",
  agents: "Agentes",
  goals: "Objetivos",
  entities: "Entidades",
  companyCount: (count) => `${count} ${count === 1 ? "empresa" : "empresas"}`,
  projectCount: (count) => `${count} ${count === 1 ? "projeto" : "projetos"}`,
  issueCount: (count) => `${count} ${count === 1 ? "tarefa" : "tarefas"}`,
  agentCount: (count) => `${count} ${count === 1 ? "agente" : "agentes"}`,
  jobCount: (count) => `${count} ${count === 1 ? "job" : "jobs"}`,
  webhookCount: (count) => `${count} ${count === 1 ? "webhook" : "webhooks"}`,
  toolCount: (count) => `${count} ${count === 1 ? "ferramenta" : "ferramentas"}`,
  launcherCount: (count) => `${count} ${count === 1 ? "launcher" : "launchers"}`,
  successToast: "Notificação de sucesso do Kitchen Sink",
  successToastBody: "Esta notificação é renderizada pelo host a partir da interface do plugin.",
  warningToast: "Notificação de aviso do Kitchen Sink",
  warningToastBody: "Use este padrão para mensagens destinadas a quem usa o plugin.",
  openDashboardToast: "Abrir painel",
  openDashboardToastBody: "Notificações podem levar de volta às páginas do host.",
  go: "Ir",
  successToastButton: "Notificação de sucesso",
  warningToastButton: "Notificação de aviso",
  actionToastButton: "Notificação com ação",
  emitEvent: "Emitir evento",
  startStream: "Iniciar stream",
  writeMetric: "Registrar métrica",
  recentProgressEvents: (count) => `Eventos recentes de progresso: ${count}`,
  progressStreamUpdate: "Atualização do stream de progresso",
  progressStep: (step) => `Etapa ${step}`,
  eventEmitted: "Evento emitido",
  eventFailed: "Falha ao emitir evento",
  streamStarted: "Stream iniciado",
  streamStartedBody: "Acompanhe abaixo as atualizações de progresso em tempo real.",
  streamFailed: "Falha no stream",
  metricRecorded: "Métrica registrada",
  metricRecordedBody: (value) => `Contador demo.page_quick_action registrado: ${value}`,
  metricFailed: "Falha ao registrar métrica",
  surfaceMap: "Mapa de superfícies",
  ui: "Interface",
  sidebarAndPanel: "Link e painel da barra lateral",
  dashboardWidget: "Widget do painel",
  projectSurfaces: "Link, aba, botão de ação e launcher do projeto",
  issueSurfaces: "Aba, visualização de tarefa, botão de ação e launcher da tarefa",
  commentSurfaces: "Anotação e ação de comentário",
  manifestCoverage: "Cobertura do manifesto",
  worker: "Worker",
  latestRuntimeState: "Estado mais recente do runtime",
  diagnostics: "Diagnósticos",
  runtimeStateDescription: "Este estado é atualizado conforme você usa as demonstrações do worker abaixo.",
  issueCrud: "CRUD de tarefas",
  issueCrudDescription: "Esta é uma página React incorporada ao Paperclip que chama diretamente a API do painel. Ela cria, atualiza e exclui tarefas da empresa atual.",
  selectCompanyForIssues: "Selecione uma empresa para usar as demonstrações de tarefas.",
  issueTitle: "Título da tarefa",
  goalTitle: "Título do objetivo",
  issueDescription: "Descrição da tarefa",
  issueStatusBacklog: "Fila de espera",
  issueStatusTodo: "A fazer",
  issueStatusInProgress: "Em andamento",
  issueStatusInReview: "Em revisão",
  issueStatusDone: "Concluída",
  issueStatusBlocked: "Bloqueada",
  issueStatusCancelled: "Cancelada",
  companyStatusActive: "Ativa",
  companyStatusPaused: "Pausada",
  companyStatusArchived: "Arquivada",
  companyStatus: "Status da empresa",
  createIssue: "Criar tarefa",
  loadingIssues: "Carregando tarefas…",
  save: "Salvar",
  delete: "Excluir",
  issueStatus: "Status da tarefa",
  noIssues: "Ainda não há tarefas nesta empresa.",
  issueCreated: "Tarefa criada",
  issueCreateFailed: "Falha ao criar tarefa",
  issueUpdated: "Tarefa atualizada",
  issueUpdateFailed: "Falha ao atualizar tarefa",
  issueDeleted: "Tarefa excluída",
  issueDeleteFailed: "Falha ao excluir tarefa",
  companyCrud: "CRUD de empresas",
  companyCrudDescription: "O SDK do worker atualmente permite ler empresas. Esta página demonstra um padrão prático de app incorporado para outras ações do painel, chamando diretamente a API REST do host.",
  currentCompany: "Empresa atual",
  noCurrentCompany: "Nenhuma empresa selecionada",
  demoCompanyPlaceholder: "Kitchen Sink Demo Company",
  createDemoCompany: "Criar empresa de demonstração",
  loadingCompanies: "Carregando empresas…",
  currentCompanyCannotDelete: "Esta demonstração não permite excluir a empresa atual.",
  noDemoCompanies: "Ainda não há empresas de demonstração.",
  createCompanyAbove: "Crie uma acima e gerencie-a nesta página.",
  demoCompanyCreated: "Empresa de demonstração criada",
  companyCreateFailed: "Falha ao criar empresa",
  companyUpdated: "Empresa atualizada",
  companyUpdateFailed: "Falha ao atualizar empresa",
  demoCompanyDeleted: "Empresa de demonstração excluída",
  companyDeleteFailed: "Falha ao excluir empresa",
  embeddedAppDemo: "Demonstração de app incorporado",
  embeddedAppDescription: "Plugins podem hospedar sua própria página React e funcionar como uma página nativa da empresa. O Kitchen Sink usa esta rota como um app de demonstração e mantém abaixo o console do worker para mostrar as demais superfícies do SDK.",
  pluginPageRoute: "Rota da página do plugin",
  pluginPageRouteDescription: "O link da barra lateral da empresa abre esta rota diretamente. Assim, o plugin funciona como uma página da empresa, em vez de uma subpágina de configurações.",
  paperclipAnimation: "Animação do Paperclip",
  paperclipAnimationDescription: "Este é o mesmo desenho ASCII do Paperclip usado no onboarding. Ele foi copiado para o plugin de exemplo para que o pacote permaneça independente.",
  pluginStorage: "Armazenamento do plugin",
  pluginStorageDescription: "Este contador é salvo no armazenamento do plugin, com escopo da empresa. Um plugin de receita poderia guardar contadores, cursores de sincronização ou IDs externos em cache da mesma forma.",
  selectCompanyForStorage: "Selecione uma empresa para usar o armazenamento com escopo da empresa.",
  storedAt: (companyId, stateKey) => `Armazenado em company/${companyId}/${stateKey}`,
  reset: "Zerar",
  storageWriteFailed: "Falha ao gravar no armazenamento",
  revenueCounterReset: "Contador de receita zerado",
  storageResetFailed: "Falha ao zerar o armazenamento",
  hostIntegrations: "Integrações com o host",
  hostIntegrationsDescription: "Páginas de plugin podem funcionar como páginas nativas do Paperclip. Esta seção demonstra notificações do host, rotas com escopo de empresa e leitura de execuções em tempo real pela página incorporada.",
  companyRoute: "Rota da empresa",
  mountedCompanyRoute: "Esta página usa uma rota real da empresa, em vez de existir apenas em /plugins/:pluginId.",
  selectCompanyForRuns: "Selecione uma empresa para ler os dados das execuções.",
  liveRuns: "Execuções em andamento",
  refresh: "Atualizar",
  loadingRunData: "Carregando dados das execuções…",
  noLiveRuns: "Não há execuções em andamento.",
  openRun: "Abrir execução",
  recentHeartbeats: "Heartbeats recentes",
  noRecentHeartbeatRuns: "Não há execuções recentes de heartbeat.",
  sharedHostPickers: "Seletores compartilhados do host",
  sharedHostPickersDescription: "Estes controles são importados de @paperclipai/plugin-sdk/ui e reutilizam os seletores de responsável e projeto do painel de criação de tarefas.",
  selectCompanyForPickers: "Selecione uma empresa para carregar as opções dos seletores.",
  selectedAssignee: "Responsável selecionado",
  selectedProject: "projeto selecionado",
  noneSelected: "nenhum",
  openPluginPage: "Abrir página do plugin",
  openProjectTab: "Abrir aba do projeto",
  openSelectedIssue: "Abrir tarefa selecionada",
  loadMore: "Carregar mais 20",
  noCompanies: "Nenhuma empresa.",
  noProjects: "Nenhum projeto.",
  noGoals: "Nenhum objetivo.",
  unknown: "desconhecido",
  issueGoalActions: "Ações de tarefas e objetivos",
  advanceSelectedIssue: "Avançar tarefa selecionada",
  moveToInReview: "Mover para in_review",
  createGoal: "Criar objetivo",
  advanceSelectedGoal: "Avançar objetivo selecionado",
  moveToActive: "Mover para active",
  stateAndEntities: "Estado e entidades",
  scopeIdOptional: "scopeId (opcional)",
  namespaceOptional: "namespace (opcional)",
  stateKey: "stateKey",
  writeState: "Gravar estado",
  deleteState: "Excluir estado",
  upsertEntity: "Criar ou atualizar entidade",
  eventsAndStreams: "Eventos e streams",
  emitDemoEvent: "Emitir evento de demonstração",
  startProgressStream: "Iniciar stream de progresso",
  progressStream: "Stream de progresso",
  recentRecords: "Registros recentes",
  httpSecretsActivityMetrics: "HTTP, segredos, atividade e métricas",
  http: "HTTP",
  fetchUrl: "Consultar URL",
  secrets: "Segredos",
  resolveSecretRef: "Resolver referência de segredo",
  activityAndMetrics: "Atividade e métricas",
  metricName: "nome da métrica",
  metricValue: "valor da métrica",
  writeActivity: "Registrar atividade",
  workspaceAndProcess: "Espaço de trabalho e processo",
  selectProjectWorkspace: "Selecionar projeto/espaço de trabalho",
  selectProject: "Selecionar projeto",
  selectWorkspace: "Selecionar espaço de trabalho",
  workspaceFile: "Arquivo do espaço de trabalho",
  workspaceContent: "Conteúdo do arquivo do espaço de trabalho",
  stateValue: "Valor do estado (JSON)",
  toolMessage: "Mensagem da ferramenta",
  writeScratchFile: "Gravar arquivo temporário",
  readFile: "Ler arquivo",
  curatedProcessDemo: "Demonstração de processo predefinido",
  runCommand: "Executar comando",
  agentsAndSessions: "Agentes e sessões",
  agentControls: "Controles do agente",
  invoke: "Acionar",
  pause: "Pausar",
  resume: "Retomar",
  agentChatStream: "Stream de conversa do agente",
  startChatDemo: "Iniciar demonstração de conversa",
  jobsWebhooksTools: "Jobs, webhooks e ferramentas",
  jobDemo: "Demonstração de job",
  triggerDemoJob: "Acionar job de demonstração",
  webhookDemo: "Demonstração de webhook",
  sendDemoWebhook: "Enviar webhook de demonstração",
  toolDispatcherDemo: "Demonstração do despachante de ferramentas",
  runEchoTool: "Executar ferramenta echo",
  runSummaryTool: "Executar ferramenta de resumo",
  runCreateIssueTool: "Executar ferramenta create-issue",
  latestResult: "Resultado mais recente",
  runActionForResults: "Execute uma ação para ver os resultados aqui.",
  noProcessRun: "Nenhum processo foi executado ainda.",
  noJobOutput: "Ainda não há resultado de job.",
  noWebhook: "Ainda não há webhook.",
  noToolOutput: "Ainda não há resultado de ferramenta.",
  selectCompanyProjectAgent: "Selecione primeiro uma empresa, um projeto e um agente.",
  noPluginJobs: "O host não retornou jobs do plugin.",
  settingsLoading: "Carregando configuração do plugin…",
  saved: "Salvo",
  about: "Sobre",
  aboutDescription: "O Kitchen Sink demonstra as superfícies atuais da API de plugins do Paperclip em um único exemplo local e confiável. Ele inclui alterações no domínio, tratamento de eventos, streams, ferramentas, jobs, webhooks e demonstrações locais de espaço de trabalho e processos.",
  currentCompanyContext: "Contexto da empresa atual",
  dangerTrustModel: "Risco e modelo de confiança",
  trustModelDescription: "As demonstrações de espaço de trabalho e processos executam código local confiável. Mantenha as demonstrações de processo desativadas, a menos que queira testar explicitamente a execução local de processos filhos.",
  settings: "Configurações",
  showSidebarEntry: "Mostrar item na barra lateral",
  showSidebarPanel: "Mostrar painel da barra lateral",
  showProjectSidebarItem: "Mostrar item do projeto na barra lateral",
  showCommentAnnotation: "Mostrar anotação de comentário",
  showCommentContextAction: "Mostrar ação no menu de comentário",
  enableWorkspaceDemos: "Ativar demonstrações do espaço de trabalho",
  enableProcessDemos: "Ativar demonstrações de processos predefinidos",
  httpDemoUrl: "URL de demonstração HTTP",
  secretReferenceExample: "Exemplo de referência de segredo",
  workspaceScratchFile: "Arquivo temporário do espaço de trabalho",
  saving: "Salvando…",
  saveSettings: "Salvar configurações",
  companySettingsSlot: "Slot de configurações da empresa",
  mountedInsideCompanySettings: "Montado nas configurações da empresa",
  companySettingsDescription: "Este exemplo comprova que um plugin pronto pode adicionar um item à barra lateral de configurações e renderizar com o contexto da empresa.",
  pluginRuntimeSurfaceDescription: "Demonstração da superfície de runtime do plugin para a empresa atual.",
  openPage: "Abrir página",
  sidebarEntryName: "Kitchen Sink",
  sidebarPanelTitle: "Painel Kitchen Sink",
  recentPluginRecords: (count) => `Registros recentes do plugin: ${count}`,
  projectDetailTab: "Aba de detalhes do projeto",
  issueDetailTab: "Aba de detalhes da tarefa",
  taskDetailView: "Visualização de detalhes da tarefa",
  surfaceDemoDescription: "Esta demonstração mostra o contexto do host no ponto de montagem atual. O botão de métrica registra um contador de demonstração para você conferir a integração de métricas do plugin nesta superfície.",
  recordDemoMetric: "Registrar métrica de demonstração",
  toolbarAction: "Ação do Kitchen Sink",
  contextAction: "Contexto do Kitchen Sink",
  commentLength: "Tamanho do comentário",
  copiedCount: "Quantidade de cópias",
  copied: "Copiado",
  copyToKitchenSink: "Copiar para Kitchen Sink",
  launcherModal: "Modal do launcher Kitchen Sink",
  launcherModalDescription: "Esta exportação fornece um destino concreto para o modal da infraestrutura de launcher.",
  noRenderEnvironment: "Sem metadados do ambiente de renderização.",
  plugin: "Plugin",
  version: "Versão",
  company: "Empresa",
  entity: "Entidade",
};

export function messagesFor(locale: PluginHostContext["locale"]): KitchenSinkMessages {
  return locale === "pt-BR" ? ptBR : en;
}

export function issueStatusOptions(locale: PluginHostContext["locale"]) {
  const messages = messagesFor(locale);
  return [
    { value: "backlog", label: messages.issueStatusBacklog },
    { value: "todo", label: messages.issueStatusTodo },
    { value: "in_progress", label: messages.issueStatusInProgress },
    { value: "in_review", label: messages.issueStatusInReview },
    { value: "done", label: messages.issueStatusDone },
    { value: "blocked", label: messages.issueStatusBlocked },
    { value: "cancelled", label: messages.issueStatusCancelled },
  ] as const;
}

export function companyStatusOptions(locale: PluginHostContext["locale"]) {
  const messages = messagesFor(locale);
  return [
    { value: "active", label: messages.companyStatusActive },
    { value: "paused", label: messages.companyStatusPaused },
    { value: "archived", label: messages.companyStatusArchived },
  ] as const;
}
