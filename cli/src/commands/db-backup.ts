import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { formatDatabaseBackupResult, runDatabaseBackup } from "@paperclipai/db";
import {
  expandHomePrefix,
  resolveDefaultBackupDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { readConfig, resolveConfigPath } from "../config/store.js";
import { printPaperclipCliBanner } from "../utils/banner.js";
import { dbBackupMessage } from "../localization/db-backup-operations.js";

type DbBackupOptions = {
  config?: string;
  dir?: string;
  retentionDays?: number;
  filenamePrefix?: string;
  json?: boolean;
};

function resolveConnectionString(configPath?: string): { value: string; source: string } {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) return { value: envUrl, source: "DATABASE_URL" };

  const config = readConfig(configPath);
  if (config?.database.mode === "postgres" && config.database.connectionString?.trim()) {
    return { value: config.database.connectionString.trim(), source: "config.database.connectionString" };
  }

  const port = config?.database.embeddedPostgresPort ?? 54329;
  return {
    value: `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`,
    source: `embedded-postgres@${port}`,
  };
}

function normalizeRetentionDays(value: number | undefined, fallback: number, json = false): number {
  const candidate = value ?? fallback;
  if (!Number.isInteger(candidate) || candidate < 1) {
    throw new Error(dbBackupMessage("invalidRetention", { days: String(candidate) }, json));
  }
  return candidate;
}

function resolveBackupDir(raw: string): string {
  return path.resolve(expandHomePrefix(raw.trim()));
}

export async function dbBackupCommand(opts: DbBackupOptions): Promise<void> {
  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclip db:backup ")));

  const configPath = resolveConfigPath(opts.config);
  const config = readConfig(opts.config);
  const connection = resolveConnectionString(opts.config);
  const defaultDir = resolveDefaultBackupDir(resolvePaperclipInstanceId());
  const configuredDir = opts.dir?.trim() || config?.database.backup.dir || defaultDir;
  const backupDir = resolveBackupDir(configuredDir);
  const retentionDays = normalizeRetentionDays(
    opts.retentionDays,
    config?.database.backup.retentionDays ?? 30,
    opts.json,
  );
  const filenamePrefix = opts.filenamePrefix?.trim() || "paperclip";

  p.log.message(pc.dim(`${dbBackupMessage("config", {}, opts.json)} ${configPath}`));
  p.log.message(pc.dim(`${dbBackupMessage("source", {}, opts.json)} ${connection.source}`));
  p.log.message(pc.dim(`${dbBackupMessage("directory", {}, opts.json)} ${backupDir}`));
  p.log.message(pc.dim(dbBackupMessage("retention", { days: retentionDays }, opts.json)));

  const spinner = p.spinner();
  spinner.start(dbBackupMessage("starting", {}, opts.json));
  try {
    const result = await runDatabaseBackup({
      connectionString: connection.value,
      backupDir,
      retention: { dailyDays: retentionDays, weeklyWeeks: 4, monthlyMonths: 1 },
      filenamePrefix,
    });
    spinner.stop(dbBackupMessage("saved", { result: formatDatabaseBackupResult(result) }, opts.json));

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            backupFile: result.backupFile,
            sizeBytes: result.sizeBytes,
            prunedCount: result.prunedCount,
            backupDir,
            retentionDays,
            connectionSource: connection.source,
          },
          null,
          2,
        ),
      );
    }
    p.outro(pc.green(dbBackupMessage("done", {}, opts.json)));
  } catch (err) {
    spinner.stop(pc.red(dbBackupMessage("failed", {}, opts.json)));
    throw err;
  }
}
