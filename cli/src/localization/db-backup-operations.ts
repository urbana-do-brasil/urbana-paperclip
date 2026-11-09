import { getCliLocale } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const messages = {
  en: {
    invalidRetention: "Invalid retention days '{days}'. Use a positive integer.",
    config: "Config:", source: "Connection source:", directory: "Backup dir:",
    retention: "Retention: {days} day(s)", starting: "Creating database backup...",
    saved: "Backup saved: {result}", done: "Backup completed.", failed: "Backup failed.",
  },
  "pt-BR": {
    invalidRetention: "Dias de retenção inválidos '{days}'. Use um número inteiro positivo.",
    config: "Configuração:", source: "Origem da conexão:", directory: "Diretório de backup:",
    retention: "Retenção: {days} dia(s)", starting: "Criando backup do banco de dados...",
    saved: "Backup salvo: {result}", done: "Backup concluído.", failed: "Falha no backup.",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

type Key = keyof typeof messages.en;
export function dbBackupMessage(key: Key, values: Record<string, string | number> = {}, json = false): string {
  let result: string = messages[json ? "en" : getCliLocale()][key];
  for (const [name, value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, String(value));
  return result;
}
