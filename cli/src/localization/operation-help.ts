import type { SupportedLocale } from "@paperclipai/shared/localization";
import type { Command } from "commander";

type LocaleText = Record<SupportedLocale, string>;
type CommandHelp = {
  description: LocaleText;
  arguments?: Record<string, LocaleText>;
  options?: Record<string, LocaleText>;
};

const descriptionOnly = (en: string, ptBR: string): CommandHelp => ({
  description: { en, "pt-BR": ptBR },
});

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
const companyOptions = {
  ...commonClientOptions,
  "--company-id": { en: "Company ID (overrides context default)", "pt-BR": "ID da organização (substitui o padrão do contexto)" },
};
const skillReferenceArgument = { skillRef: { en: "Company skill ID, key, or unique slug", "pt-BR": "ID, chave ou slug exclusivo da skill da organização" } };
const skillIdArgument = { skillId: { en: "Skill ID", "pt-BR": "ID da skill" } };
const catalogReferenceArgument = { catalogRef: { en: "Catalog skill ID, key, or unique slug", "pt-BR": "ID, chave ou slug exclusivo da skill do catálogo" } };
const issueIdArgument = { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } };
const rootIssueIdArgument = { issueId: { en: "Root issue ID", "pt-BR": "ID da tarefa raiz" } };
const issueIdOrIdentifierArgument = { issueId: { en: "Issue ID or identifier", "pt-BR": "ID ou identificador da tarefa" } };
const issueCommentArguments = {
  issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" },
  commentId: { en: "Comment ID", "pt-BR": "ID do comentário" },
};
const issueApprovalArguments = {
  issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" },
  approvalId: { en: "Approval ID", "pt-BR": "ID da aprovação" },
};
const workProductIdArgument = { workProductId: { en: "Work product ID", "pt-BR": "ID do entregável" } };
const attachmentIdArgument = { attachmentId: { en: "Attachment ID", "pt-BR": "ID do anexo" } };
const issueDocumentArguments = {
  issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" },
  key: { en: "Document key", "pt-BR": "Chave do documento" },
};
const issueDocumentRevisionArguments = {
  ...issueDocumentArguments,
  revisionId: { en: "Revision ID", "pt-BR": "ID da revisão" },
};
const issueInteractionArguments = {
  issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" },
  interactionId: { en: "Interaction ID", "pt-BR": "ID da interação" },
};
const treeHoldArguments = {
  issueId: { en: "Root issue ID", "pt-BR": "ID da tarefa raiz" },
  holdId: { en: "Hold ID", "pt-BR": "ID da retenção" },
};
const contextBaseOptions = {
  "--data-dir": commonClientOptions["--data-dir"],
  "--context": commonClientOptions["--context"],
};
const contextShowOptions = {
  ...contextBaseOptions,
  "--profile": commonClientOptions["--profile"],
  "--json": commonClientOptions["--json"],
};
const contextSetOptions = {
  ...contextBaseOptions,
  "--profile": { en: "Profile name (default: current profile)", "pt-BR": "Nome do perfil (padrão: perfil atual)" },
  "--locale": { en: "Save profile language: pt-BR or en (independent of the web account)", "pt-BR": "Salvar o idioma do perfil: pt-BR ou en (independente da conta web)" },
  "--api-base": { en: "Default API base URL", "pt-BR": "URL base padrão da API" },
  "--company-id": { en: "Default company ID", "pt-BR": "ID padrão da organização" },
  "--persona": { en: "Profile persona: board or agent", "pt-BR": "Persona do perfil: board ou agent" },
  "--agent-id": { en: "Default agent ID for agent persona", "pt-BR": "ID padrão do agente para a persona agent" },
  "--agent-name": { en: "Default agent display name", "pt-BR": "Nome de exibição padrão do agente" },
  "--api-key-env-var-name": { en: "Env var containing API key (recommended)", "pt-BR": "Variável de ambiente que contém a chave da API (recomendado)" },
  "--use": { en: "Set this profile as active", "pt-BR": "Definir este perfil como ativo" },
  "--json": commonClientOptions["--json"],
};
const worktreeHomeOption = {
  en: "Home root for worktree instances (env: PAPERCLIP_WORKTREES_DIR, default: ~/.paperclip-worktrees)",
  "pt-BR": "Diretório raiz das instâncias de worktree (variável PAPERCLIP_WORKTREES_DIR, padrão: ~/.paperclip-worktrees)",
};
const worktreeSourceOptions = {
  "--from-config": { en: "Source config.json to seed from", "pt-BR": "Arquivo config.json de origem para copiar os dados" },
  "--from-data-dir": { en: "Source PAPERCLIP_HOME used when deriving the source config", "pt-BR": "PAPERCLIP_HOME de origem usado para localizar a configuração" },
  "--from-instance": { en: "Source instance id when deriving the source config", "pt-BR": "ID da instância de origem usado para localizar a configuração" },
};
const worktreeSeedOptions = {
  "--seed-mode": { en: "Seed profile: minimal or full (default: minimal)", "pt-BR": "Perfil de cópia: minimal ou full (padrão: minimal)" },
  "--preserve-live-work": { en: "Do not quarantine copied agent work or workspace runtime services in the seeded worktree", "pt-BR": "Não isolar o trabalho copiado dos agentes nem os serviços de runtime dos workspaces na worktree" },
};

const operationHelp: Record<string, CommandHelp> = {
  "test-drive": descriptionOnly(
    "Start an isolated, initialized Paperclip instance for manual testing",
    "Iniciar uma instância isolada e inicializada do Paperclip para testes manuais",
  ),
  runtime: descriptionOnly("Manage explicitly installed agent runtimes", "Gerenciar runtimes de agentes instalados explicitamente"),
  "runtime import-remote": {
    description: {
      en: "Import a verified Linux Pi companion into the installed server (no downloads)",
      "pt-BR": "Importar um companion Pi verificado para Linux no servidor instalado (sem downloads)",
    },
    arguments: { directory: { en: "Directory to import from", "pt-BR": "Diretório de origem para a importação" } },
    options: { "--sha256": { en: "SHA256 of companion.json from the trusted release", "pt-BR": "SHA256 de companion.json da versão confiável" } },
  },
  "runtime setup": {
    description: {
      en: "Install and verify the pinned Pi or Cursor runtime for this host (public downloads; no model calls)",
      "pt-BR": "Instalar e verificar o runtime Pi ou Cursor fixado para este host (downloads públicos; sem chamadas a modelos)",
    },
    arguments: { provider: { en: "Runtime provider (pi or cursor)", "pt-BR": "Provedor de runtime (pi ou cursor)" } },
  },
  channels: {
    description: { en: "Show the release channels and which one this install follows", "pt-BR": "Exibir os canais de lançamento e qual deles esta instalação acompanha" },
    options: { "--json": { en: "Machine-readable output", "pt-BR": "Saída legível por máquina" } },
  },
  "db:backup": {
    description: { en: "Create a one-off database backup using current config", "pt-BR": "Criar um backup pontual do banco de dados usando a configuração atual" },
    options: {
      "--config": { en: "Path to config file", "pt-BR": "Caminho do arquivo de configuração" },
      "--data-dir": commonClientOptions["--data-dir"],
      "--dir": { en: "Backup output directory (overrides config)", "pt-BR": "Diretório de saída do backup (sobrescreve a configuração)" },
      "--retention-days": { en: "Retention window used for pruning", "pt-BR": "Período de retenção usado para limpeza" },
      "--filename-prefix": { en: "Backup filename prefix", "pt-BR": "Prefixo do nome do arquivo de backup" },
      "--json": { en: "Print backup metadata as JSON", "pt-BR": "Exibir metadados do backup em JSON" },
    },
  },
  run: descriptionOnly("Bootstrap local setup (onboard + doctor) and run Paperclip", "Preparar a instalação local (onboard + doctor) e executar o Paperclip"),
  heartbeat: descriptionOnly("Heartbeat utilities", "Utilitários de heartbeat"),
  "heartbeat run": {
    description: { en: "Run one agent heartbeat and stream live logs", "pt-BR": "Executar um heartbeat de agente e acompanhar os logs em tempo real" },
    options: {
      ...commonClientOptions,
      "--agent-id": { en: "Agent ID to invoke", "pt-BR": "ID do agente a invocar" },
      "--source": { en: "Invocation source (timer | assignment | on_demand | automation)", "pt-BR": "Origem da invocação (timer | assignment | on_demand | automation)" },
      "--trigger": { en: "Trigger detail (manual | ping | callback | system)", "pt-BR": "Detalhe do acionador (manual | ping | callback | system)" },
      "--timeout-ms": { en: "Max time to wait before giving up", "pt-BR": "Tempo máximo de espera antes de desistir" },
      "--debug": { en: "Show raw adapter stdout/stderr JSON chunks", "pt-BR": "Exibir blocos JSON brutos de stdout/stderr do adapter" },
    },
  },
  context: descriptionOnly("Manage CLI client context profiles", "Gerenciar perfis de contexto do cliente CLI"),
  "context show": {
    ...descriptionOnly("Show current context and active profile", "Exibir o contexto atual e o perfil ativo"),
    options: {
      ...contextBaseOptions,
      "--profile": { en: "Profile to inspect", "pt-BR": "Perfil a consultar" },
      "--json": commonClientOptions["--json"],
    },
  },
  "context list": {
    ...descriptionOnly("List available context profiles", "Listar perfis de contexto disponíveis"),
    options: { ...contextBaseOptions, "--json": commonClientOptions["--json"] },
  },
  "context use": {
    ...descriptionOnly("Set active context profile", "Definir o perfil de contexto ativo"),
    arguments: { profile: { en: "Profile name", "pt-BR": "Nome do perfil" } },
    options: contextBaseOptions,
  },
  "context set": {
    ...descriptionOnly("Set values on a profile", "Definir valores em um perfil"),
    options: contextSetOptions,
  },
  "connect": {
    description: { en: "Interactively connect the CLI as a board operator or agent", "pt-BR": "Conectar a CLI de forma interativa como operador do board ou agente" },
    options: {
      ...commonClientOptions,
      "--company-id": companyOptions["--company-id"],
      "--persona": { en: "Persona to configure: board or agent", "pt-BR": "Persona a configurar: board ou agent" },
      "--api-key-env-var-name": { en: "Env var name to store in the profile", "pt-BR": "Nome da variável de ambiente a armazenar no perfil" },
      "--token-name": { en: "Token label to create", "pt-BR": "Rótulo do token a criar" },
    },
  },
  email: descriptionOnly("Explicitly send and inspect task-bound AgentMail conversations", "Enviar e inspecionar conversas AgentMail vinculadas a tarefas"),
  issue: descriptionOnly("Issue operations", "Operações de tarefas"),
  agent: descriptionOnly("Agent operations", "Operações de agentes"),
  project: descriptionOnly("Project operations", "Operações de projetos"),
  "agent-prompt": descriptionOnly(
    "Create/update Paperclip work for an agent using an agent API key",
    "Criar ou atualizar trabalho no Paperclip para um agente usando uma chave de API de agente",
  ),
  board: descriptionOnly("Board operator operations", "Operações de operador do board"),
  finance: descriptionOnly("Finance event and summary operations", "Operações de eventos e resumos financeiros"),
  budget: descriptionOnly("Budget policy and incident operations", "Operações de políticas orçamentárias e incidentes"),
  "agent-config": descriptionOnly("Agent configuration summaries", "Resumos de configuração de agentes"),
  workspace: descriptionOnly("Execution workspace operations", "Operações de espaços de trabalho de execução"),
  environment: descriptionOnly("Environment operations", "Operações de ambiente"),
  "project-workspace": descriptionOnly("Project workspace operations", "Operações de espaços de trabalho de projetos"),
  whoami: descriptionOnly("Show current CLI auth identity", "Exibir a identidade de autenticação atual da CLI"),
  access: descriptionOnly("Access and auth inspection operations", "Operações de inspeção de acesso e autenticação"),
  openapi: descriptionOnly("Print the OpenAPI document", "Exibir o documento OpenAPI"),
  invite: descriptionOnly("Invite operations", "Operações de convites"),
  join: descriptionOnly("Join request operations", "Operações de solicitações de entrada"),
  member: descriptionOnly("Company member operations", "Operações de membros da organização"),
  admin: descriptionOnly("Instance admin operations", "Operações administrativas da instância"),
  instance: descriptionOnly("Instance operations", "Operações da instância"),
  sidebar: descriptionOnly("Sidebar preference and badge operations", "Operações de preferências e indicadores da barra lateral"),
  inbox: descriptionOnly("Board inbox operations", "Operações da caixa de entrada do board"),
  openclaw: descriptionOnly("OpenClaw integration helpers", "Ferramentas de integração com OpenClaw"),
  "available-skill": descriptionOnly("Public skill catalog operations", "Operações do catálogo público de skills"),
  llm: descriptionOnly("LLM prompt documentation", "Documentação de prompts de LLM"),
  "managed-agent": descriptionOnly(
    "Provision and qualify remote managed-agent providers",
    "Provisionar e qualificar provedores remotos de agentes gerenciados",
  ),
  feedback: descriptionOnly("Inspect and export local feedback traces", "Inspecionar e exportar traces de feedback locais"),
  auth: descriptionOnly("Authentication and bootstrap utilities", "Utilitários de autenticação e inicialização"),
  mcp: descriptionOnly(
    "Connect an assistant to Paperclip as a consenting human",
    "Conectar um assistente ao Paperclip como uma pessoa que concedeu consentimento",
  ),
  "mcp login": {
    description: {
      en: "Authorize Paperclip MCP access in a browser",
      "pt-BR": "Autorizar o acesso ao MCP do Paperclip pelo navegador",
    },
    options: {
      "--device": { en: "Authorize in a browser without a callback listener", "pt-BR": "Autorizar no navegador sem iniciar um listener de callback" },
      "--url": { en: "Canonical Paperclip MCP URL", "pt-BR": "URL canônica do MCP do Paperclip" },
      "--company": { en: "Restrict consent to this organization", "pt-BR": "Restringir o consentimento a esta organização" },
    },
  },
  "mcp proxy": {
    description: { en: "Expose the authorized Paperclip tools over local MCP stdio", "pt-BR": "Disponibilizar as ferramentas autorizadas do Paperclip por MCP stdio local" },
    options: { "--url": { en: "The exact MCP URL used during login", "pt-BR": "A URL exata do MCP usada durante o login" } },
  },
  "env-lab": {
    description: { en: "Deterministic local environment fixtures", "pt-BR": "Fixtures determinísticos de ambiente local" },
  },
  "env-lab up": {
    description: { en: "Start the default SSH env-lab fixture", "pt-BR": "Iniciar o fixture SSH padrão do env-lab" },
    options: {
      "--instance": { en: "Paperclip instance id (default: current/default)", "pt-BR": "ID da instância do Paperclip (padrão: atual/default)" },
      "--json": { en: "Print machine-readable fixture details", "pt-BR": "Exibir detalhes do fixture em JSON para máquinas" },
    },
  },
  "env-lab status": {
    description: { en: "Show the current SSH env-lab fixture state", "pt-BR": "Exibir o estado atual do fixture SSH do env-lab" },
    options: {
      "--instance": { en: "Paperclip instance id (default: current/default)", "pt-BR": "ID da instância do Paperclip (padrão: atual/default)" },
      "--json": { en: "Print machine-readable fixture details", "pt-BR": "Exibir detalhes do fixture em JSON para máquinas" },
    },
  },
  "env-lab down": {
    description: { en: "Stop the default SSH env-lab fixture", "pt-BR": "Parar o fixture SSH padrão do env-lab" },
    options: {
      "--instance": { en: "Paperclip instance id (default: current/default)", "pt-BR": "ID da instância do Paperclip (padrão: atual/default)" },
      "--json": { en: "Print machine-readable stop details", "pt-BR": "Exibir detalhes da parada em JSON para máquinas" },
    },
  },
  "env-lab doctor": {
    description: { en: "Check SSH fixture prerequisites and current status", "pt-BR": "Verificar pré-requisitos e estado atual do fixture SSH" },
    options: {
      "--instance": { en: "Paperclip instance id (default: current/default)", "pt-BR": "ID da instância do Paperclip (padrão: atual/default)" },
      "--json": { en: "Print machine-readable diagnostic details", "pt-BR": "Exibir detalhes do diagnóstico em JSON para máquinas" },
    },
  },
  "allowed-hostname": {
    description: { en: "Allow a hostname for authenticated/private mode access", "pt-BR": "Permitir o acesso de um hostname no modo autenticado/privado" },
    arguments: { host: { en: "Hostname to allow (for example dotta-macbook-pro)", "pt-BR": "Hostname a permitir (por exemplo dotta-macbook-pro)" } },
    options: {
      "--config": { en: "Path to config file", "pt-BR": "Caminho do arquivo de configuração" },
      "--data-dir": { en: "Paperclip data directory root (isolates state from ~/.paperclip)", "pt-BR": "Diretório raiz dos dados do Paperclip (isola o estado de ~/.paperclip)" },
    },
  },
  worktree: {
    description: { en: "Worktree-local Paperclip instance helpers", "pt-BR": "Ferramentas para instâncias locais do Paperclip em worktrees" },
  },
  "worktree:make": {
    description: { en: "Create ~/NAME as a git worktree, then initialize an isolated Paperclip instance inside it", "pt-BR": "Criar ~/NOME como worktree do Git e inicializar nela uma instância isolada do Paperclip" },
    arguments: { name: { en: "Worktree name — auto-prefixed with paperclip- if needed (created at ~/paperclip-NAME)", "pt-BR": "Nome da worktree — recebe o prefixo paperclip- quando necessário (criada em ~/paperclip-NOME)" } },
    options: {
      "--start-point": { en: "Remote ref to base the new branch on (env: PAPERCLIP_WORKTREE_START_POINT)", "pt-BR": "Referência remota usada como base da nova branch (variável PAPERCLIP_WORKTREE_START_POINT)" },
      "--instance": { en: "Explicit isolated instance id", "pt-BR": "ID explícito da instância isolada" },
      "--home": worktreeHomeOption,
      ...worktreeSourceOptions,
      "--from-instance": { en: "Source instance id when deriving the source config", "pt-BR": "ID da instância de origem usado para localizar a configuração" },
      "--server-port": { en: "Preferred server port", "pt-BR": "Porta preferencial do servidor" },
      "--db-port": { en: "Preferred embedded Postgres port", "pt-BR": "Porta preferencial do PostgreSQL integrado" },
      ...worktreeSeedOptions,
      "--no-seed": { en: "Skip database seeding from the source instance", "pt-BR": "Não copiar o banco de dados da instância de origem" },
      "--empty": { en: "Create an empty instance without immediate or deferred database copying", "pt-BR": "Criar uma instância vazia sem copiar o banco agora ou depois" },
      "--force": { en: "Replace existing repo-local config and isolated instance data", "pt-BR": "Substituir a configuração local do repositório e os dados da instância isolada" },
    },
  },
  "worktree init": {
    description: { en: "Create repo-local config/env and an isolated instance for this worktree", "pt-BR": "Criar a configuração local do repositório, o arquivo env e uma instância isolada para esta worktree" },
    options: {
      "--name": { en: "Display name used to derive the instance id", "pt-BR": "Nome de exibição usado para definir o ID da instância" },
      "--instance": { en: "Explicit isolated instance id", "pt-BR": "ID explícito da instância isolada" },
      "--home": worktreeHomeOption,
      ...worktreeSourceOptions,
      "--from-instance": { en: "Source instance id when deriving the source config", "pt-BR": "ID da instância de origem usado para localizar a configuração" },
      "--server-port": { en: "Preferred server port", "pt-BR": "Porta preferencial do servidor" },
      "--db-port": { en: "Preferred embedded Postgres port", "pt-BR": "Porta preferencial do PostgreSQL integrado" },
      "--seed-mode": worktreeSeedOptions["--seed-mode"],
      "--preserve-live-work": worktreeSeedOptions["--preserve-live-work"],
      "--no-seed": { en: "Skip database seeding from the source instance", "pt-BR": "Não copiar o banco de dados da instância de origem" },
      "--empty": { en: "Create an empty instance without immediate or deferred database copying", "pt-BR": "Criar uma instância vazia sem copiar o banco agora ou depois" },
      "--force": { en: "Replace existing repo-local config and isolated instance data", "pt-BR": "Substituir a configuração local do repositório e os dados da instância isolada" },
    },
  },
  "worktree env": {
    description: { en: "Print shell exports for the current worktree-local Paperclip instance", "pt-BR": "Exibir exportações de shell da instância local do Paperclip nesta worktree" },
    options: {
      "--config": { en: "Path to config file", "pt-BR": "Caminho do arquivo de configuração" },
      "--json": { en: "Print JSON instead of shell exports", "pt-BR": "Exibir JSON em vez das exportações de shell" },
    },
  },
  "worktree ensure-seeded": {
    description: { en: "Seed a seed-pending worktree database exactly once from its source instance", "pt-BR": "Copiar uma única vez os dados da instância de origem para o banco pendente desta worktree" },
    options: {
      "--config": { en: "Path to the target worktree config file", "pt-BR": "Caminho do arquivo de configuração da worktree de destino" },
      ...worktreeSourceOptions,
      "--preserve-live-work": worktreeSeedOptions["--preserve-live-work"],
    },
  },
  "worktree:list": {
    description: { en: "List git worktrees visible from this repo and whether they look like Paperclip worktrees", "pt-BR": "Listar as worktrees Git visíveis neste repositório e indicar quais parecem ser worktrees do Paperclip" },
    options: { "--json": { en: "Print JSON instead of text output", "pt-BR": "Exibir JSON em vez de texto" } },
  },
  "worktree:merge-history": {
    description: { en: "Preview or import issue/comment history from another worktree into the current instance", "pt-BR": "Pré-visualizar ou importar o histórico de tarefas e comentários de outra worktree para a instância atual" },
    arguments: { source: { en: "Optional source worktree path, directory name, or branch name (back-compat alias for --from)", "pt-BR": "Caminho, nome de diretório ou branch opcional da worktree de origem (alias compatível com --from)" } },
    options: {
      "--from": { en: "Source worktree path, directory name, branch name, or current", "pt-BR": "Caminho, nome de diretório, branch da worktree de origem ou current" },
      "--to": { en: "Target worktree path, directory name, branch name, or current (defaults to current)", "pt-BR": "Caminho, nome de diretório, branch da worktree de destino ou current (padrão: current)" },
      "--company": { en: "Shared company id or issue prefix inside the chosen source/target instances", "pt-BR": "ID da organização compartilhada ou prefixo de tarefa nas instâncias de origem/destino" },
      "--scope": { en: "Comma-separated scopes to import (issues, comments)", "pt-BR": "Escopos a importar, separados por vírgula (issues, comments)" },
      "--apply": { en: "Apply the import after previewing the plan", "pt-BR": "Aplicar a importação após pré-visualizar o plano" },
      "--dry": { en: "Preview only and do not import anything", "pt-BR": "Somente pré-visualizar, sem importar dados" },
      "--yes": { en: "Skip the interactive confirmation prompt when applying", "pt-BR": "Ignorar a confirmação interativa ao aplicar" },
    },
  },
  "worktree reseed": {
    description: { en: "Re-seed an existing worktree-local instance from another Paperclip instance or worktree", "pt-BR": "Recopiar os dados de outra instância ou worktree do Paperclip para uma instância local existente" },
    options: {
      "--from": { en: "Source worktree path, directory name, branch name, or current", "pt-BR": "Caminho, nome de diretório, branch da worktree de origem ou current" },
      "--to": { en: "Target worktree path, directory name, branch name, or current (defaults to current)", "pt-BR": "Caminho, nome de diretório, branch da worktree de destino ou current (padrão: current)" },
      ...worktreeSourceOptions,
      "--from-instance": { en: "Source instance id when deriving the source config", "pt-BR": "ID da instância de origem usado para localizar a configuração" },
      "--seed-mode": { en: "Seed profile: minimal or full (default: full)", "pt-BR": "Perfil de cópia: minimal ou full (padrão: full)" },
      "--preserve-live-work": worktreeSeedOptions["--preserve-live-work"],
      "--yes": { en: "Skip the destructive confirmation prompt", "pt-BR": "Ignorar a confirmação da operação destrutiva" },
      "--allow-live-target": { en: "Override the guard that requires the target worktree DB to be stopped first", "pt-BR": "Ignorar a proteção que exige parar o banco da worktree de destino antes da operação" },
      "--backup-target": { en: "Retain a recoverable full backup of the isolated target DB before reseeding", "pt-BR": "Manter um backup completo recuperável do banco isolado de destino antes de recopiá-lo" },
    },
  },
  "worktree repair": {
    description: { en: "Create or repair a linked worktree-local Paperclip instance without touching the primary checkout", "pt-BR": "Criar ou reparar uma instância local vinculada à worktree sem alterar o checkout principal" },
    options: {
      "--branch": { en: "Existing branch/worktree selector to repair, or a branch name to create under .paperclip/worktrees", "pt-BR": "Seletor de branch/worktree existente para reparar ou nome de branch a criar em .paperclip/worktrees" },
      "--home": worktreeHomeOption,
      ...worktreeSourceOptions,
      "--from-instance": { en: "Source instance id when deriving the source config (default: default)", "pt-BR": "ID da instância de origem usado para localizar a configuração (padrão: default)" },
      "--seed-mode": worktreeSeedOptions["--seed-mode"],
      "--preserve-live-work": worktreeSeedOptions["--preserve-live-work"],
      "--no-seed": { en: "Repair metadata only and skip reseeding when bootstrapping a missing worktree config", "pt-BR": "Reparar somente os metadados e não recopiá-los ao inicializar uma configuração ausente da worktree" },
      "--allow-live-target": { en: "Override the guard that requires the target worktree DB to be stopped first", "pt-BR": "Ignorar a proteção que exige parar o banco da worktree de destino antes da operação" },
    },
  },
  "worktree:cleanup": {
    description: { en: "Safely remove a worktree, its branch, and its isolated instance data", "pt-BR": "Remover com segurança uma worktree, sua branch e os dados da instância isolada" },
    arguments: { name: { en: "Worktree name — auto-prefixed with paperclip- if needed", "pt-BR": "Nome da worktree — recebe o prefixo paperclip- quando necessário" } },
    options: {
      "--instance": { en: "Explicit instance id (if different from the worktree name)", "pt-BR": "ID explícito da instância (se for diferente do nome da worktree)" },
      "--home": worktreeHomeOption,
      "--force": { en: "Bypass safety checks (uncommitted changes, unique commits)", "pt-BR": "Ignorar verificações de segurança (alterações não confirmadas e commits exclusivos)" },
    },
  },
  plugin: {
    description: { en: "Plugin lifecycle management", "pt-BR": "Gerenciamento do ciclo de vida de plugins" },
  },
  "plugin init": {
    description: { en: "Scaffold a local Paperclip plugin project", "pt-BR": "Criar a estrutura de um projeto local de plugin do Paperclip" },
    arguments: { packageName: { en: "Package name", "pt-BR": "Nome do pacote" } },
    options: {
      ...commonClientOptions,
      "--output": { en: "Directory to create the plugin folder in", "pt-BR": "Diretório onde a pasta do plugin será criada" },
      "--template": { en: "Starter template", "pt-BR": "Modelo inicial" },
      "--category": { en: "Manifest category", "pt-BR": "Categoria do manifesto" },
      "--display-name": { en: "Manifest display name", "pt-BR": "Nome de exibição do manifesto" },
      "--description": { en: "Manifest description", "pt-BR": "Descrição do manifesto" },
      "--author": { en: "Manifest author", "pt-BR": "Autoria do manifesto" },
      "--sdk-path": { en: "Local @paperclipai/plugin-sdk package path", "pt-BR": "Caminho local do pacote @paperclipai/plugin-sdk" },
    },
  },
  "plugin list": {
    description: { en: "List installed plugins", "pt-BR": "Listar plugins instalados" },
    options: { ...commonClientOptions, "--status": { en: "Filter by status (ready, error, disabled, installed, upgrade_pending)", "pt-BR": "Filtrar por status (ready, error, disabled, installed, upgrade_pending)" } },
  },
  "plugin install": {
    description: {
      en: "Install a plugin from a local path or npm package.\n  Examples:\n    paperclipai plugin install ./my-plugin              # local path\n    paperclipai plugin install @acme/plugin-linear      # npm package\n    paperclipai plugin install @acme/plugin-linear@1.2  # pinned version",
      "pt-BR": "Instalar um plugin de um caminho local ou pacote npm.\n  Exemplos:\n    paperclipai plugin install ./my-plugin              # caminho local\n    paperclipai plugin install @acme/plugin-linear      # pacote npm\n    paperclipai plugin install @acme/plugin-linear@1.2  # versão fixada",
    },
    arguments: { package: { en: "Plugin package or path", "pt-BR": "Pacote ou caminho do plugin" } },
    options: {
      ...commonClientOptions,
      "--local": { en: "Treat <package> as a local filesystem path", "pt-BR": "Tratar <package> como caminho local do sistema de arquivos" },
      "--version": { en: "Specific npm version to install (npm packages only)", "pt-BR": "Versão específica para instalar (somente pacotes npm)" },
      "--no-verify-target": { en: "Skip the pre-install probe that reports which Paperclip instance the plugin installs into", "pt-BR": "Ignorar a verificação anterior à instalação que identifica a instância do Paperclip de destino" },
    },
  },
  "plugin target": {
    description: {
      en: "Show which Paperclip instance plugin commands will talk to.\n  Reports the resolved API URL plus the server status/version/mode from\n  GET /api/health so you can confirm you are installing into the branch\n  runtime and not a stale control-plane host.",
      "pt-BR": "Mostrar com qual instância do Paperclip os comandos de plugin vão se comunicar.\n  Exibe a URL da API resolvida e o status/versão/modo do servidor obtidos em\n  GET /api/health para confirmar a instalação no runtime desta branch,\n  em vez de um host de controle desatualizado.",
    },
    options: commonClientOptions,
  },
  "plugin uninstall": {
    description: { en: "Uninstall a plugin by its plugin key or database ID.\n  Use --force to hard-purge all state and config.", "pt-BR": "Desinstalar um plugin pela chave ou pelo ID do banco de dados.\n  Use --force para remover permanentemente todo o estado e a configuração." },
    arguments: { pluginKey: { en: "Plugin key or database ID", "pt-BR": "Chave do plugin ou ID do banco de dados" } },
    options: { ...commonClientOptions, "--force": { en: "Purge all plugin state and config (hard delete)", "pt-BR": "Remover permanentemente todo o estado e a configuração do plugin" } },
  },
  "plugin enable": {
    description: { en: "Enable a disabled or errored plugin", "pt-BR": "Ativar um plugin desativado ou com erro" },
    arguments: { pluginKey: { en: "Plugin key or database ID", "pt-BR": "Chave do plugin ou ID do banco de dados" } },
    options: commonClientOptions,
  },
  "plugin disable": {
    description: { en: "Disable a running plugin without uninstalling it", "pt-BR": "Desativar um plugin em execução sem desinstalá-lo" },
    arguments: { pluginKey: { en: "Plugin key or database ID", "pt-BR": "Chave do plugin ou ID do banco de dados" } },
    options: commonClientOptions,
  },
  "plugin inspect": {
    description: { en: "Show full details for an installed plugin", "pt-BR": "Mostrar todos os detalhes de um plugin instalado" },
    arguments: { pluginKey: { en: "Plugin key or database ID", "pt-BR": "Chave do plugin ou ID do banco de dados" } },
    options: commonClientOptions,
  },
  "plugin examples": {
    description: { en: "List bundled example plugins available for local install", "pt-BR": "Listar plugins de exemplo incluídos e disponíveis para instalação local" },
    options: commonClientOptions,
  },
  "plugin ui-contributions": {
    description: { en: "List plugin UI contributions", "pt-BR": "Listar contribuições de interface dos plugins" },
    options: commonClientOptions,
  },
  "plugin tools": {
    description: { en: "List plugin tools", "pt-BR": "Listar ferramentas dos plugins" },
    options: commonClientOptions,
  },
  "plugin tool:execute": {
    description: { en: "Execute a plugin tool", "pt-BR": "Executar uma ferramenta de plugin" },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin health": {
    description: { en: "Get plugin health", "pt-BR": "Consultar a integridade do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: commonClientOptions,
  },
  "plugin logs": {
    description: { en: "Get plugin logs", "pt-BR": "Consultar os logs do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: commonClientOptions,
  },
  "plugin upgrade": {
    description: { en: "Upgrade a plugin", "pt-BR": "Atualizar um plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin config": {
    description: { en: "Get company-scoped plugin config", "pt-BR": "Consultar a configuração do plugin na organização" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "plugin config:set": {
    description: { en: "Set company-scoped plugin config", "pt-BR": "Definir a configuração do plugin na organização" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin config:test": {
    description: { en: "Test company-scoped plugin config", "pt-BR": "Testar a configuração do plugin na organização" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin jobs": {
    description: { en: "List plugin jobs", "pt-BR": "Listar jobs do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: commonClientOptions,
  },
  "plugin job:runs": {
    description: { en: "List plugin job runs", "pt-BR": "Listar execuções de jobs do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, jobId: { en: "Job ID", "pt-BR": "ID do job" } },
    options: commonClientOptions,
  },
  "plugin job:trigger": {
    description: { en: "Trigger a plugin job", "pt-BR": "Acionar um job do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, jobId: { en: "Job ID", "pt-BR": "ID do job" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin webhook": {
    description: { en: "Deliver a plugin webhook", "pt-BR": "Enviar um webhook ao plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, key: { en: "Endpoint or data/action key", "pt-BR": "Chave do endpoint, dado ou ação" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin dashboard": {
    description: { en: "Get plugin dashboard data", "pt-BR": "Consultar os dados do painel do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: commonClientOptions,
  },
  "plugin bridge:data": {
    description: { en: "Send plugin bridge data", "pt-BR": "Enviar dados pela ponte do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin bridge:action": {
    description: { en: "Send plugin bridge action", "pt-BR": "Enviar uma ação pela ponte do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin bridge:stream": {
    description: { en: "Stream a plugin bridge channel", "pt-BR": "Transmitir um canal da ponte do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, channel: { en: "Stream channel", "pt-BR": "Canal de transmissão" } },
    options: { ...commonClientOptions, "--duration-ms": { en: "Stop streaming after this many milliseconds", "pt-BR": "Parar a transmissão após este número de milissegundos" } },
  },
  "plugin data": {
    description: { en: "Get plugin URL-keyed data", "pt-BR": "Consultar dados do plugin identificados pela URL" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, key: { en: "Endpoint or data/action key", "pt-BR": "Chave do endpoint, dado ou ação" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin action": {
    description: { en: "Invoke plugin URL-keyed action", "pt-BR": "Acionar uma ação do plugin identificada pela URL" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, key: { en: "Endpoint or data/action key", "pt-BR": "Chave do endpoint, dado ou ação" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin local-folders": {
    description: { en: "List plugin local folder bindings", "pt-BR": "Listar vínculos de pastas locais do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "plugin local-folder:status": {
    description: { en: "Get plugin local folder status", "pt-BR": "Consultar o status da pasta local do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, folderKey: { en: "Local folder key", "pt-BR": "Chave da pasta local" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "plugin local-folder:validate": {
    description: { en: "Validate plugin local folder binding", "pt-BR": "Validar o vínculo de pasta local do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, folderKey: { en: "Local folder key", "pt-BR": "Chave da pasta local" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "plugin local-folder:set": {
    description: { en: "Set plugin local folder binding", "pt-BR": "Definir o vínculo de pasta local do plugin" },
    arguments: { pluginId: { en: "Plugin ID or key", "pt-BR": "ID ou chave do plugin" }, folderKey: { en: "Local folder key", "pt-BR": "Chave da pasta local" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  org: {
    description: { en: "Organization chart operations", "pt-BR": "Operações do organograma" },
  },
  "org get": {
    description: { en: "Get org chart data", "pt-BR": "Consultar dados do organograma" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "org svg": {
    description: { en: "Download org chart SVG", "pt-BR": "Baixar SVG do organograma" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--out": { en: "Write output to file", "pt-BR": "Gravar a saída em um arquivo" },
    },
  },
  "org png": {
    description: { en: "Download org chart PNG", "pt-BR": "Baixar PNG do organograma" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--out": { en: "Write output to file", "pt-BR": "Gravar a saída em um arquivo" },
    },
  },
  adapter: {
    description: { en: "Adapter management operations", "pt-BR": "Operações de gerenciamento de adapters" },
  },
  "adapter list": {
    description: { en: "List registered adapters", "pt-BR": "Listar adapters registrados" },
    options: commonClientOptions,
  },
  "adapter install": {
    description: { en: "Install an external adapter", "pt-BR": "Instalar um adapter externo" },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "adapter get": {
    description: { en: "Get one adapter", "pt-BR": "Consultar um adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: commonClientOptions,
  },
  "adapter update": {
    description: { en: "Update adapter settings", "pt-BR": "Atualizar as configurações do adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "adapter override": {
    description: { en: "Pause or resume a built-in adapter override", "pt-BR": "Pausar ou retomar uma substituição de adapter integrado" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "adapter reload": {
    description: { en: "Reload an adapter", "pt-BR": "Recarregar um adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "adapter reinstall": {
    description: { en: "Reinstall an adapter", "pt-BR": "Reinstalar um adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "adapter delete": {
    description: { en: "Delete an external adapter registration", "pt-BR": "Excluir o registro de um adapter externo" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: commonClientOptions,
  },
  "adapter config-schema": {
    description: { en: "Get adapter config schema", "pt-BR": "Consultar o esquema de configuração do adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: commonClientOptions,
  },
  "adapter ui-parser": {
    description: { en: "Get adapter UI parser JavaScript", "pt-BR": "Consultar o JavaScript do parser de interface do adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: commonClientOptions,
  },
  "adapter models": {
    description: { en: "List adapter models for a company", "pt-BR": "Listar modelos do adapter para uma organização" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--refresh": { en: "Refresh provider model list", "pt-BR": "Atualizar a lista de modelos do provedor" },
      "--environment-id": { en: "Environment ID for environment-aware adapters", "pt-BR": "ID do ambiente para adapters que consideram o ambiente" },
    },
  },
  "adapter detect-model": {
    description: { en: "Detect adapter model", "pt-BR": "Detectar o modelo do adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "adapter test-environment": {
    description: { en: "Test adapter environment configuration", "pt-BR": "Testar a configuração de ambiente do adapter" },
    arguments: { type: { en: "Adapter type", "pt-BR": "Tipo de adapter" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  asset: {
    description: { en: "Asset operations", "pt-BR": "Operações de arquivos de mídia" },
  },
  "asset image:upload": {
    description: { en: "Upload a company image asset", "pt-BR": "Enviar uma imagem para a organização" },
    options: {
      ...commonClientOptions,
      "--file": { en: "Image file path", "pt-BR": "Caminho do arquivo de imagem" },
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--namespace": { en: "Asset namespace suffix", "pt-BR": "Sufixo do namespace do ativo" },
      "--alt": { en: "Alt text metadata", "pt-BR": "Texto alternativo" },
      "--title": { en: "Title metadata", "pt-BR": "Metadados do título" },
    },
  },
  "asset logo:upload": {
    description: { en: "Upload a company logo", "pt-BR": "Enviar o logotipo da organização" },
    options: {
      ...commonClientOptions,
      "--file": { en: "Logo file path", "pt-BR": "Caminho do arquivo do logotipo" },
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "asset content": {
    description: { en: "Download asset content", "pt-BR": "Baixar o conteúdo de um arquivo de mídia" },
    arguments: { assetId: { en: "Asset ID", "pt-BR": "ID do ativo" } },
    options: {
      ...commonClientOptions,
      "--out": { en: "Write content to a file instead of stdout", "pt-BR": "Gravar o conteúdo em um arquivo em vez de stdout" },
    },
  },
  "feedback report": {
    description: {
      en: "Render a terminal report for company feedback traces",
      "pt-BR": "Gerar um relatório de traces de feedback no terminal",
    },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID (overrides context default)", "pt-BR": "ID da organização (substitui o padrão do contexto)" },
      "--target-type": { en: "Filter by target type", "pt-BR": "Filtrar pelo tipo de destino" },
      "--vote": { en: "Filter by vote value", "pt-BR": "Filtrar pelo valor do voto" },
      "--status": { en: "Filter by trace status", "pt-BR": "Filtrar pelo status do trace" },
      "--project-id": { en: "Filter by project ID", "pt-BR": "Filtrar pelo ID do projeto" },
      "--issue-id": { en: "Filter by issue ID", "pt-BR": "Filtrar pelo ID da tarefa" },
      "--from": { en: "Only include traces created at or after this timestamp", "pt-BR": "Incluir apenas traces criados neste horário ou depois" },
      "--to": { en: "Only include traces created at or before this timestamp", "pt-BR": "Incluir apenas traces criados neste horário ou antes" },
      "--shared-only": { en: "Only include traces eligible for sharing/export", "pt-BR": "Incluir apenas traces elegíveis para compartilhamento/exportação" },
      "--payloads": { en: "Include raw payload dumps in the terminal report", "pt-BR": "Incluir dumps dos payloads brutos no relatório do terminal" },
    },
  },
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
  cost: {
    description: {
      en: "Cost and finance operations",
      "pt-BR": "Operações de custos e finanças",
    },
  },
  "cost summary": {
    description: { en: "Get summarized cost data", "pt-BR": "Consultar dados de custos resumidos" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost by-agent": {
    description: { en: "Get costs by agent", "pt-BR": "Consultar custos por agente" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost by-agent-model": {
    description: { en: "Get costs by agent and model", "pt-BR": "Consultar custos por agente e modelo" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost by-provider": {
    description: { en: "Get costs by provider", "pt-BR": "Consultar custos por provedor" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost by-biller": {
    description: { en: "Get costs by biller", "pt-BR": "Consultar custos por faturador" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost by-project": {
    description: { en: "Get costs by project", "pt-BR": "Consultar custos por projeto" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost window-spend": {
    description: { en: "Get spending in the current cost window", "pt-BR": "Consultar os gastos da janela de custos atual" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost quota-windows": {
    description: { en: "Get cost quota windows", "pt-BR": "Consultar janelas de cotas de custo" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "cost issue": {
    description: { en: "Get cost summary for an issue", "pt-BR": "Consultar o resumo de custos de uma tarefa" },
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: commonClientOptions,
  },
  "cost event:create": {
    description: { en: "Record a cost event", "pt-BR": "Registrar um evento de custo" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
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
  routine: {
    description: { en: "Routine API operations", "pt-BR": "Operações da API de rotinas" },
  },
  routines: {
    description: { en: "Local routine maintenance commands", "pt-BR": "Comandos locais para manutenção de rotinas" },
  },
  "routines disable-all": {
    description: { en: "Pause all non-archived routines in the configured local instance for one company", "pt-BR": "Pausar todas as rotinas não arquivadas de uma organização na instância local configurada" },
    options: {
      "--config": { en: "Path to config file", "pt-BR": "Caminho do arquivo de configuração" },
      "--data-dir": { en: "Paperclip data directory root (isolates state from ~/.paperclip)", "pt-BR": "Diretório raiz dos dados do Paperclip (isola o estado de ~/.paperclip)" },
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--json": { en: "Output raw JSON", "pt-BR": "Exibir JSON bruto" },
    },
  },
  "routine list": {
    description: { en: "List routines", "pt-BR": "Listar rotinas" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--project-id": { en: "Filter by project ID", "pt-BR": "Filtrar pelo ID do projeto" },
    },
  },
  "routine get": {
    description: { en: "Get a routine", "pt-BR": "Consultar uma rotina" },
    arguments: { id: { en: "Routine ID", "pt-BR": "ID da rotina" } },
    options: commonClientOptions,
  },
  "routine revisions": {
    description: { en: "List routine revisions", "pt-BR": "Listar revisões da rotina" },
    arguments: { id: { en: "Routine ID", "pt-BR": "ID da rotina" } },
    options: commonClientOptions,
  },
  "routine runs": {
    description: { en: "List routine runs", "pt-BR": "Listar execuções da rotina" },
    arguments: { routineId: { en: "Routine ID", "pt-BR": "ID da rotina" } },
    options: {
      ...commonClientOptions,
      "--limit": { en: "Maximum runs to return", "pt-BR": "Número máximo de execuções retornadas" },
    },
  },
  "routine trigger:create": {
    description: { en: "Create a trigger for a routine", "pt-BR": "Criar um gatilho para uma rotina" },
    arguments: { id: { en: "Routine ID", "pt-BR": "ID da rotina" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  "routine trigger:update": {
    description: { en: "Update a routine trigger", "pt-BR": "Atualizar um gatilho de rotina" },
    arguments: { id: { en: "Trigger ID", "pt-BR": "ID do gatilho" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  "routine trigger:delete": {
    description: { en: "Delete a routine trigger", "pt-BR": "Excluir um gatilho de rotina" },
    arguments: { id: { en: "Trigger ID", "pt-BR": "ID do gatilho" } },
    options: commonClientOptions,
  },
  "routine trigger:rotate-secret": {
    description: { en: "Rotate a routine trigger secret", "pt-BR": "Girar o segredo de um gatilho de rotina" },
    arguments: { id: { en: "Trigger ID", "pt-BR": "ID do gatilho" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" },
    },
  },
  "routine trigger:fire": {
    description: { en: "Fire a public routine trigger", "pt-BR": "Acionar um gatilho público de rotina" },
    arguments: { publicId: { en: "Public trigger ID", "pt-BR": "ID público do gatilho" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "Public trigger payload", "pt-BR": "Payload público do gatilho" },
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
  "issue heartbeat-context": {
    ...descriptionOnly("Get heartbeat context for an issue", "Consultar o contexto de heartbeat de uma tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue comment": {
    description: { en: "Add comment to issue", "pt-BR": "Adicionar um comentário à tarefa" },
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...commonClientOptions,
      "--body": { en: "Comment body", "pt-BR": "Conteúdo do comentário" },
      "--attachment-id": { en: "Bind uploaded issue attachments to this comment", "pt-BR": "Vincular anexos enviados da tarefa a este comentário" },
      "--reopen": { en: "Reopen if issue is done/cancelled", "pt-BR": "Reabrir se a tarefa estiver concluída ou cancelada" },
      "--resume": { en: "Request explicit follow-up and wake the assignee when resumable", "pt-BR": "Solicitar acompanhamento explícito e notificar o responsável quando for possível retomar" },
    },
  },
  "issue comments": {
    description: { en: "List issue comments", "pt-BR": "Listar comentários da tarefa" },
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...commonClientOptions,
      "--after-comment-id": { en: "Only return comments after this comment ID", "pt-BR": "Retornar somente comentários após este ID de comentário" },
      "--order": { en: "asc or desc", "pt-BR": "asc ou desc" },
      "--limit": { en: "Maximum comments to return", "pt-BR": "Número máximo de comentários a retornar" },
    },
  },
  "issue comment:get": {
    ...descriptionOnly("Get one issue comment", "Consultar um comentário da tarefa"),
    arguments: issueCommentArguments,
    options: commonClientOptions,
  },
  "issue comment:delete": {
    ...descriptionOnly("Delete or cancel one issue comment", "Excluir ou cancelar um comentário da tarefa"),
    arguments: issueCommentArguments,
    options: commonClientOptions,
  },
  "issue approvals": {
    ...descriptionOnly("List approvals linked to an issue", "Listar aprovações vinculadas a uma tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue approval:link": {
    ...descriptionOnly("Link an approval to an issue", "Vincular uma aprovação a uma tarefa"),
    arguments: issueApprovalArguments,
    options: commonClientOptions,
  },
  "issue approval:unlink": {
    ...descriptionOnly("Unlink an approval from an issue", "Desvincular uma aprovação de uma tarefa"),
    arguments: issueApprovalArguments,
    options: commonClientOptions,
  },
  "issue read": { ...descriptionOnly("Mark an issue as read", "Marcar uma tarefa como lida"), arguments: issueIdArgument, options: commonClientOptions },
  "issue unread": { ...descriptionOnly("Mark an issue as unread", "Marcar uma tarefa como não lida"), arguments: issueIdArgument, options: commonClientOptions },
  "issue archive": { ...descriptionOnly("Archive an issue from the inbox", "Arquivar uma tarefa da caixa de entrada"), arguments: issueIdArgument, options: commonClientOptions },
  "issue unarchive": { ...descriptionOnly("Unarchive an issue from the inbox", "Desarquivar uma tarefa da caixa de entrada"), arguments: issueIdArgument, options: commonClientOptions },
  "issue recovery-actions": {
    ...descriptionOnly("List active recovery actions for an issue", "Listar ações de recuperação ativas de uma tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue recovery:resolve": {
    ...descriptionOnly("Resolve an issue recovery action", "Resolver uma ação de recuperação de tarefa"),
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...companyOptions,
      "--outcome": { en: "restored, false_positive, blocked, or cancelled", "pt-BR": "restored, false_positive, blocked ou cancelled" },
      "--source-issue-status": { en: "todo, done, or in_review for restored outcomes; blocked is only valid for blocked outcomes", "pt-BR": "todo, done ou in_review para resultados restored; blocked só é válido para resultados blocked" },
      "--action-id": { en: "Specific recovery action ID", "pt-BR": "ID da ação de recuperação específica" },
      "--resolution-note": { en: "Resolution note", "pt-BR": "Nota de resolução" },
    },
  },
  "issue child:create": {
    ...descriptionOnly("Create a child issue from a JSON payload", "Criar uma tarefa filha a partir de um payload JSON"),
    arguments: { issueId: { en: "Parent issue ID", "pt-BR": "ID da tarefa pai" } },
    options: {
      ...companyOptions,
      "--payload-json": { en: "CreateChildIssue JSON payload", "pt-BR": "Payload JSON de CreateChildIssue" },
    },
  },
  "issue force-release": {
    ...descriptionOnly("Force-release an issue from an agent checkout", "Liberar à força uma tarefa de um checkout de agente"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue work-products": {
    ...descriptionOnly("List issue work products", "Listar entregáveis da tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue work-product:create": {
    ...descriptionOnly("Create an issue work product from JSON", "Criar um entregável da tarefa a partir de JSON"),
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...companyOptions,
      "--payload-json": { en: "CreateIssueWorkProduct JSON payload", "pt-BR": "Payload JSON de CreateIssueWorkProduct" },
    },
  },
  "issue work-product:update": {
    ...descriptionOnly("Update a work product from JSON", "Atualizar um entregável a partir de JSON"),
    arguments: { workProductId: { en: "Work product ID", "pt-BR": "ID do entregável" } },
    options: {
      ...companyOptions,
      "--payload-json": { en: "UpdateIssueWorkProduct JSON payload", "pt-BR": "Payload JSON de UpdateIssueWorkProduct" },
    },
  },
  "issue work-product:delete": {
    ...descriptionOnly("Delete a work product", "Excluir um entregável"),
    arguments: workProductIdArgument,
    options: commonClientOptions,
  },
  "issue documents": {
    ...descriptionOnly("List issue documents", "Listar documentos da tarefa"),
    arguments: issueIdArgument,
    options: {
      ...commonClientOptions,
      "--include-system": { en: "Include system documents", "pt-BR": "Incluir documentos do sistema" },
    },
  },
  "issue document:get": {
    ...descriptionOnly("Get an issue document", "Consultar um documento da tarefa"),
    arguments: issueDocumentArguments,
    options: commonClientOptions,
  },
  "issue document:put": {
    ...descriptionOnly("Create or update an issue document", "Criar ou atualizar um documento da tarefa"),
    arguments: issueDocumentArguments,
    options: {
      ...commonClientOptions,
      "--title": { en: "Document title", "pt-BR": "Título do documento" },
      "--format": { en: "Document format", "pt-BR": "Formato do documento" },
      "--body": { en: "Document body", "pt-BR": "Conteúdo do documento" },
      "--body-file": { en: "Read document body from a file", "pt-BR": "Ler o conteúdo do documento de um arquivo" },
      "--change-summary": { en: "Change summary", "pt-BR": "Resumo da alteração" },
      "--base-revision-id": { en: "Expected base revision ID", "pt-BR": "ID esperado da revisão base" },
    },
  },
  "issue document:delete": {
    ...descriptionOnly("Delete an issue document", "Excluir um documento da tarefa"),
    arguments: issueDocumentArguments,
    options: commonClientOptions,
  },
  "issue document:lock": {
    ...descriptionOnly("Lock an issue document", "Bloquear um documento da tarefa"),
    arguments: issueDocumentArguments,
    options: commonClientOptions,
  },
  "issue document:unlock": {
    ...descriptionOnly("Unlock an issue document", "Desbloquear um documento da tarefa"),
    arguments: issueDocumentArguments,
    options: commonClientOptions,
  },
  "issue document:revisions": {
    ...descriptionOnly("List issue document revisions", "Listar revisões do documento da tarefa"),
    arguments: issueDocumentArguments,
    options: commonClientOptions,
  },
  "issue document:restore": {
    ...descriptionOnly("Restore an issue document revision", "Restaurar uma revisão do documento da tarefa"),
    arguments: issueDocumentRevisionArguments,
    options: commonClientOptions,
  },
  "issue interactions": {
    ...descriptionOnly("List issue thread interactions", "Listar interações do thread da tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue interaction:create": {
    ...descriptionOnly("Create an issue thread interaction from JSON", "Criar uma interação do thread da tarefa a partir de JSON"),
    arguments: { issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" } },
    options: {
      ...companyOptions,
      "--payload-json": { en: "CreateIssueThreadInteraction JSON payload", "pt-BR": "Payload JSON de CreateIssueThreadInteraction" },
    },
  },
  "issue interaction:accept": {
    ...descriptionOnly("Accept an issue thread interaction", "Aceitar uma interação do thread da tarefa"),
    arguments: {
      issueId: { en: "Issue ID", "pt-BR": "ID da tarefa" },
      interactionId: { en: "Interaction ID", "pt-BR": "ID da interação" },
    },
    options: {
      ...companyOptions,
      "--selected-client-keys": { en: "Client keys to accept", "pt-BR": "Chaves de cliente a aceitar" },
      "--selected-option-ids": { en: "Checkbox option IDs to accept", "pt-BR": "IDs das opções de caixa de seleção a aceitar" },
    },
  },
  "issue interaction:reject": {
    ...descriptionOnly("Reject an issue thread interaction", "Rejeitar uma interação do thread da tarefa"),
    arguments: issueInteractionArguments,
    options: {
      ...companyOptions,
      "--reason": { en: "Reason", "pt-BR": "Motivo" },
    },
  },
  "issue interaction:cancel": {
    ...descriptionOnly("Cancel an issue thread interaction", "Cancelar uma interação do thread da tarefa"),
    arguments: issueInteractionArguments,
    options: {
      ...companyOptions,
      "--reason": { en: "Reason", "pt-BR": "Motivo" },
    },
  },
  "issue interaction:respond": {
    ...descriptionOnly("Respond to an issue question interaction", "Responder a uma interação de pergunta da tarefa"),
    arguments: issueInteractionArguments,
    options: {
      ...companyOptions,
      "--answers-json": { en: "Answers array JSON", "pt-BR": "JSON do conjunto de respostas" },
      "--summary-markdown": { en: "Optional response summary", "pt-BR": "Resumo opcional da resposta em Markdown" },
    },
  },
  "issue tree-state": {
    ...descriptionOnly("Get issue tree control state", "Consultar o estado de controle da árvore da tarefa"),
    arguments: rootIssueIdArgument,
    options: commonClientOptions,
  },
  "issue tree-preview": {
    ...descriptionOnly("Preview issue tree control changes", "Pré-visualizar alterações de controle da árvore da tarefa"),
    arguments: rootIssueIdArgument,
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "PreviewIssueTreeControl JSON payload", "pt-BR": "Payload JSON de PreviewIssueTreeControl" },
    },
  },
  "issue tree-holds": {
    ...descriptionOnly("List issue tree holds", "Listar retenções da árvore da tarefa"),
    arguments: rootIssueIdArgument,
    options: {
      ...commonClientOptions,
      "--status": { en: "active or released", "pt-BR": "active ou released" },
      "--mode": { en: "pause, resume, cancel, or restore", "pt-BR": "pause, resume, cancel ou restore" },
      "--include-members": { en: "Include hold members", "pt-BR": "Incluir os membros da retenção" },
    },
  },
  "issue tree-hold:create": {
    ...descriptionOnly("Create an issue tree hold from JSON", "Criar uma retenção da árvore da tarefa a partir de JSON"),
    arguments: rootIssueIdArgument,
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "CreateIssueTreeHold JSON payload", "pt-BR": "Payload JSON de CreateIssueTreeHold" },
    },
  },
  "issue tree-hold:get": {
    ...descriptionOnly("Get an issue tree hold", "Consultar uma retenção da árvore da tarefa"),
    arguments: treeHoldArguments,
    options: commonClientOptions,
  },
  "issue tree-hold:release": {
    ...descriptionOnly("Release an issue tree hold", "Liberar uma retenção da árvore da tarefa"),
    arguments: treeHoldArguments,
    options: { ...commonClientOptions, "--payload-json": { en: "ReleaseIssueTreeHold JSON payload", "pt-BR": "Payload JSON de ReleaseIssueTreeHold" } },
  },
  "issue attachments": {
    ...descriptionOnly("List issue attachments", "Listar anexos da tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue attachment:upload": {
    ...descriptionOnly("Upload an issue attachment", "Enviar um anexo da tarefa"),
    arguments: issueIdArgument,
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--file": { en: "File to upload", "pt-BR": "Arquivo para enviar" },
      "--comment-id": { en: "Attach to an issue comment", "pt-BR": "Anexar a um comentário da tarefa" },
    },
  },
  "issue attachment:download": {
    ...descriptionOnly("Download an attachment", "Baixar um anexo"),
    arguments: attachmentIdArgument,
    options: { ...commonClientOptions, "--out": { en: "Output file path; prints to stdout when omitted", "pt-BR": "Caminho do arquivo de saída; exibe no stdout quando omitido" } },
  },
  "issue attachment:delete": {
    ...descriptionOnly("Delete an attachment", "Excluir um anexo"),
    arguments: attachmentIdArgument,
    options: commonClientOptions,
  },
  "issue label:list": {
    ...descriptionOnly("List issue labels in a company", "Listar etiquetas de tarefas em uma organização"),
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "issue label:create": {
    ...descriptionOnly("Create an issue label", "Criar uma etiqueta de tarefa"),
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--name": { en: "Label name", "pt-BR": "Nome da etiqueta" },
      "--color": { en: "Label color, e.g. #4f46e5", "pt-BR": "Cor da etiqueta, por exemplo #4f46e5" },
    },
  },
  "issue label:delete": {
    ...descriptionOnly("Delete an issue label", "Excluir uma etiqueta de tarefa"),
    arguments: { labelId: { en: "Label ID", "pt-BR": "ID da etiqueta" } },
    options: commonClientOptions,
  },
  "issue feedback:votes": {
    ...descriptionOnly("List feedback votes for an issue", "Listar votos de feedback de uma tarefa"),
    arguments: issueIdArgument,
    options: commonClientOptions,
  },
  "issue feedback:vote": {
    ...descriptionOnly("Create or update a feedback vote", "Criar ou atualizar um voto de feedback"),
    arguments: issueIdArgument,
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "UpsertIssueFeedbackVote JSON payload", "pt-BR": "Payload JSON de UpsertIssueFeedbackVote" },
    },
  },
  "issue feedback:list": {
    ...descriptionOnly("List feedback traces for an issue", "Listar traces de feedback de uma tarefa"),
    arguments: issueIdArgument,
    options: {
      ...commonClientOptions,
      "--target-type": { en: "Filter by target type", "pt-BR": "Filtrar pelo tipo de destino" },
      "--vote": { en: "Filter by vote value", "pt-BR": "Filtrar pelo valor do voto" },
      "--status": { en: "Filter by trace status", "pt-BR": "Filtrar pelo status do trace" },
      "--from": { en: "Only include traces created at or after this timestamp", "pt-BR": "Incluir somente traces criados neste instante ou depois" },
      "--to": { en: "Only include traces created at or before this timestamp", "pt-BR": "Incluir somente traces criados neste instante ou antes" },
      "--shared-only": { en: "Only include traces eligible for sharing/export", "pt-BR": "Incluir somente traces elegíveis para compartilhamento ou exportação" },
      "--include-payload": { en: "Include stored payload snapshots in the response", "pt-BR": "Incluir snapshots dos payloads armazenados na resposta" },
    },
  },
  "issue runs": {
    ...descriptionOnly("List heartbeat runs associated with an issue", "Listar execuções de heartbeat associadas a uma tarefa"),
    arguments: issueIdOrIdentifierArgument,
    options: commonClientOptions,
  },
  "issue live-runs": {
    ...descriptionOnly("List queued and running heartbeat runs associated with an issue", "Listar execuções de heartbeat na fila ou em andamento associadas a uma tarefa"),
    arguments: issueIdOrIdentifierArgument,
    options: commonClientOptions,
  },
  "issue active-run": {
    ...descriptionOnly("Show the active heartbeat run associated with an issue", "Exibir a execução de heartbeat ativa associada a uma tarefa"),
    arguments: issueIdOrIdentifierArgument,
    options: commonClientOptions,
  },
  "issue feedback:export": {
    ...descriptionOnly("Export feedback traces for an issue", "Exportar traces de feedback de uma tarefa"),
    arguments: issueIdArgument,
    options: {
      ...commonClientOptions,
      "--target-type": { en: "Filter by target type", "pt-BR": "Filtrar pelo tipo de destino" },
      "--vote": { en: "Filter by vote value", "pt-BR": "Filtrar pelo valor do voto" },
      "--status": { en: "Filter by trace status", "pt-BR": "Filtrar pelo status do trace" },
      "--from": { en: "Only include traces created at or after this timestamp", "pt-BR": "Incluir somente traces criados neste instante ou depois" },
      "--to": { en: "Only include traces created at or before this timestamp", "pt-BR": "Incluir somente traces criados neste instante ou antes" },
      "--shared-only": { en: "Only include traces eligible for sharing/export", "pt-BR": "Incluir somente traces elegíveis para compartilhamento ou exportação" },
      "--include-payload": { en: "Include stored payload snapshots in the export", "pt-BR": "Incluir snapshots dos payloads armazenados na exportação" },
      "--out": { en: "Write export to a file path instead of stdout", "pt-BR": "Gravar a exportação em um arquivo em vez de exibi-la no stdout" },
      "--format": { en: "Export format: json or ndjson", "pt-BR": "Formato da exportação: json ou ndjson" },
    },
  },
  "issue checkout": {
    ...descriptionOnly("Checkout issue for an agent", "Fazer checkout da tarefa para um agente"),
    arguments: issueIdArgument,
    options: {
      ...commonClientOptions,
      "--agent-id": { en: "Agent ID", "pt-BR": "ID do agente" },
      "--expected-statuses": {
        en: "Expected current statuses",
        "pt-BR": "Status atuais esperados",
      },
    },
  },
  "issue release": {
    ...descriptionOnly(
      "Release issue execution locks; clear the assignee only for unfinished issues",
      "Liberar os bloqueios de execução da tarefa; remover o responsável somente se ela não estiver concluída",
    ),
    arguments: issueIdArgument,
    options: commonClientOptions,
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
  "agent instructions-bundle:update": {
    ...descriptionOnly("Update an agent instructions bundle", "Atualizar o pacote de instruções do agente"),
    arguments: { agentId: { en: "Agent ID", "pt-BR": "ID do agente" } },
    options: {
      ...commonClientOptions,
      "--payload-json": { en: "UpdateAgentInstructionsBundle JSON payload", "pt-BR": "Payload JSON de UpdateAgentInstructionsBundle" },
    },
  },
  "agent wake": {
    ...descriptionOnly("Request a heartbeat wakeup for an agent", "Solicitar o acionamento de um heartbeat do agente"),
    arguments: { agentRef: { en: "Agent ID or shortname/url-key", "pt-BR": "ID do agente ou nome curto/chave da URL" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID for shortname/url-key lookup", "pt-BR": "ID da organização para localizar por nome curto/chave da URL" },
      "--source": { en: "Invocation source (timer, assignment, on_demand, automation)", "pt-BR": "Origem da invocação (timer, assignment, on_demand, automation)" },
      "--trigger": { en: "Trigger detail (manual, ping, callback, system)", "pt-BR": "Detalhe do acionador (manual, ping, callback, system)" },
      "--reason": { en: "Wakeup reason", "pt-BR": "Motivo do acionamento" },
      "--payload": { en: "JSON object payload", "pt-BR": "Objeto JSON com o payload" },
      "--idempotency-key": { en: "Wakeup idempotency key", "pt-BR": "Chave de idempotência do acionamento" },
      "--force-fresh-session": { en: "Request a fresh adapter session", "pt-BR": "Solicitar uma nova sessão do adapter" },
    },
  },
  "agent local-cli": {
    ...descriptionOnly(
      "Create an agent API key, install local Paperclip skills for Codex/Claude, and print shell exports",
      "Criar uma chave de API do agente, instalar skills locais do Paperclip para Codex/Claude e exibir exportações de shell",
    ),
    arguments: { agentRef: { en: "Agent ID or shortname/url-key", "pt-BR": "ID do agente ou nome curto/chave da URL" } },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--key-name": { en: "API key label", "pt-BR": "Rótulo da chave de API" },
      "--no-install-skills": {
        en: "Skip installing Paperclip skills into ~/.codex/skills, ~/.claude/skills, and ~/.kimi-code/skills",
        "pt-BR": "Pular a instalação das skills do Paperclip em ~/.codex/skills, ~/.claude/skills e ~/.kimi-code/skills",
      },
    },
  },
  "agent prompt": descriptionOnly("Create/update Paperclip work using an agent persona", "Criar ou atualizar trabalho no Paperclip usando a persona de um agente"),
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
  teams: {
    description: { en: "App-shipped team catalog operations", "pt-BR": "Operações do catálogo de equipes incluídas no Paperclip" },
  },
  "teams browse": {
    description: { en: "Browse app-shipped catalog teams without installing them", "pt-BR": "Explorar equipes incluídas no catálogo sem instalá-las" },
    options: {
      "--kind": { en: "Catalog kind filter (bundled or optional)", "pt-BR": "Filtrar pelo tipo do catálogo (bundled ou optional)" },
      "--category": { en: "Catalog category filter", "pt-BR": "Filtrar pela categoria do catálogo" },
      "--query": { en: "Search catalog text", "pt-BR": "Buscar texto no catálogo" },
      ...commonClientOptions,
    },
  },
  "teams search": {
    description: { en: "Search app-shipped catalog teams without installing them", "pt-BR": "Buscar equipes incluídas no catálogo sem instalá-las" },
    arguments: { query: { en: "Search text", "pt-BR": "Texto da busca" } },
    options: {
      "--kind": { en: "Catalog kind filter (bundled or optional)", "pt-BR": "Filtrar pelo tipo do catálogo (bundled ou optional)" },
      "--category": { en: "Catalog category filter", "pt-BR": "Filtrar pela categoria do catálogo" },
      ...commonClientOptions,
    },
  },
  pipelines: {
    description: { en: "Pipeline and case operations", "pt-BR": "Operações de pipelines e casos" },
  },
  "pipelines list": {
    description: { en: "List pipelines", "pt-BR": "Listar pipelines" },
    options: companyOptions,
  },
  secrets: {
    description: { en: "Secret declaration and provider operations", "pt-BR": "Operações de declarações de segredos e provedores" },
  },
  "secrets list": {
    description: { en: "List secret metadata for a company", "pt-BR": "Listar metadados dos segredos de uma organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
    },
  },
  "secrets declarations": {
    description: { en: "List portable env declarations emitted by company export", "pt-BR": "Listar declarações portáteis de variáveis de ambiente geradas pela exportação da organização" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--include": { en: "Comma-separated include set: company,agents,projects,issues,tasks,skills", "pt-BR": "Itens a incluir, separados por vírgulas: company,agents,projects,issues,tasks,skills" },
      "--kind": { en: "Filter declarations: all | secret | plain", "pt-BR": "Filtrar declarações: all | secret | plain" },
    },
  },
  "secrets create": {
    description: { en: "Create a Paperclip-managed secret", "pt-BR": "Criar um segredo gerenciado pelo Paperclip" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--name": { en: "Secret display name", "pt-BR": "Nome de exibição do segredo" },
      "--key": { en: "Portable secret key", "pt-BR": "Chave portátil do segredo" },
      "--provider": { en: "Secret provider id", "pt-BR": "ID do provedor de segredos" },
      "--value": { en: "Secret value", "pt-BR": "Valor do segredo" },
      "--value-env": { en: "Read secret value from an environment variable", "pt-BR": "Ler o valor do segredo de uma variável de ambiente" },
      "--description": { en: "Description", "pt-BR": "Descrição" },
    },
  },
  "secrets link": {
    description: { en: "Link an external provider-owned secret without storing its value in Paperclip", "pt-BR": "Vincular um segredo de provedor externo sem armazenar seu valor no Paperclip" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--name": { en: "Secret display name", "pt-BR": "Nome de exibição do segredo" },
      "--provider": { en: "Secret provider id", "pt-BR": "ID do provedor de segredos" },
      "--external-ref": { en: "Provider secret ARN/name/path/reference", "pt-BR": "ARN/nome/caminho/referência do segredo no provedor" },
      "--key": { en: "Portable secret key", "pt-BR": "Chave portátil do segredo" },
      "--provider-version-ref": { en: "Provider version id or label", "pt-BR": "ID ou rótulo da versão no provedor" },
      "--description": { en: "Description", "pt-BR": "Descrição" },
    },
  },
  "secrets update": {
    description: { en: "Update secret metadata", "pt-BR": "Atualizar metadados do segredo" },
    arguments: { secretId: { en: "Secret ID", "pt-BR": "ID do segredo" } },
    options: { ...commonClientOptions, "--payload-json": { en: "UpdateSecret JSON payload", "pt-BR": "Payload JSON de UpdateSecret" } },
  },
  "secrets rotate": {
    description: { en: "Rotate a Paperclip-managed secret value", "pt-BR": "Girar o valor de um segredo gerenciado pelo Paperclip" },
    arguments: { secretId: { en: "Secret ID", "pt-BR": "ID do segredo" } },
    options: {
      ...commonClientOptions,
      "--value": { en: "New secret value", "pt-BR": "Novo valor do segredo" },
      "--value-env": { en: "Read new secret value from an environment variable", "pt-BR": "Ler o novo valor do segredo de uma variável de ambiente" },
    },
  },
  "secrets usage": {
    description: { en: "Show where a secret is referenced", "pt-BR": "Mostrar onde um segredo é usado" },
    arguments: { secretId: { en: "Secret ID", "pt-BR": "ID do segredo" } },
    options: commonClientOptions,
  },
  "secrets access-events": {
    description: { en: "List secret access events", "pt-BR": "Listar eventos de acesso ao segredo" },
    arguments: { secretId: { en: "Secret ID", "pt-BR": "ID do segredo" } },
    options: commonClientOptions,
  },
  "secrets delete": {
    description: { en: "Delete a secret", "pt-BR": "Excluir um segredo" },
    arguments: { secretId: { en: "Secret ID", "pt-BR": "ID do segredo" } },
    options: {
      ...commonClientOptions,
      "--yes": { en: "Required safety flag to confirm destructive action", "pt-BR": "Flag obrigatória para confirmar a ação destrutiva" },
      "--confirm": { en: "Repeat the secret ID to confirm deletion", "pt-BR": "Repita o ID do segredo para confirmar a exclusão" },
    },
  },
  "secrets doctor": {
    description: { en: "Run secret provider health checks through the Paperclip API", "pt-BR": "Verificar a integridade dos provedores de segredos pela API do Paperclip" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "secrets providers": {
    description: { en: "List configured secret provider descriptors", "pt-BR": "Listar as descrições dos provedores de segredos configurados" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "secrets provider-configs": {
    description: { en: "List company secret provider vault configs", "pt-BR": "Listar configurações de cofres de provedores de segredos da organização" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" } },
  },
  "secrets provider-config:create": {
    description: { en: "Create a secret provider vault config", "pt-BR": "Criar uma configuração de cofre de provedor de segredos" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "secrets provider-config:discovery-preview": {
    description: { en: "Preview provider vault secret discovery", "pt-BR": "Pré-visualizar a descoberta de segredos no cofre do provedor" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "secrets provider-config:get": {
    description: { en: "Get a secret provider vault config", "pt-BR": "Consultar uma configuração de cofre de provedor de segredos" },
    arguments: { configId: { en: "Provider config ID", "pt-BR": "ID da configuração do provedor" } },
    options: commonClientOptions,
  },
  "secrets provider-config:update": {
    description: { en: "Update a secret provider vault config", "pt-BR": "Atualizar uma configuração de cofre de provedor de segredos" },
    arguments: { configId: { en: "Provider config ID", "pt-BR": "ID da configuração do provedor" } },
    options: { ...commonClientOptions, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "secrets provider-config:default": {
    description: { en: "Set the default provider vault config", "pt-BR": "Definir a configuração de cofre padrão do provedor" },
    arguments: { configId: { en: "Provider config ID", "pt-BR": "ID da configuração do provedor" } },
    options: commonClientOptions,
  },
  "secrets provider-config:health": {
    description: { en: "Check provider vault health", "pt-BR": "Verificar a integridade do cofre do provedor" },
    arguments: { configId: { en: "Provider config ID", "pt-BR": "ID da configuração do provedor" } },
    options: commonClientOptions,
  },
  "secrets provider-config:delete": {
    description: { en: "Delete a secret provider vault config", "pt-BR": "Excluir uma configuração de cofre de provedor de segredos" },
    arguments: { configId: { en: "Provider config ID", "pt-BR": "ID da configuração do provedor" } },
    options: commonClientOptions,
  },
  "secrets remote-import:preview": {
    description: { en: "Preview remote secret import", "pt-BR": "Pré-visualizar a importação remota de segredos" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "secrets remote-import": {
    description: { en: "Import selected remote secrets", "pt-BR": "Importar os segredos remotos selecionados" },
    options: { ...commonClientOptions, "--company-id": { en: "Company ID", "pt-BR": "ID da organização" }, "--payload-json": { en: "JSON payload", "pt-BR": "Payload JSON" } },
  },
  "secrets migrate-inline-env": {
    description: { en: "Migrate inline sensitive agent env values into secret references", "pt-BR": "Migrar valores sensíveis inline do ambiente dos agentes para referências a segredos" },
    options: {
      ...commonClientOptions,
      "--company-id": { en: "Company ID", "pt-BR": "ID da organização" },
      "--apply": { en: "Persist changes; default is a dry run", "pt-BR": "Persistir as alterações; por padrão, apenas simula" },
    },
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
  const helpCommandDescription: LocaleText = {
    en: "display help for command",
    "pt-BR": "Exibir ajuda de um comando",
  };
  const visit = (command: Command, parents: string[]) => {
    const parts = command === root ? [] : [...parents, command.name()];
    const path = parts.join(" ");
    // Commander creates help subcommands lazily, outside `commands`, so localize
    // the generated descriptions on the root and the audited command groups.
    if (command === root || ["issue", "agent", "mcp", "runtime", "heartbeat", "context"].includes(path)) {
      command.helpCommand("help [command]", helpCommandDescription[locale]);
    }
    const help = operationHelp[path];
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
