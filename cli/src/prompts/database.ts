import * as p from "@clack/prompts";
import type { DatabaseConfig } from "../config/schema.js";
import {
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { setupMessage } from "../localization/setup.js";

export async function promptDatabase(current?: DatabaseConfig): Promise<DatabaseConfig> {
  const instanceId = resolvePaperclipInstanceId();
  const defaultEmbeddedDir = resolveDefaultEmbeddedPostgresDir(instanceId);
  const defaultBackupDir = resolveDefaultBackupDir(instanceId);
  const base: DatabaseConfig = current ?? {
    mode: "embedded-postgres",
    embeddedPostgresDataDir: defaultEmbeddedDir,
    embeddedPostgresPort: 54329,
    backup: {
      enabled: true,
      intervalMinutes: 60,
      retentionDays: 30,
      dir: defaultBackupDir,
    },
  };

  const mode = await p.select({
    message: setupMessage("dbModeMessage"),
    options: [
      { value: "embedded-postgres" as const, label: setupMessage("dbEmbeddedOption"), hint: setupMessage("recommendedHint") },
      { value: "postgres" as const, label: setupMessage("dbExternalOption") },
    ],
    initialValue: base.mode,
  });

  if (p.isCancel(mode)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  let connectionString: string | undefined = base.connectionString;
  let embeddedPostgresDataDir = base.embeddedPostgresDataDir || defaultEmbeddedDir;
  let embeddedPostgresPort = base.embeddedPostgresPort || 54329;
  const embeddedPortDefault = String(base.embeddedPostgresPort || 54329);

  if (mode === "postgres") {
    // Clack validates the raw input before applying defaultValue, so an
    // Enter press hands the validator an empty string. Validate the value
    // that will actually be submitted — the typed input, or the default.
    const connectionStringDefault = base.connectionString ?? "";
    const value = await p.text({
      message: setupMessage("dbConnectionMessage"),
      defaultValue: connectionStringDefault,
      placeholder: "postgres://user:pass@localhost:5432/paperclip",
      validate: (val) => {
        const candidate = val || connectionStringDefault;
        if (!candidate) return setupMessage("dbConnectionRequired");
        if (!candidate.startsWith("postgres")) return setupMessage("dbConnectionScheme");
      },
    });

    if (p.isCancel(value)) {
      p.cancel(setupMessage("setupCancelled"));
      process.exit(0);
    }

    connectionString = value;
  } else {
    const dataDir = await p.text({
      message: setupMessage("dbDataDirMessage"),
      defaultValue: base.embeddedPostgresDataDir || defaultEmbeddedDir,
      placeholder: defaultEmbeddedDir,
    });

    if (p.isCancel(dataDir)) {
      p.cancel(setupMessage("setupCancelled"));
      process.exit(0);
    }

    embeddedPostgresDataDir = dataDir || defaultEmbeddedDir;

    const portValue = await p.text({
      message: setupMessage("dbPortMessage"),
      defaultValue: embeddedPortDefault,
      placeholder: "54329",
      validate: (val) => {
        const n = Number(val || embeddedPortDefault);
        if (!Number.isInteger(n) || n < 1 || n > 65535) return setupMessage("dbPortInvalid");
      },
    });

    if (p.isCancel(portValue)) {
      p.cancel(setupMessage("setupCancelled"));
      process.exit(0);
    }

    embeddedPostgresPort = Number(portValue || embeddedPortDefault);
    connectionString = undefined;
  }

  const backupEnabled = await p.confirm({
    message: setupMessage("dbBackupsMessage"),
    initialValue: base.backup.enabled,
  });
  if (p.isCancel(backupEnabled)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  const backupDirDefault = base.backup.dir || defaultBackupDir;
  const backupDirInput = await p.text({
    message: setupMessage("dbBackupDirMessage"),
    defaultValue: backupDirDefault,
    placeholder: defaultBackupDir,
    validate: (val) => ((val || backupDirDefault).trim().length === 0 ? setupMessage("dbBackupDirRequired") : undefined),
  });
  if (p.isCancel(backupDirInput)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  const backupIntervalDefault = String(base.backup.intervalMinutes || 60);
  const backupRetentionDefault = String(base.backup.retentionDays || 30);
  const backupIntervalInput = await p.text({
    message: setupMessage("dbBackupIntervalMessage"),
    defaultValue: backupIntervalDefault,
    placeholder: "60",
    validate: (val) => {
      const n = Number(val || backupIntervalDefault);
      if (!Number.isInteger(n) || n < 1) return setupMessage("dbBackupIntervalInvalid");
      if (n > 10080) return setupMessage("dbBackupIntervalMax");
      return undefined;
    },
  });
  if (p.isCancel(backupIntervalInput)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  const backupRetentionInput = await p.text({
    message: setupMessage("dbBackupRetentionMessage"),
    defaultValue: backupRetentionDefault,
    placeholder: "30",
    validate: (val) => {
      const n = Number(val || backupRetentionDefault);
      if (!Number.isInteger(n) || n < 1) return setupMessage("dbBackupRetentionInvalid");
      if (n > 3650) return setupMessage("dbBackupRetentionMax");
      return undefined;
    },
  });
  if (p.isCancel(backupRetentionInput)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  return {
    mode,
    connectionString,
    embeddedPostgresDataDir,
    embeddedPostgresPort,
    backup: {
      enabled: backupEnabled,
      intervalMinutes: Number(backupIntervalInput || backupIntervalDefault),
      retentionDays: Number(backupRetentionInput || backupRetentionDefault),
      dir: backupDirInput || defaultBackupDir,
    },
  };
}
