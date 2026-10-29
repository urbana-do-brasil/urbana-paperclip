import path from "node:path";
import { DEFAULT_USER_LOCALE, isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";
import { expandHomePrefix } from "../config/home.js";
import { readRawProfileLocale } from "../client/context.js";
import type { Command, Option } from "commander";

const messages = {
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
    companyCurrentUnavailable: "Current company is not available. Pass --company-id, set PAPERCLIP_COMPANY_ID, set a context profile companyId, or authenticate with an agent API key.",
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
    companyCurrentUnavailable: "A organização atual não está disponível. Informe --company-id, defina PAPERCLIP_COMPANY_ID, configure companyId em um perfil de contexto ou autentique-se com uma chave de API de agente.",
  },
} as const;

type MessageKey = keyof typeof messages.en;
let currentLocale: SupportedLocale = DEFAULT_USER_LOCALE;
let commandLineShape: Command | undefined;
export function getCliLocale(): SupportedLocale { return currentLocale; }
export function cliMessage(key: MessageKey): string { return messages[currentLocale][key]; }
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
