import type { SupportedLocale } from "@paperclipai/shared/localization";
import { getCliLocale } from "./index.js";

export const worktreeOperationMessageCatalog = {
  en: {
    invalidSeedMode: 'Unsupported seed mode "{seedMode}". Expected one of: minimal, full.',
    configAlreadyExists: "Worktree config already exists at {configPath} or instance data exists at {instanceRoot}. Re-run with --force to replace it.",
    missingSourceConfig: "Cannot seed worktree database because source config was not found at {sourceConfigPath}. Use --no-seed or provide --from-config.",
    repoConfig: "Repo config:",
    repoEnv: "Repo env:",
    isolatedHome: "Isolated home:",
    instance: "Instance:",
    worktreeBadge: "Worktree badge:",
    serverPort: "Server port:",
    dbPort: "DB port:",
    mirroredGitHooks: "Mirrored git hooks:",
    seedStarting: "Seeding isolated worktree database from source instance ({seedMode})...",
    seedComplete: "Seeded isolated worktree database ({seedMode}).",
    seedFailed: "Failed to seed worktree database.",
    seedMode: "Seed mode:",
    seedSnapshot: "Seed snapshot:",
    seedExecutionQuarantine: "Seed execution quarantine:",
    preservedLiveWork: "Preserved copied live work; this worktree instance may auto-run source-instance assignments.",
    pausedScheduledRoutines: "Paused scheduled routines:",
    reboundWorkspace: "Rebound workspace {name}: {fromCwd} -> {toCwd}",
    disabledTimerHeartbeats: "disabled timer heartbeats: {count}",
    resetRunningAgents: "reset running agents: {count}",
    quarantinedInProgressIssues: "quarantined in-progress issues: {count}",
    unassignedTodoIssues: "unassigned todo issues: {count}",
    unassignedReviewIssues: "unassigned review issues: {count}",
    stoppedProjectWorkspaceRuntimes: "stopped project workspace runtimes: {count}",
    stoppedExecutionWorkspaceRuntimes: "stopped execution workspace runtimes: {count}",
    stoppedRuntimeServices: "stopped runtime services: {count}",
    worktreeReady: "Worktree ready. Run Paperclip inside this repo and the CLI/server will use {instanceId} automatically.",
  },
  "pt-BR": {
    invalidSeedMode: 'Modo de cópia não suportado "{seedMode}". Opções válidas: minimal, full.',
    configAlreadyExists: "A configuração da worktree já existe em {configPath} ou há dados de instância em {instanceRoot}. Execute novamente com --force para substituir.",
    missingSourceConfig: "Não é possível copiar o banco da worktree porque a configuração de origem não foi encontrada em {sourceConfigPath}. Use --no-seed ou informe --from-config.",
    repoConfig: "Configuração do repositório:",
    repoEnv: "Arquivo env do repositório:",
    isolatedHome: "Diretório isolado:",
    instance: "Instância:",
    worktreeBadge: "Identificação visual da worktree:",
    serverPort: "Porta do servidor:",
    dbPort: "Porta do banco:",
    mirroredGitHooks: "Hooks do Git espelhados:",
    seedStarting: "Copiando dados para o banco isolado da worktree a partir da instância de origem ({seedMode})...",
    seedComplete: "Dados copiados para o banco isolado da worktree ({seedMode}).",
    seedFailed: "Falha ao copiar os dados para o banco da worktree.",
    seedMode: "Modo de cópia:",
    seedSnapshot: "Snapshot de origem:",
    seedExecutionQuarantine: "Isolamento da execução copiada:",
    preservedLiveWork: "Trabalho em andamento copiado foi preservado; esta instância da worktree pode executar automaticamente as atribuições da instância de origem.",
    pausedScheduledRoutines: "Rotinas agendadas pausadas:",
    reboundWorkspace: "Workspace {name} religado: {fromCwd} -> {toCwd}",
    disabledTimerHeartbeats: "heartbeats de timer desativados: {count}",
    resetRunningAgents: "agentes em execução redefinidos: {count}",
    quarantinedInProgressIssues: "tarefas em andamento isoladas: {count}",
    unassignedTodoIssues: "tarefas pendentes sem responsável: {count}",
    unassignedReviewIssues: "tarefas em revisão sem responsável: {count}",
    stoppedProjectWorkspaceRuntimes: "runtimes de workspace de projeto parados: {count}",
    stoppedExecutionWorkspaceRuntimes: "runtimes de workspace de execução parados: {count}",
    stoppedRuntimeServices: "serviços de runtime parados: {count}",
    worktreeReady: "Worktree pronta. Execute o Paperclip neste repositório; o CLI/servidor usará a instância {instanceId} automaticamente.",
  },
} as const;

type WorktreeOperationMessageKey = keyof typeof worktreeOperationMessageCatalog.en;

export function worktreeOperationMessage(
  key: WorktreeOperationMessageKey,
  values: Readonly<Record<string, string | number>> = {},
  locale: SupportedLocale = getCliLocale(),
): string {
  let message: string = worktreeOperationMessageCatalog[locale][key];
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

const worktreeListMarkers = {
  en: {
    current: "current",
    paperclipConfig: "paperclip",
    noPaperclipConfig: "no-paperclip-config",
  },
  "pt-BR": {
    current: "atual",
    paperclipConfig: "config-paperclip",
    noPaperclipConfig: "sem-config-paperclip",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function worktreeListMarkerLabels(locale: SupportedLocale = getCliLocale()): Record<string, string> {
  return worktreeListMarkers[locale];
}
