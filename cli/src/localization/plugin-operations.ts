import type { SupportedLocale } from "@paperclipai/shared/localization";
import { getCliLocale, isCliJsonRequested } from "./index.js";

export const pluginOperationMessageCatalog = {
  en: {
    noPlugins: "No plugins installed.",
    noExamples: "No bundled examples available.",
    targetPaperclip: "Target Paperclip:",
    targetHealth: "health:",
    targetUnreachable: "unreachable",
    targetVerify: "Verify the right instance is running, then pass {apiBaseOption} or set {apiUrlEnv} if it lives elsewhere.",
    targetHealthNoDetails: "ok (no details exposed)",
    createdScaffold: "✓ Created plugin scaffold at {outputDir}",
    nextCommands: "Next commands:",
    invalidTemplate: "Invalid template '{template}'. Expected one of: {options}",
    invalidPluginName: "Invalid plugin name. Use lowercase letters, numbers, dots, underscores, or hyphens; scoped names may use @scope/name.",
    invalidCategory: "Invalid category '{category}'. Expected one of: {options}",
    outputDirectoryExists: "Directory already exists: {outputDir}",
    localInstallTrustedCode: "Local plugin installs run trusted local code from your machine.",
    localInstallWatch: "Keep {devCommand} running in {packagePath}; Paperclip watches rebuilt dist output and reloads the plugin worker.",
    installingLocal: "Installing plugin from local path: {packageName}",
    installingPackage: "Installing plugin: {packageName}{versionSuffix}",
    installReturnedNoRecord: "Install returned no plugin record.",
    installed: "✓ Installed {pluginKey} v{version} ({status})",
    warning: "Warning:",
    uninstalling: "Uninstalling plugin: {pluginKey}",
    uninstallingAndPurging: "Uninstalling and purging plugin: {pluginKey}",
    uninstalled: "✓ Uninstalled {pluginKey}{purgedSuffix}",
    purged: " (purged)",
    enabled: "✓ Enabled {pluginKey} — status: {status}",
    disabled: "Disabled {pluginKey} — status: {status}",
    pluginNotFound: "Plugin not found: {pluginKey}",
    lastError: "Last error:",
    keyLabel: "key",
    statusLabel: "status",
    versionLabel: "version",
    idLabel: "id",
    errorLabel: "error",
    companyIdRequired: "Company ID is required. Pass --company-id, set PAPERCLIP_COMPANY_ID, or set context profile companyId via `paperclipai context set`.",
    invalidInteger: "Invalid integer value: {value}",
  },
  "pt-BR": {
    noPlugins: "Nenhum plugin instalado.",
    noExamples: "Nenhum exemplo integrado disponível.",
    targetPaperclip: "Paperclip de destino:",
    targetHealth: "integridade:",
    targetUnreachable: "indisponível",
    targetVerify: "Confira se a instância correta está em execução. Se ela estiver em outro endereço, informe {apiBaseOption} ou defina {apiUrlEnv}.",
    targetHealthNoDetails: "ok (sem detalhes disponíveis)",
    createdScaffold: "✓ Estrutura do plugin criada em {outputDir}",
    nextCommands: "Próximos comandos:",
    invalidTemplate: "Modelo inválido '{template}'. As opções válidas são: {options}",
    invalidPluginName: "Nome de plugin inválido. Use letras minúsculas, números, pontos, sublinhados ou hífens; nomes com escopo podem usar @escopo/nome.",
    invalidCategory: "Categoria inválida '{category}'. As opções válidas são: {options}",
    outputDirectoryExists: "O diretório já existe: {outputDir}",
    localInstallTrustedCode: "A instalação de plugins locais executa código confiável da sua máquina.",
    localInstallWatch: "Mantenha {devCommand} em execução em {packagePath}; o Paperclip monitora a saída dist recompilada e reinicia o worker do plugin.",
    installingLocal: "Instalando plugin do caminho local: {packageName}",
    installingPackage: "Instalando plugin: {packageName}{versionSuffix}",
    installReturnedNoRecord: "A instalação não retornou o registro do plugin.",
    installed: "✓ Plugin {pluginKey} v{version} instalado ({status})",
    warning: "Aviso:",
    uninstalling: "Desinstalando plugin: {pluginKey}",
    uninstallingAndPurging: "Desinstalando e removendo todos os dados do plugin: {pluginKey}",
    uninstalled: "✓ Plugin {pluginKey} desinstalado{purgedSuffix}",
    purged: " (dados removidos)",
    enabled: "✓ Plugin {pluginKey} ativado — status: {status}",
    disabled: "Plugin {pluginKey} desativado — status: {status}",
    pluginNotFound: "Plugin não encontrado: {pluginKey}",
    lastError: "Último erro:",
    keyLabel: "chave",
    statusLabel: "status",
    versionLabel: "versão",
    idLabel: "ID",
    errorLabel: "erro",
    companyIdRequired: "O ID da organização é obrigatório. Informe --company-id, defina PAPERCLIP_COMPANY_ID ou configure companyId no perfil de contexto com `paperclipai context set`.",
    invalidInteger: "Valor inteiro inválido: {value}",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

type PluginOperationMessageKey = keyof typeof pluginOperationMessageCatalog.en;

export function pluginOperationMessage(
  key: PluginOperationMessageKey,
  values: Readonly<Record<string, string | number>> = {},
  locale?: SupportedLocale,
): string {
  const resolvedLocale = locale ?? (isCliJsonRequested() ? "en" : getCliLocale());
  let message: string = pluginOperationMessageCatalog[resolvedLocale][key];
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}
