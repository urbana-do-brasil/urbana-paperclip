import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  backupInvalidConfig,
  readConfig,
  writeConfig,
  configExists,
  resolveConfigPath,
} from "../config/store.js";
import {
  findPaperclipConfigKeyWarnings,
  type PaperclipConfig,
} from "../config/schema.js";
import { ensureLocalSecretsKeyFile } from "../config/secrets-key.js";
import { promptDatabase } from "../prompts/database.js";
import { promptLlm } from "../prompts/llm.js";
import { promptLogging } from "../prompts/logging.js";
import { defaultSecretsConfig, promptSecrets } from "../prompts/secrets.js";
import { defaultStorageConfig, promptStorage } from "../prompts/storage.js";
import { promptServer } from "../prompts/server.js";
import {
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultLogsDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { printPaperclipCliBanner } from "../utils/banner.js";
import { setupMessage } from "../localization/setup.js";

type Section = "llm" | "database" | "logging" | "server" | "storage" | "secrets";

function sectionLabels(): Record<Section, string> {
  return {
    llm: setupMessage("sectionLlm"),
    database: setupMessage("sectionDatabase"),
    logging: setupMessage("sectionLogging"),
    server: setupMessage("sectionServer"),
    storage: setupMessage("sectionStorage"),
    secrets: setupMessage("sectionSecrets"),
  };
}

function defaultConfig(): PaperclipConfig {
  const instanceId = resolvePaperclipInstanceId();
  return {
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(instanceId),
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: resolveDefaultBackupDir(instanceId),
      },
    },
    logging: {
      mode: "file",
      logDir: resolveDefaultLogsDir(instanceId),
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      bind: "loopback",
      host: "127.0.0.1",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    telemetry: {
      enabled: true,
    },
    storage: defaultStorageConfig(),
    secrets: defaultSecretsConfig(),
  };
}

export async function configure(opts: {
  config?: string;
  section?: string;
}): Promise<void> {
  const labels = sectionLabels();
  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclip configure ")));
  const configPath = resolveConfigPath(opts.config);

  if (!configExists(opts.config)) {
    p.log.error(setupMessage("noConfigFound"));
    p.outro("");
    process.exitCode = 1;
    return;
  }

  let config: PaperclipConfig;
  let invalidBackupPath: string | undefined;
  try {
    config = readConfig(opts.config) ?? defaultConfig();
    for (const warning of findPaperclipConfigKeyWarnings(config)) {
      p.log.warn(setupMessage("unknownConfigKey", { path: warning.path, suggestion: warning.suggestion }));
    }
  } catch (err) {
    const backupPath = backupInvalidConfig(opts.config);
    p.log.warn(
      setupMessage("invalidConfigBackup", { backupPath, error: err instanceof Error ? err.message : String(err) }),
    );

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      p.log.error(
        setupMessage("invalidConfigNonInteractive", { configPath, backupPath }),
      );
      p.outro("");
      process.exitCode = 1;
      return;
    }

    const repair = await p.confirm({
      message: setupMessage("repairDefaults", { backupPath }),
      initialValue: false,
    });
    if (p.isCancel(repair) || !repair) {
      p.cancel(setupMessage("configUnchangedBackup", { backupPath }));
      process.exitCode = 1;
      return;
    }

    config = defaultConfig();
    invalidBackupPath = backupPath;
  }

  let section: Section | undefined = opts.section as Section | undefined;

  if (section && !labels[section]) {
    p.log.error(setupMessage("unknownSection", { section, sections: Object.keys(labels).join(", ") }));
    p.outro("");
    process.exitCode = 1;
    return;
  }

  // Section selection loop
  let continueLoop = true;
  while (continueLoop) {
    if (!section) {
      const choice = await p.select({
        message: setupMessage("chooseSection"),
        options: Object.entries(labels).map(([value, label]) => ({
          value: value as Section,
          label,
        })),
      });

      if (p.isCancel(choice)) {
        p.cancel(setupMessage("configurationCancelled"));
        return;
      }

      section = choice;
    }

    p.log.step(pc.bold(labels[section]));

    switch (section) {
      case "database":
        config.database = await promptDatabase(config.database);
        break;
      case "llm": {
        const llm = await promptLlm();
        if (llm) {
          config.llm = llm;
        } else {
          delete config.llm;
        }
        break;
      }
      case "logging":
        config.logging = await promptLogging();
        break;
      case "server":
        {
          const { server, auth } = await promptServer({
            currentServer: config.server,
            currentAuth: config.auth,
          });
          config.server = server;
          config.auth = auth;
        }
        break;
      case "storage":
        config.storage = await promptStorage(config.storage);
        break;
      case "secrets":
        config.secrets = await promptSecrets(config.secrets);
        {
          const keyResult = ensureLocalSecretsKeyFile(config, configPath);
          if (keyResult.status === "created") {
            p.log.success(setupMessage("createdSecretsKey", { path: pc.dim(keyResult.path) }));
          } else if (keyResult.status === "existing") {
            p.log.message(pc.dim(setupMessage("usingSecretsKey", { path: keyResult.path })));
          } else if (keyResult.status === "skipped_provider") {
            p.log.message(pc.dim(setupMessage("skipLocalSecretsProvider")));
          } else {
            p.log.message(pc.dim(setupMessage("skipLocalSecretsEnv")));
          }
        }
        break;
    }

    config.$meta.updatedAt = new Date().toISOString();
    config.$meta.source = "configure";

    const written = writeConfig(config, opts.config, {
      invalidBackupPath,
    });
    invalidBackupPath = undefined;
    if (written) {
      p.log.success(setupMessage("sectionUpdated", { section: labels[section] }));
    } else {
      p.log.message(pc.dim(setupMessage("sectionUnchanged", { section: labels[section] })));
    }

    // If section was provided via CLI flag, don't loop
    if (opts.section) {
      continueLoop = false;
    } else {
      const another = await p.confirm({
        message: setupMessage("configureAnother"),
        initialValue: false,
      });

      if (p.isCancel(another) || !another) {
        continueLoop = false;
      } else {
        section = undefined; // Reset to show picker again
      }
    }
  }

  p.outro(setupMessage("configurationSavedOutro"));
}
