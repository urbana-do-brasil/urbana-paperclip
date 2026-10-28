import type { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";

type LocaleText = Record<SupportedLocale, string>;
type CommandHelp = { description: LocaleText; options?: Record<string, LocaleText> };

/** Human-facing help for local install and operations commands. Command and
 * option names stay stable so scripts and documentation keep their contracts. */
const adminHelp: Record<string, CommandHelp> = {
  install: {
    description: { en: "Install Paperclip into a managed per-user CLI store", "pt-BR": "Instalar o Paperclip em um diretório gerenciado da CLI do usuário" },
    options: {
      "--canary": { en: "Install the npm canary channel", "pt-BR": "Instalar a versão canary do npm" },
      "--version": { en: "Install an exact published npm version", "pt-BR": "Instalar uma versão exata publicada no npm" },
      "--ref": { en: "Install a GitHub branch, tag, or commit SHA", "pt-BR": "Instalar uma branch, tag ou SHA de commit do GitHub" },
      "--repo": { en: "Override the GitHub repository used with --ref", "pt-BR": "Substituir o repositório GitHub usado com --ref" },
      "--yes": { en: "Consent to git-ref code execution and supported shell PATH updates without prompting", "pt-BR": "Autorizar a execução do código da referência Git e atualizações compatíveis do PATH sem confirmação" },
    },
  },
  uninstall: {
    description: { en: "Remove the managed CLI install while preserving user data", "pt-BR": "Remover a instalação gerenciada da CLI sem apagar os dados do usuário" },
  },
  update: {
    description: { en: "Check, update, or roll back the Paperclip CLI", "pt-BR": "Verificar, atualizar ou reverter a CLI do Paperclip" },
    options: {
      "--latest": { en: "Switch to the latest stable channel", "pt-BR": "Mudar para o canal estável mais recente" },
      "--canary": { en: "Switch to the canary channel", "pt-BR": "Mudar para o canal canary" },
      "--version": { en: "Install an exact published version", "pt-BR": "Instalar uma versão exata publicada" },
      "--rollback": { en: "Flip back to the retained previous managed payload", "pt-BR": "Voltar à versão gerenciada anterior que foi mantida" },
      "--check": { en: "Check for an available update without applying it", "pt-BR": "Verificar se há uma atualização disponível sem aplicá-la" },
      "--dry-run": { en: "Print the action without changing anything", "pt-BR": "Mostrar a ação sem alterar nada" },
      "--json": { en: "Print machine-readable output", "pt-BR": "Exibir saída legível por máquina" },
      "--yes": { en: "Confirm an explicit downgrade", "pt-BR": "Confirmar uma reversão explícita para versão anterior" },
      "--no-backup": { en: "Skip the pre-update database backup", "pt-BR": "Pular o backup do banco de dados antes da atualização" },
    },
  },
  doctor: {
    description: { en: "Run diagnostic checks on your Paperclip setup", "pt-BR": "Executar verificações de diagnóstico da instalação do Paperclip" },
    options: {
      "--repair": { en: "Attempt to repair issues automatically", "pt-BR": "Tentar corrigir problemas automaticamente" },
      "--yes": { en: "Skip repair confirmation prompts", "pt-BR": "Pular as confirmações de reparo" },
    },
  },
  service: {
    description: { en: "Manage Paperclip as a background service", "pt-BR": "Gerenciar o Paperclip como serviço em segundo plano" },
    options: { "--instance": { en: "Local instance id (default: default)", "pt-BR": "ID da instância local (padrão: default)" }, "--json": { en: "Print machine-readable JSON", "pt-BR": "Exibir JSON legível por máquina" } },
  },
  "service install": {
    description: { en: "Install and register the background service", "pt-BR": "Instalar e registrar o serviço em segundo plano" },
    options: {
      "--no-start-now": { en: "Install without starting now", "pt-BR": "Instalar sem iniciar agora" },
      "--no-start-on-login": { en: "Install without enabling start on login", "pt-BR": "Instalar sem habilitar a inicialização ao entrar" },
      "--enable-linger": { en: "Allow systemd startup without an active login session", "pt-BR": "Permitir que o systemd inicie sem uma sessão de login ativa" },
    },
  },
  "service uninstall": {
    description: { en: "Stop, disable, and remove the background service", "pt-BR": "Parar, desabilitar e remover o serviço em segundo plano" },
  },
  "service start": {
    description: { en: "Start the background service", "pt-BR": "Iniciar o serviço em segundo plano" },
  },
  "service stop": {
    description: { en: "Stop the background service", "pt-BR": "Parar o serviço em segundo plano" },
  },
  "service restart": {
    description: { en: "Hot-restart the service while preserving active agent runs", "pt-BR": "Reiniciar o serviço sem interromper as execuções ativas dos agentes" },
    options: {
      "--wait": { en: "Wait for active runs to drain instead of adopting them", "pt-BR": "Aguardar a conclusão das execuções ativas em vez de retomá-las" },
      "--expected-version": { en: "Require the restarted server to report this version", "pt-BR": "Exigir que o servidor reiniciado informe esta versão" },
    },
  },
  "service status": {
    description: { en: "Show supervisor and health status", "pt-BR": "Mostrar o estado do supervisor e da saúde do serviço" },
  },
  "service logs": {
    description: { en: "Show service logs", "pt-BR": "Mostrar os logs do serviço" },
    options: {
      "--follow": { en: "Follow new log output", "pt-BR": "Acompanhar novas linhas do log" },
      "--lines": { en: "Number of recent lines", "pt-BR": "Quantidade de linhas recentes" },
    },
  },
};

export function applyAdminHelpLocalization(root: Command, locale: SupportedLocale): void {
  const visit = (command: Command, parents: string[]) => {
    const parts = command === root ? [] : [...parents, command.name()];
    const help = adminHelp[parts.join(" ")];
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
