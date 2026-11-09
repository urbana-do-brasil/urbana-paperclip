import type { SupportedLocale } from "@paperclipai/shared/localization";
import { getCliLocale } from "./index.js";

export const envLabMessageCatalog = {
  en: {
    host: "Host:",
    user: "User:",
    workspace: "Workspace:",
    log: "Log:",
    state: "State:",
    fixtureRunning: "SSH env-lab fixture is running.",
    fixtureNotRunning: "SSH env-lab fixture is not running ({statePath}).",
    fixtureNotRunningSimple: "SSH env-lab fixture is not running.",
    noFixtureRunning: "No SSH env-lab fixture was running ({statePath}).",
    fixtureStopped: "SSH env-lab fixture stopped.",
    prerequisitesReady: "SSH fixture prerequisites are installed.",
    prerequisitesIncomplete: "SSH fixture prerequisites are incomplete: {reason}",
    unknownReason: "unknown reason",
    fixtureStateStale: "SSH env-lab fixture state exists, but the process is not running.",
    privateKey: "Private key:",
    knownHosts: "Known hosts:",
    cleanup: "Cleanup:",
  },
  "pt-BR": {
    host: "Host:",
    user: "Usuário:",
    workspace: "Diretório de trabalho:",
    log: "Arquivo de log:",
    state: "Estado:",
    fixtureRunning: "O fixture SSH do env-lab está em execução.",
    fixtureNotRunning: "O fixture SSH do env-lab não está em execução ({statePath}).",
    fixtureNotRunningSimple: "O fixture SSH do env-lab não está em execução.",
    noFixtureRunning: "Nenhum fixture SSH do env-lab estava em execução ({statePath}).",
    fixtureStopped: "Fixture SSH do env-lab parado.",
    prerequisitesReady: "Os pré-requisitos do fixture SSH estão instalados.",
    prerequisitesIncomplete: "Faltam pré-requisitos do fixture SSH: {reason}",
    unknownReason: "motivo desconhecido",
    fixtureStateStale: "O estado do fixture SSH do env-lab existe, mas o processo não está em execução.",
    privateKey: "Chave privada:",
    knownHosts: "Hosts conhecidos:",
    cleanup: "Limpeza:",
  },
} as const;

type EnvLabMessageKey = keyof typeof envLabMessageCatalog.en;

export function envLabMessage(
  key: EnvLabMessageKey,
  values: Readonly<Record<string, string | number>> = {},
  locale: SupportedLocale = getCliLocale(),
): string {
  let message: string = envLabMessageCatalog[locale][key];
  for (const [name, value] of Object.entries(values)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}
