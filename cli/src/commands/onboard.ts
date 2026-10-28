import * as p from "@clack/prompts";
import path from "node:path";
import pc from "picocolors";
import {
  AUTH_BASE_URL_MODES,
  BIND_MODES,
  DEPLOYMENT_EXPOSURES,
  DEPLOYMENT_MODES,
  SECRET_PROVIDERS,
  STORAGE_PROVIDERS,
  inferBindModeFromHost,
  resolveRuntimeBind,
  type BindMode,
  type AuthBaseUrlMode,
  type DeploymentExposure,
  type DeploymentMode,
  type SecretProvider,
  type StorageProvider,
} from "@paperclipai/shared";
import {
  backupInvalidConfig,
  configExists,
  readConfig,
  resolveConfigPath,
  writeConfig,
} from "../config/store.js";
import {
  findPaperclipConfigKeyWarnings,
  type PaperclipConfig,
} from "../config/schema.js";
import { ensureAgentJwtSecret, ensureToolActionSigningSecret, resolveAgentJwtEnvFile } from "../config/env.js";
import { ensureLocalSecretsKeyFile } from "../config/secrets-key.js";
import { promptDatabase } from "../prompts/database.js";
import { promptLlm } from "../prompts/llm.js";
import { promptLogging } from "../prompts/logging.js";
import { defaultSecretsConfig } from "../prompts/secrets.js";
import { defaultStorageConfig, promptStorage } from "../prompts/storage.js";
import { promptServer } from "../prompts/server.js";
import { buildPresetServerConfig } from "../config/server-bind.js";
import {
  describeLocalInstancePaths,
  expandHomePrefix,
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultLogsDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { bootstrapCeoInvite } from "./auth-bootstrap-ceo.js";
import { printPaperclipCliBanner } from "../utils/banner.js";
import {
  getTelemetryClient,
  trackInstallStarted,
  trackInstallCompleted,
} from "../telemetry.js";
import {
  handleOnboardService,
  handoffToOnboardedService,
  shouldOfferForegroundStart,
} from "../onboard-service.js";
import { readInstallManifest, isManagedExecutable } from "../install-store.js";
import { setupMessage } from "../localization/setup.js";

type SetupMode = "quickstart" | "advanced";

type OnboardOptions = {
  config?: string;
  run?: boolean;
  yes?: boolean;
  invokedByRun?: boolean;
  bind?: BindMode;
  installService?: boolean;
};

type OnboardDefaults = Pick<PaperclipConfig, "database" | "logging" | "server" | "auth" | "storage" | "secrets">;

const ONBOARD_ENV_KEYS = [
  "PAPERCLIP_PUBLIC_URL",
  "DATABASE_URL",
  "PAPERCLIP_DB_BACKUP_ENABLED",
  "PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES",
  "PAPERCLIP_DB_BACKUP_RETENTION_DAYS",
  "PAPERCLIP_DB_BACKUP_DIR",
  "PAPERCLIP_DEPLOYMENT_MODE",
  "PAPERCLIP_DEPLOYMENT_EXPOSURE",
  "PAPERCLIP_BIND",
  "PAPERCLIP_BIND_HOST",
  "PAPERCLIP_TAILNET_BIND_HOST",
  "HOST",
  "PORT",
  "SERVE_UI",
  "PAPERCLIP_ALLOWED_HOSTNAMES",
  "PAPERCLIP_AUTH_BASE_URL_MODE",
  "PAPERCLIP_AUTH_PUBLIC_BASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_BASE_URL",
  "PAPERCLIP_STORAGE_PROVIDER",
  "PAPERCLIP_STORAGE_LOCAL_DIR",
  "PAPERCLIP_STORAGE_S3_BUCKET",
  "PAPERCLIP_STORAGE_S3_REGION",
  "PAPERCLIP_STORAGE_S3_ENDPOINT",
  "PAPERCLIP_STORAGE_S3_PREFIX",
  "PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE",
  "PAPERCLIP_SECRETS_PROVIDER",
  "PAPERCLIP_SECRETS_STRICT_MODE",
  "PAPERCLIP_SECRETS_MASTER_KEY_FILE",
] as const;

function parseBooleanFromEnv(rawValue: string | undefined): boolean | null {
  if (rawValue === undefined) return null;
  const lower = rawValue.trim().toLowerCase();
  if (lower === "true" || lower === "1" || lower === "yes") return true;
  if (lower === "false" || lower === "0" || lower === "no") return false;
  return null;
}

async function runOnboardedForeground(configPath: string): Promise<void> {
  const previousOpenOnListen = process.env.PAPERCLIP_OPEN_ON_LISTEN;
  const browserDisabled = parseBooleanFromEnv(process.env.PAPERCLIP_NO_BROWSER) === true;
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  // The server consumes this flag in its listen callback. Keep it scoped to
  // this foreground start so a later in-process restart does not open another
  // tab. Explicit configuration wins over the interactive default, while the
  // broad no-browser switch wins over an earlier explicit opt-in.
  if (browserDisabled) {
    process.env.PAPERCLIP_OPEN_ON_LISTEN = "false";
  } else if (interactive && previousOpenOnListen === undefined) {
    process.env.PAPERCLIP_OPEN_ON_LISTEN = "true";
  }

  try {
    const { runCommand } = await import("./run.js");
    await runCommand({ config: configPath, repair: true, yes: true });
  } finally {
    if (previousOpenOnListen === undefined) {
      delete process.env.PAPERCLIP_OPEN_ON_LISTEN;
    } else {
      process.env.PAPERCLIP_OPEN_ON_LISTEN = previousOpenOnListen;
    }
  }
}

function parseNumberFromEnv(rawValue: string | undefined): number | null {
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parseEnumFromEnv<T extends string>(rawValue: string | undefined, allowedValues: readonly T[]): T | null {
  if (!rawValue) return null;
  return allowedValues.includes(rawValue as T) ? (rawValue as T) : null;
}

function resolvePathFromEnv(rawValue: string | undefined): string | null {
  if (!rawValue || rawValue.trim().length === 0) return null;
  return path.resolve(expandHomePrefix(rawValue.trim()));
}

function describeServerBinding(server: Pick<PaperclipConfig["server"], "bind" | "customBindHost" | "host" | "port">): string {
  const bind = server.bind ?? inferBindModeFromHost(server.host);
  const detail =
    bind === "custom"
      ? server.customBindHost ?? server.host
      : bind === "tailnet"
        ? "detected tailscale address"
        : server.host;
  return `${bind}${detail ? ` (${detail})` : ""}:${server.port}`;
}

function quickstartDefaultsFromEnv(opts?: { preferTrustedLocal?: boolean }): {
  defaults: OnboardDefaults;
  usedEnvKeys: string[];
  ignoredEnvKeys: Array<{ key: string; reason: string }>;
} {
  const preferTrustedLocal = opts?.preferTrustedLocal ?? false;
  const instanceId = resolvePaperclipInstanceId();
  const defaultStorage = defaultStorageConfig();
  const defaultSecrets = defaultSecretsConfig();
  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
  const publicUrl = preferTrustedLocal
    ? undefined
    : (
      process.env.PAPERCLIP_PUBLIC_URL?.trim() ||
      process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL?.trim() ||
      process.env.BETTER_AUTH_URL?.trim() ||
      process.env.BETTER_AUTH_BASE_URL?.trim() ||
      undefined
    );
  const deploymentMode = preferTrustedLocal
    ? "local_trusted"
    : (parseEnumFromEnv<DeploymentMode>(process.env.PAPERCLIP_DEPLOYMENT_MODE, DEPLOYMENT_MODES) ?? "local_trusted");
  const deploymentExposureFromEnv = parseEnumFromEnv<DeploymentExposure>(
    process.env.PAPERCLIP_DEPLOYMENT_EXPOSURE,
    DEPLOYMENT_EXPOSURES,
  );
  const deploymentExposure =
    deploymentMode === "local_trusted" ? "private" : (deploymentExposureFromEnv ?? "private");
  const bindFromEnv = parseEnumFromEnv<BindMode>(process.env.PAPERCLIP_BIND, BIND_MODES);
  const customBindHostFromEnv = process.env.PAPERCLIP_BIND_HOST?.trim() || undefined;
  const hostFromEnv = process.env.HOST?.trim() || undefined;
  const configuredBindHost = customBindHostFromEnv ?? hostFromEnv;
  const bind = preferTrustedLocal
    ? "loopback"
    : (
      deploymentMode === "local_trusted"
        ? "loopback"
        : (bindFromEnv ?? (configuredBindHost ? inferBindModeFromHost(configuredBindHost) : "lan"))
    );
  const resolvedBind = resolveRuntimeBind({
    bind,
    host: hostFromEnv ?? (bind === "loopback" ? "127.0.0.1" : "0.0.0.0"),
    customBindHost: customBindHostFromEnv,
    tailnetBindHost: process.env.PAPERCLIP_TAILNET_BIND_HOST?.trim(),
  });
  const authPublicBaseUrl = publicUrl;
  const authBaseUrlModeFromEnv = parseEnumFromEnv<AuthBaseUrlMode>(
    process.env.PAPERCLIP_AUTH_BASE_URL_MODE,
    AUTH_BASE_URL_MODES,
  );
  const authBaseUrlMode = authBaseUrlModeFromEnv ?? (authPublicBaseUrl ? "explicit" : "auto");
  const allowedHostnamesFromEnv = process.env.PAPERCLIP_ALLOWED_HOSTNAMES
    ? process.env.PAPERCLIP_ALLOWED_HOSTNAMES
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
    : [];
  const hostnameFromPublicUrl = publicUrl
    ? (() => {
      try {
        return new URL(publicUrl).hostname.trim().toLowerCase();
      } catch {
        return null;
      }
    })()
    : null;
  const storageProvider =
    parseEnumFromEnv<StorageProvider>(process.env.PAPERCLIP_STORAGE_PROVIDER, STORAGE_PROVIDERS) ??
    defaultStorage.provider;
  const secretsProvider =
    parseEnumFromEnv<SecretProvider>(process.env.PAPERCLIP_SECRETS_PROVIDER, SECRET_PROVIDERS) ??
    defaultSecrets.provider;
  const databaseBackupEnabled = parseBooleanFromEnv(process.env.PAPERCLIP_DB_BACKUP_ENABLED) ?? true;
  const databaseBackupIntervalMinutes = Math.max(
    1,
    parseNumberFromEnv(process.env.PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES) ?? 60,
  );
  const databaseBackupRetentionDays = Math.max(
    1,
    parseNumberFromEnv(process.env.PAPERCLIP_DB_BACKUP_RETENTION_DAYS) ?? 30,
  );
  const defaults: OnboardDefaults = {
    database: {
      mode: databaseUrl ? "postgres" : "embedded-postgres",
      ...(databaseUrl ? { connectionString: databaseUrl } : {}),
      embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(instanceId),
      embeddedPostgresPort: 54329,
      backup: {
        enabled: databaseBackupEnabled,
        intervalMinutes: databaseBackupIntervalMinutes,
        retentionDays: databaseBackupRetentionDays,
        dir: resolvePathFromEnv(process.env.PAPERCLIP_DB_BACKUP_DIR) ?? resolveDefaultBackupDir(instanceId),
      },
    },
    logging: {
      mode: "file",
      logDir: resolveDefaultLogsDir(instanceId),
    },
    server: {
      deploymentMode,
      exposure: deploymentExposure,
      bind: resolvedBind.bind,
      ...(resolvedBind.customBindHost ? { customBindHost: resolvedBind.customBindHost } : {}),
      host: resolvedBind.host,
      port: Number(process.env.PORT) || 3100,
      allowedHostnames: Array.from(new Set([...allowedHostnamesFromEnv, ...(hostnameFromPublicUrl ? [hostnameFromPublicUrl] : [])])),
      serveUi: parseBooleanFromEnv(process.env.SERVE_UI) ?? true,
    },
    auth: {
      baseUrlMode: authBaseUrlMode,
      disableSignUp: false,
      ...(authPublicBaseUrl ? { publicBaseUrl: authPublicBaseUrl } : {}),
    },
    storage: {
      provider: storageProvider,
      localDisk: {
        baseDir:
          resolvePathFromEnv(process.env.PAPERCLIP_STORAGE_LOCAL_DIR) ?? defaultStorage.localDisk.baseDir,
      },
      s3: {
        bucket: process.env.PAPERCLIP_STORAGE_S3_BUCKET ?? defaultStorage.s3.bucket,
        region: process.env.PAPERCLIP_STORAGE_S3_REGION ?? defaultStorage.s3.region,
        endpoint: process.env.PAPERCLIP_STORAGE_S3_ENDPOINT ?? defaultStorage.s3.endpoint,
        prefix: process.env.PAPERCLIP_STORAGE_S3_PREFIX ?? defaultStorage.s3.prefix,
        forcePathStyle:
          parseBooleanFromEnv(process.env.PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE) ??
          defaultStorage.s3.forcePathStyle,
      },
    },
    secrets: {
      provider: secretsProvider,
      strictMode: parseBooleanFromEnv(process.env.PAPERCLIP_SECRETS_STRICT_MODE) ?? defaultSecrets.strictMode,
      localEncrypted: {
        keyFilePath:
          resolvePathFromEnv(process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE) ??
          defaultSecrets.localEncrypted.keyFilePath,
      },
    },
  };
  const ignoredEnvKeys: Array<{ key: string; reason: string }> = [];
  if (preferTrustedLocal) {
    const forcedLocalReason = setupMessage("ignoredForcedLocal");
    for (const key of [
      "PAPERCLIP_DEPLOYMENT_MODE",
      "PAPERCLIP_DEPLOYMENT_EXPOSURE",
      "PAPERCLIP_BIND",
      "PAPERCLIP_BIND_HOST",
      "HOST",
      "PAPERCLIP_AUTH_BASE_URL_MODE",
      "PAPERCLIP_AUTH_PUBLIC_BASE_URL",
      "PAPERCLIP_PUBLIC_URL",
      "BETTER_AUTH_URL",
      "BETTER_AUTH_BASE_URL",
    ] as const) {
      if (process.env[key] !== undefined) {
        ignoredEnvKeys.push({ key, reason: forcedLocalReason });
      }
    }
  }
  if (deploymentMode === "local_trusted" && process.env.PAPERCLIP_DEPLOYMENT_EXPOSURE !== undefined) {
    ignoredEnvKeys.push({
      key: "PAPERCLIP_DEPLOYMENT_EXPOSURE",
      reason: setupMessage("ignoredPrivateExposure"),
    });
  }
  if (deploymentMode === "local_trusted" && process.env.PAPERCLIP_BIND !== undefined) {
    ignoredEnvKeys.push({
      key: "PAPERCLIP_BIND",
      reason: setupMessage("ignoredLoopbackReachability"),
    });
  }
  if (deploymentMode === "local_trusted" && process.env.PAPERCLIP_BIND_HOST !== undefined) {
    ignoredEnvKeys.push({
      key: "PAPERCLIP_BIND_HOST",
      reason: setupMessage("ignoredLoopbackReachability"),
    });
  }
  if (deploymentMode === "local_trusted" && process.env.HOST !== undefined) {
    ignoredEnvKeys.push({
      key: "HOST",
      reason: setupMessage("ignoredLoopbackReachability"),
    });
  }

  const ignoredKeySet = new Set(ignoredEnvKeys.map((entry) => entry.key));
  const usedEnvKeys = ONBOARD_ENV_KEYS.filter(
    (key) => process.env[key] !== undefined && !ignoredKeySet.has(key),
  );
  return { defaults, usedEnvKeys, ignoredEnvKeys };
}

function canCreateBootstrapInviteImmediately(config: Pick<PaperclipConfig, "database" | "server">): boolean {
  return config.server.deploymentMode === "authenticated" && config.database.mode !== "embedded-postgres";
}

export function isEphemeralNpxExecution(entrypoint = process.argv[1]): boolean {
  if (!entrypoint) return false;
  const normalized = entrypoint.replaceAll("\\", "/");
  return normalized.includes("/_npx/") || normalized.includes("/npm/_npx/");
}

function printManagedInstallHint(): void {
  const manifest = readInstallManifest();
  if (manifest && isManagedExecutable(process.argv[1], manifest)) return;
  if (!isEphemeralNpxExecution()) return;
  p.log.info(
    setupMessage("npxTemporary", { command: pc.cyan("paperclipai install") }),
  );
}

export async function onboard(opts: OnboardOptions): Promise<void> {
  if (opts.bind && !["loopback", "lan", "tailnet"].includes(opts.bind)) {
    throw new Error(setupMessage("unsupportedBind", { bind: opts.bind }));
  }

  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclipai onboard ")));
  const configPath = resolveConfigPath(opts.config);
  const instance = describeLocalInstancePaths(resolvePaperclipInstanceId());
  p.log.message(
    pc.dim(
      setupMessage("localHome", { homeDir: instance.homeDir, instanceId: instance.instanceId, configPath }),
    ),
  );

  let existingConfig: PaperclipConfig | null = null;
  let invalidBackupPath: string | undefined;
  if (configExists(opts.config)) {
    p.log.message(pc.dim(setupMessage("configExists", { configPath })));

    try {
      existingConfig = readConfig(opts.config);
      for (const warning of findPaperclipConfigKeyWarnings(existingConfig)) {
        p.log.warn(setupMessage("unknownConfigKey", { path: warning.path, suggestion: warning.suggestion }));
      }
    } catch (err) {
      const backupPath = backupInvalidConfig(opts.config);
      p.log.warn(
        setupMessage("invalidConfigBackup", { backupPath, error: err instanceof Error ? err.message : String(err) }),
      );

      const canConfirmRepair =
        opts.yes !== true &&
        opts.invokedByRun !== true &&
        process.stdin.isTTY === true &&
        process.stdout.isTTY === true;
      if (!canConfirmRepair) {
        p.log.error(
          setupMessage("refuseConfigReplacement", { configPath, backupPath }),
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
      invalidBackupPath = backupPath;
    }
  }

  if (existingConfig) {
    p.log.message(
      pc.dim(setupMessage("existingInstall")),
    );
    p.log.message(pc.dim(setupMessage("configureHint", { command: pc.cyan("paperclipai configure") })));

    const jwtSecret = ensureAgentJwtSecret(configPath);
    const envFilePath = resolveAgentJwtEnvFile(configPath);
    if (jwtSecret.created) {
      p.log.success(setupMessage("createdValueAt", { name: pc.cyan("PAPERCLIP_AGENT_JWT_SECRET"), path: pc.dim(envFilePath) }));
    } else if (process.env.PAPERCLIP_AGENT_JWT_SECRET?.trim()) {
      p.log.info(setupMessage("usingEnvValue", { name: pc.cyan("PAPERCLIP_AGENT_JWT_SECRET") }));
    } else {
      p.log.info(setupMessage("usingFileValue", { name: pc.cyan("PAPERCLIP_AGENT_JWT_SECRET"), path: pc.dim(envFilePath) }));
    }
    const toolActionSigningSecret = ensureToolActionSigningSecret(configPath);
    if (toolActionSigningSecret.created) {
      p.log.success(setupMessage("createdValueAt", { name: pc.cyan("PAPERCLIP_TOOL_ACTION_SIGNING_SECRET"), path: pc.dim(envFilePath) }));
    }

    const keyResult = ensureLocalSecretsKeyFile(existingConfig, configPath);
    if (keyResult.status === "created") {
      p.log.success(setupMessage("createdSecretsKey", { path: pc.dim(keyResult.path) }));
    } else if (keyResult.status === "existing") {
      p.log.message(pc.dim(setupMessage("usingSecretsKey", { path: keyResult.path })));
    }

    p.note(
      [
        setupMessage("existingConfigPreserved"),
        setupMessage("databaseSummary", { value: existingConfig.database.mode }),
        existingConfig.llm ? setupMessage("llmSummary", { value: existingConfig.llm.provider }) : setupMessage("llmNotConfigured"),
        setupMessage("loggingSummary", { mode: existingConfig.logging.mode, path: existingConfig.logging.logDir }),
        setupMessage("serverSummary", { mode: existingConfig.server.deploymentMode, exposure: existingConfig.server.exposure, binding: describeServerBinding(existingConfig.server) }),
        setupMessage("allowedHostsSummary", { value: existingConfig.server.allowedHostnames.length > 0 ? existingConfig.server.allowedHostnames.join(", ") : setupMessage("loopbackOnly") }),
        setupMessage("authUrlSummary", { mode: existingConfig.auth.baseUrlMode, url: existingConfig.auth.publicBaseUrl ? ` (${existingConfig.auth.publicBaseUrl})` : "" }),
        setupMessage("storageSummary", { value: existingConfig.storage.provider }),
        setupMessage("secretsSummary", { provider: existingConfig.secrets.provider, mode: setupMessage(existingConfig.secrets.strictMode ? "strictOn" : "strictOff") }),
        setupMessage("agentAuthConfigured"),
      ].join("\n"),
      setupMessage("configurationReady"),
    );

    p.note(
      [
        setupMessage("runCommand", { command: pc.cyan("paperclipai run") }),
        setupMessage("reconfigureCommand", { command: pc.cyan("paperclipai configure") }),
        setupMessage("diagnoseCommand", { command: pc.cyan("paperclipai doctor") }),
      ].join("\n"),
      setupMessage("nextCommands"),
    );

    printManagedInstallHint();
    const serviceInstalled = await handleOnboardService(opts);
    if (serviceInstalled) {
      await handoffToOnboardedService(existingConfig);
    }

    let shouldRunNow = !serviceInstalled && (opts.run === true || opts.yes === true);
    if (shouldOfferForegroundStart({ serviceInstalled, startAlreadyDecided: shouldRunNow, invokedByRun: opts.invokedByRun === true, interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY) })) {
      const answer = await p.confirm({
        message: setupMessage("startNow"),
        initialValue: true,
      });
      if (!p.isCancel(answer)) {
        shouldRunNow = answer;
      }
    }

    if (shouldRunNow && !opts.invokedByRun) {
      await runOnboardedForeground(configPath);
      return;
    }

    p.outro(setupMessage("existingSetupReady"));
    return;
  }

  let setupMode: SetupMode = "quickstart";
  if (opts.yes) {
    p.log.message(
      pc.dim(
        opts.bind
          ? setupMessage("yesQuickstartBind", { bind: opts.bind })
          : setupMessage("yesQuickstart"),
      ),
    );
  } else {
    const setupModeChoice = await p.select({
      message: setupMessage("chooseSetupPath"),
      options: [
        {
          value: "quickstart" as const,
          label: setupMessage("quickstart"),
          hint: setupMessage("recommendedDefaults"),
        },
        {
          value: "advanced" as const,
          label: setupMessage("advancedSetup"),
          hint: setupMessage("customizeSetup"),
        },
      ],
      initialValue: "quickstart",
    });
    if (p.isCancel(setupModeChoice)) {
      p.cancel(setupMessage("setupCancelled"));
      return;
    }
    setupMode = setupModeChoice as SetupMode;
  }

  const tc = getTelemetryClient();
  if (tc) trackInstallStarted(tc);

  let llm: PaperclipConfig["llm"] | undefined;
  const { defaults: derivedDefaults, usedEnvKeys, ignoredEnvKeys } = quickstartDefaultsFromEnv({
    preferTrustedLocal: opts.yes === true && !opts.bind,
  });
  let {
    database,
    logging,
    server,
    auth,
    storage,
    secrets,
  } = derivedDefaults;

  if (opts.bind === "loopback" || opts.bind === "lan" || opts.bind === "tailnet") {
    const preset = buildPresetServerConfig(opts.bind, {
      port: server.port,
      allowedHostnames: server.allowedHostnames,
      serveUi: server.serveUi,
    });
    server = preset.server;
    auth = preset.auth;
    if (opts.bind === "tailnet" && server.host === "127.0.0.1") {
      p.log.warn(setupMessage("tailnetWarning"));
    }
  }

  if (setupMode === "advanced") {
    p.log.step(pc.bold(setupMessage("sectionDatabase")));
    database = await promptDatabase(database);

    if (database.mode === "postgres" && database.connectionString) {
      const s = p.spinner();
      s.start(setupMessage("testingDatabase"));
      try {
        const { createDb } = await import("@paperclipai/db");
        const db = createDb(database.connectionString);
        await db.execute("SELECT 1");
        s.stop(setupMessage("databaseConnectionSucceeded"));
      } catch {
        s.stop(pc.yellow(setupMessage("databaseConnectionFailed")));
      }
    }

    p.log.step(pc.bold(setupMessage("sectionLlm")));
    llm = await promptLlm();

    if (llm?.apiKey) {
      const s = p.spinner();
      s.start(setupMessage("validatingApiKey"));
      try {
        if (llm.provider === "claude") {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": llm.apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 1,
              messages: [{ role: "user", content: "hi" }],
            }),
          });
          if (res.ok || res.status === 400) {
            s.stop(setupMessage("apiKeyValid"));
          } else if (res.status === 401) {
            s.stop(pc.yellow(setupMessage("apiKeyInvalid")));
          } else {
            s.stop(pc.yellow(setupMessage("couldNotValidateApiKey")));
          }
        } else {
          const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${llm.apiKey}` },
          });
          if (res.ok) {
            s.stop(setupMessage("apiKeyValid"));
          } else if (res.status === 401) {
            s.stop(pc.yellow(setupMessage("apiKeyInvalid")));
          } else {
            s.stop(pc.yellow(setupMessage("couldNotValidateApiKey")));
          }
        }
      } catch {
        s.stop(pc.yellow(setupMessage("couldNotReachApi")));
      }
    }

    p.log.step(pc.bold(setupMessage("sectionLogging")));
    logging = await promptLogging();

    p.log.step(pc.bold(setupMessage("sectionServer")));
    ({ server, auth } = await promptServer({ currentServer: server, currentAuth: auth }));

    p.log.step(pc.bold(setupMessage("sectionStorage")));
    storage = await promptStorage(storage);

    p.log.step(pc.bold(setupMessage("sectionSecrets")));
    const secretsDefaults = defaultSecretsConfig();
    secrets = {
      provider: secrets.provider ?? secretsDefaults.provider,
      strictMode: secrets.strictMode ?? secretsDefaults.strictMode,
      localEncrypted: {
        keyFilePath: secrets.localEncrypted?.keyFilePath ?? secretsDefaults.localEncrypted.keyFilePath,
      },
    };
    p.log.message(
      pc.dim(
        setupMessage("usingDefaults", {
          provider: secrets.provider,
          strictMode: setupMessage(secrets.strictMode ? "strictOn" : "strictOff"),
          path: secrets.localEncrypted.keyFilePath,
        }),
      ),
    );
  } else {
    p.log.step(pc.bold(setupMessage("quickstart")));
    p.log.message(
      pc.dim(
        opts.bind
          ? setupMessage("quickstartBindDefaults", { bind: opts.bind })
          : setupMessage("quickstartDefaults", { mode: server.deploymentMode, exposure: server.exposure, binding: describeServerBinding(server) }),
      ),
    );
    if (usedEnvKeys.length > 0) {
      p.log.message(pc.dim(setupMessage("environmentDefaultsActive", { count: usedEnvKeys.length })));
    } else {
      p.log.message(
        pc.dim(setupMessage("noEnvironmentOverrides")),
      );
    }
    for (const ignored of ignoredEnvKeys) {
      p.log.message(pc.dim(setupMessage("ignoredEnvironmentValue", { key: ignored.key, reason: ignored.reason })));
    }
  }

  const jwtSecret = ensureAgentJwtSecret(configPath);
  const envFilePath = resolveAgentJwtEnvFile(configPath);
  if (jwtSecret.created) {
    p.log.success(setupMessage("createdValueAt", { name: pc.cyan("PAPERCLIP_AGENT_JWT_SECRET"), path: pc.dim(envFilePath) }));
  } else if (process.env.PAPERCLIP_AGENT_JWT_SECRET?.trim()) {
    p.log.info(setupMessage("usingEnvValue", { name: pc.cyan("PAPERCLIP_AGENT_JWT_SECRET") }));
  } else {
    p.log.info(setupMessage("usingFileValue", { name: pc.cyan("PAPERCLIP_AGENT_JWT_SECRET"), path: pc.dim(envFilePath) }));
  }
  const toolActionSigningSecret = ensureToolActionSigningSecret(configPath);
  if (toolActionSigningSecret.created) {
    p.log.success(setupMessage("createdValueAt", { name: pc.cyan("PAPERCLIP_TOOL_ACTION_SIGNING_SECRET"), path: pc.dim(envFilePath) }));
  }

  const config: PaperclipConfig = {
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "onboard",
    },
    ...(llm && { llm }),
    database,
    logging,
    server,
    auth,
    telemetry: {
      enabled: true,
    },
    storage,
    secrets,
  };

  const keyResult = ensureLocalSecretsKeyFile(config, configPath);
  if (keyResult.status === "created") {
    p.log.success(setupMessage("createdSecretsKey", { path: pc.dim(keyResult.path) }));
  } else if (keyResult.status === "existing") {
    p.log.message(pc.dim(setupMessage("usingSecretsKey", { path: keyResult.path })));
  }

  writeConfig(config, opts.config, {
    invalidBackupPath,
  });

  if (tc) trackInstallCompleted(tc, {
    adapterType: server.deploymentMode,
  });

  p.note(
    [
      setupMessage("databaseSummary", { value: database.mode }),
      llm ? setupMessage("llmSummary", { value: llm.provider }) : setupMessage("llmNotConfigured"),
      setupMessage("loggingSummary", { mode: logging.mode, path: logging.logDir }),
      setupMessage("serverSummary", { mode: server.deploymentMode, exposure: server.exposure, binding: describeServerBinding(server) }),
      setupMessage("allowedHostsSummary", { value: server.allowedHostnames.length > 0 ? server.allowedHostnames.join(", ") : setupMessage("loopbackOnly") }),
      setupMessage("authUrlSummary", { mode: auth.baseUrlMode, url: auth.publicBaseUrl ? ` (${auth.publicBaseUrl})` : "" }),
      setupMessage("storageSummary", { value: storage.provider }),
      setupMessage("secretsSummary", { provider: secrets.provider, mode: setupMessage(secrets.strictMode ? "strictOn" : "strictOff") }),
      setupMessage("agentAuthConfigured"),
    ].join("\n"),
    setupMessage("configurationSaved"),
  );

  p.note(
    [
      setupMessage("runCommand", { command: pc.cyan("paperclipai run") }),
      setupMessage("reconfigureCommand", { command: pc.cyan("paperclipai configure") }),
      setupMessage("diagnoseCommand", { command: pc.cyan("paperclipai doctor") }),
    ].join("\n"),
    setupMessage("nextCommands"),
  );

  printManagedInstallHint();

  if (canCreateBootstrapInviteImmediately({ database, server })) {
    p.log.step(setupMessage("generatingBootstrapInvite"));
    await bootstrapCeoInvite({ config: configPath });
  }

  const serviceInstalled = await handleOnboardService(opts);
  if (serviceInstalled) {
    await handoffToOnboardedService(config);
  }

  let shouldRunNow = !serviceInstalled && (opts.run === true || opts.yes === true);
  if (shouldOfferForegroundStart({ serviceInstalled, startAlreadyDecided: shouldRunNow, invokedByRun: opts.invokedByRun === true, interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY) })) {
    const answer = await p.confirm({
      message: setupMessage("startNow"),
      initialValue: true,
    });
    if (!p.isCancel(answer)) {
      shouldRunNow = answer;
    }
  }

  if (shouldRunNow && !opts.invokedByRun) {
    await runOnboardedForeground(configPath);
    return;
  }

  if (server.deploymentMode === "authenticated" && database.mode === "embedded-postgres") {
    p.log.info(
      [
        setupMessage("bootstrapInviteAfterStart"),
        setupMessage("nextStep", { command: pc.cyan("paperclipai run") }),
        setupMessage("thenStep", { command: pc.cyan("paperclipai auth bootstrap-ceo") }),
      ].join("\n"),
    );
  }

  p.outro(setupMessage("allSet"));
}
