import type { TFunction } from "i18next";

export interface LocalizedPluginPresentation {
  displayName: string;
  description: string;
}

export interface LocalizedSandboxProviderPresentation {
  displayName: string;
  description?: string;
}

export interface LocalizedPluginResourcePresentation {
  displayName: string;
  description?: string;
}

interface PluginConfigSchemaPresentationNode {
  title?: string;
  description?: string;
  properties?: Record<string, PluginConfigSchemaPresentationNode>;
  [key: string]: unknown;
}

export interface PluginBundleIdentity {
  pluginKey: string;
  packageName: string;
  packagePath: string | null;
}

export interface AvailablePluginBundleIdentity {
  pluginKey: string;
  packageName: string;
  localPath: string;
}

export interface PluginUiContributionIdentity {
  pluginId: string;
  pluginKey: string;
}

export interface SandboxProviderPluginIdentity {
  pluginId?: string;
  pluginKey?: string;
}

export interface InstalledPluginBundleIdentity extends PluginBundleIdentity {
  id: string;
  manifestJson: { id: string; displayName?: string | null };
}

export interface ManagedPluginAttributionIdentity {
  pluginId: string;
  pluginKey: string;
  pluginDisplayName: string;
}

export interface ManagedPluginResourceAttributionIdentity extends ManagedPluginAttributionIdentity {
  resourceKind: "agent" | "skill" | "project" | "routine";
  resourceKey: string;
}

export interface PluginUiContributionPresentation {
  pluginDisplayName: string;
  slotDisplayNames: Readonly<Record<string, string>>;
  launcherDisplayNames: Readonly<Record<string, string>>;
}

/** Return true only when the installed package points at the host's bundle catalog entry. */
export function isBundledPluginRecord(
  plugin: PluginBundleIdentity,
  bundledPlugins: readonly AvailablePluginBundleIdentity[] | undefined,
): boolean {
  if (!plugin.packagePath || !bundledPlugins) return false;
  return bundledPlugins.some((bundled) =>
    bundled.pluginKey === plugin.pluginKey
    && bundled.packageName === plugin.packageName
    && bundled.localPath === plugin.packagePath,
  );
}

/** Require the capability identity to match one installed plugin and its exact bundled package. */
export function isTrustedBundledSandboxProvider(
  capability: SandboxProviderPluginIdentity,
  installedPlugins: readonly InstalledPluginBundleIdentity[] | undefined,
  bundledPlugins: readonly AvailablePluginBundleIdentity[] | undefined,
): boolean {
  if (!capability.pluginId || !capability.pluginKey) return false;
  const installed = installedPlugins?.find((plugin) =>
    plugin.id === capability.pluginId
    && plugin.pluginKey === capability.pluginKey
    && plugin.manifestJson.id === capability.pluginKey,
  );
  return Boolean(installed && isBundledPluginRecord(installed, bundledPlugins));
}

/** Require both the contribution-to-record link and the host's exact bundle identity. */
export function isTrustedBundledPluginContribution(
  contribution: PluginUiContributionIdentity,
  installedPlugins: readonly InstalledPluginBundleIdentity[] | undefined,
  bundledPlugins: readonly AvailablePluginBundleIdentity[] | undefined,
): boolean {
  if (!installedPlugins || !bundledPlugins) return false;
  const installed = installedPlugins.find((plugin) => plugin.id === contribution.pluginId);
  return Boolean(
    installed
    && installed.pluginKey === contribution.pluginKey
    && installed.manifestJson.id === contribution.pluginKey
    && isBundledPluginRecord(installed, bundledPlugins),
  );
}

/**
 * Resolve a managed resource's plugin label only when its attribution matches
 * the installed manifest and that exact installed package matches the host's
 * bundled catalog. Missing evidence, stale attribution, and external packages
 * retain the display name carried by the resource API.
 */
export function localizeManagedPluginDisplayName(
  attribution: ManagedPluginAttributionIdentity,
  installedPlugins: readonly InstalledPluginBundleIdentity[] | undefined,
  bundledPlugins: readonly AvailablePluginBundleIdentity[] | undefined,
  t: TFunction,
): string {
  const installed = installedPlugins?.find((plugin) =>
    plugin.id === attribution.pluginId
    && plugin.pluginKey === attribution.pluginKey
    && plugin.manifestJson.id === attribution.pluginKey
    && plugin.manifestJson.displayName === attribution.pluginDisplayName,
  );
  if (!installed || !isBundledPluginRecord(installed, bundledPlugins)) {
    return attribution.pluginDisplayName;
  }
  return localizePluginPresentation(
    attribution.pluginKey,
    attribution.pluginDisplayName,
    "",
    t,
    true,
  ).displayName;
}

/**
 * Host-owned translations for first-party package metadata. An ID only selects a
 * translation after the caller proves the installed package matches the host's
 * bundled catalog. External manifest values pass through unchanged.
 *
 * Keep these IDs aligned with manifest `id` values and sandbox `driverKey`s.
 * Configuration schemas and their values intentionally do not pass through
 * this presentation layer.
 */
const OWN_PLUGIN_PRESENTATION_KEYS: Record<string, string> = {
  "paperclipai.plugin-llm-wiki": "llmWiki",
  "paperclip.workspace-diff": "workspaceChanges",
  "paperclip.fake-sandbox-provider": "fakeSandboxProvider",
  "paperclip.cloudflare-sandbox-provider": "cloudflareSandboxProvider",
  "paperclip.modal-sandbox-provider": "modalSandboxProvider",
  "paperclip.daytona-sandbox-provider": "daytonaSandboxProvider",
  "paperclip.novita-sandbox-provider": "novitaSandboxProvider",
  "paperclip.kubernetes-sandbox-provider": "kubernetesSandboxProvider",
  "paperclip.e2b-sandbox-provider": "e2bSandboxProvider",
  "paperclip.exe-dev-sandbox-provider": "exeDevSandboxProvider",
  "paperclip.createos-sandbox-provider": "createosSandboxProvider",
  "paperclip-kitchen-sink-example": "kitchenSinkExample",
  "paperclip.hello-world-example": "helloWorldExample",
  "paperclip-file-browser-example": "fileBrowserExample",
  "paperclipai.plugin-authoring-smoke-example": "pluginAuthoringSmokeExample",
  "paperclipai.plugin-orchestration-smoke-example": "pluginOrchestrationSmokeExample",
};

const OWN_PLUGIN_CONFIG_FIELD_PRESENTATION: Record<string, {
  key: string;
  fields: Record<string, { sourceTitle: string; sourceDescription: string; key: string }>;
}> = {
  "paperclip-file-browser-example": {
    key: "fileBrowser",
    fields: {
      showFilesInSidebar: {
        sourceTitle: "Show Files in Sidebar",
        sourceDescription: "Adds the Files link under each project in the sidebar.",
        key: "showFilesInSidebar",
      },
      commentAnnotationMode: {
        sourceTitle: "Comment File Links",
        sourceDescription: "Controls which comment extensions are active: 'annotation' shows file links below each comment, 'contextMenu' adds an \"Open in Files\" action to the comment menu, 'both' enables both, 'none' disables comment features.",
        key: "commentAnnotationMode",
      },
    },
  },
};

const OWN_PLUGIN_CATEGORY_KEYS: Record<string, string> = {
  connector: "connector",
  workspace: "workspace",
  automation: "automation",
  ui: "ui",
};

const OWN_PLUGIN_RESOURCE_PRESENTATION_KEYS: Record<string, Partial<Record<
  ManagedPluginResourceAttributionIdentity["resourceKind"],
  Record<string, { sourceDisplayName: string; messageKey: string }>
>>> = {
  "paperclipai.plugin-llm-wiki": {
    agent: {
      "wiki-maintainer": { sourceDisplayName: "Wiki Maintainer", messageKey: "llmWiki.agent.wikiMaintainer" },
    },
    skill: {
      "wiki-maintainer": { sourceDisplayName: "LLM Wiki Maintainer", messageKey: "llmWiki.skill.wikiMaintainer" },
      "wiki-ingest": { sourceDisplayName: "Wiki Ingest", messageKey: "llmWiki.skill.wikiIngest" },
      "wiki-query": { sourceDisplayName: "Wiki Query", messageKey: "llmWiki.skill.wikiQuery" },
      "wiki-lint": { sourceDisplayName: "Wiki Lint", messageKey: "llmWiki.skill.wikiLint" },
      "paperclip-distill": { sourceDisplayName: "Paperclip Distill", messageKey: "llmWiki.skill.paperclipDistill" },
      "index-refresh": { sourceDisplayName: "Index Refresh", messageKey: "llmWiki.skill.indexRefresh" },
    },
    project: {
      "llm-wiki": { sourceDisplayName: "LLM Wiki", messageKey: "llmWiki.project.llmWiki" },
    },
    routine: {
      "cursor-window-processing": { sourceDisplayName: "Process LLM Wiki updates", messageKey: "llmWiki.routine.cursorWindowProcessing" },
      "nightly-wiki-lint": { sourceDisplayName: "Run LLM Wiki lint", messageKey: "llmWiki.routine.nightlyWikiLint" },
      "index-refresh": { sourceDisplayName: "Refresh LLM Wiki index", messageKey: "llmWiki.routine.indexRefresh" },
    },
  },
};

/**
 * Translate a resource label only when the host proves that its exact
 * installed plugin package is the bundled first-party package and the current
 * resource name still matches the bundled declaration. Renamed resources,
 * copied identifiers, external packages, and unknown declarations keep their
 * current API name.
 */
export function localizeManagedPluginResourceDisplayName(
  attribution: ManagedPluginResourceAttributionIdentity | null | undefined,
  currentDisplayName: string,
  installedPlugins: readonly InstalledPluginBundleIdentity[] | undefined,
  bundledPlugins: readonly AvailablePluginBundleIdentity[] | undefined,
  t: TFunction,
): string {
  if (!attribution) return currentDisplayName;
  const installed = installedPlugins?.find((plugin) =>
    plugin.id === attribution.pluginId
    && plugin.pluginKey === attribution.pluginKey
    && plugin.manifestJson.id === attribution.pluginKey
    && plugin.manifestJson.displayName === attribution.pluginDisplayName,
  );
  if (!installed || !isBundledPluginRecord(installed, bundledPlugins)) return currentDisplayName;

  const ownedPresentation = OWN_PLUGIN_RESOURCE_PRESENTATION_KEYS[attribution.pluginKey]?.[attribution.resourceKind]?.[attribution.resourceKey];
  if (!ownedPresentation || ownedPresentation.sourceDisplayName !== currentDisplayName) {
    return currentDisplayName;
  }
  return translate(t, `pluginPresentation.managedResources.${ownedPresentation.messageKey}`, currentDisplayName);
}

const OWN_SANDBOX_PROVIDER_PRESENTATION_KEYS: Record<string, { pluginId: string; key: string }> = {
  "fake-plugin": { pluginId: "paperclip.fake-sandbox-provider", key: "fake" },
  cloudflare: { pluginId: "paperclip.cloudflare-sandbox-provider", key: "cloudflare" },
  modal: { pluginId: "paperclip.modal-sandbox-provider", key: "modal" },
  daytona: { pluginId: "paperclip.daytona-sandbox-provider", key: "daytona" },
  novita: { pluginId: "paperclip.novita-sandbox-provider", key: "novita" },
  kubernetes: { pluginId: "paperclip.kubernetes-sandbox-provider", key: "kubernetes" },
  e2b: { pluginId: "paperclip.e2b-sandbox-provider", key: "e2b" },
  "exe-dev": { pluginId: "paperclip.exe-dev-sandbox-provider", key: "exeDev" },
  createos: { pluginId: "paperclip.createos-sandbox-provider", key: "createos" },
};

const OWN_SANDBOX_PROVIDER_CONFIG_FIELD_PRESENTATION: Record<string, {
  pluginId: string;
  key: string;
  fields: Record<string, { sourceDescription: string; sourceTitle?: string; key: string }>;
  groups?: Record<string, string>;
}> = {
  "fake-plugin": {
    pluginId: "paperclip.fake-sandbox-provider",
    key: "fake",
    fields: {
      image: {
        sourceDescription: "Deterministic fake image label for metadata and matching.",
        key: "image",
      },
      timeoutMs: {
        sourceDescription: "Command timeout in milliseconds.",
        key: "timeoutMs",
      },
      reuseLease: {
        sourceDescription: "Whether to reuse fake leases by environment id.",
        key: "reuseLease",
      },
    },
  },
  cloudflare: {
    pluginId: "paperclip.cloudflare-sandbox-provider",
    key: "cloudflare",
    fields: {
      bridgeBaseUrl: {
        sourceDescription: "Base URL of the operator-deployed Cloudflare Worker bridge.",
        key: "bridgeBaseUrl",
      },
      bridgeAuthToken: {
        sourceDescription: "Bearer token used by the provider plugin when calling the Cloudflare bridge. Pasted values are stored as company secrets.",
        key: "bridgeAuthToken",
      },
      reuseLease: {
        sourceDescription: "Reuse a sandbox by environment ID instead of creating one per run.",
        key: "reuseLease",
      },
      keepAlive: {
        sourceDescription: "Prevent Cloudflare from idling the container between requests.",
        key: "keepAlive",
      },
      sleepAfter: {
        sourceDescription: "Idle timeout passed to getSandbox() on lease creation. Defaults to 1 hour so a fresh sandbox survives normal Claude/Codex heartbeats. Ignored when keepAlive is true.",
        key: "sleepAfter",
      },
      normalizeId: {
        sourceDescription: "Lowercase and normalize sandbox IDs for operator-friendly naming.",
        key: "normalizeId",
      },
      requestedCwd: {
        sourceDescription: "Workspace directory to create inside the sandbox lease.",
        key: "requestedCwd",
      },
      sessionStrategy: {
        sourceDescription: "Whether to run commands in a stable named session or the default session.",
        key: "sessionStrategy",
      },
      sessionId: {
        sourceDescription: "Named Cloudflare session ID used when sessionStrategy is named.",
        key: "sessionId",
      },
      timeoutMs: {
        sourceDescription: "Default per-command timeout passed through to the bridge.",
        key: "timeoutMs",
      },
      bridgeRequestTimeoutMs: {
        sourceDescription: "HTTP timeout for plugin-to-bridge requests.",
        key: "bridgeRequestTimeoutMs",
      },
      previewHostname: {
        sourceDescription: "Optional hostname reserved for future preview URL support.",
        key: "previewHostname",
      },
    },
  },
  modal: {
    pluginId: "paperclip.modal-sandbox-provider",
    key: "modal",
    fields: {
      appName: {
        sourceDescription: "Modal App name used as the parent for sandboxes. The plugin calls `modal.apps.fromName(appName, { createIfMissing: true })`, so the App is created on first acquire if it does not already exist.",
        key: "appName",
      },
      image: {
        sourceDescription: "Container image reference passed to `modal.images.fromRegistry()`, e.g. `python:3.13` or `node:24`. The default `node:24` satisfies the sandbox runtime contract (node, sh, and tar on PATH).",
        key: "image",
      },
      tokenId: {
        sourceDescription: "Modal token ID. Paste a token or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Required.",
        key: "tokenId",
      },
      tokenSecret: {
        sourceDescription: "Modal token secret paired with tokenId. Required.",
        key: "tokenSecret",
      },
      environment: {
        sourceDescription: "Optional Modal environment name. Falls back to the SDK profile default.",
        key: "environment",
      },
      workdir: {
        sourceDescription: "Remote working directory inside the sandbox.",
        key: "workdir",
      },
      sandboxTimeoutMs: {
        sourceDescription: "Maximum sandbox lifetime in milliseconds. Must be a positive multiple of 1000 between 1000 and 86400000 (24 hours).",
        key: "sandboxTimeoutMs",
      },
      idleTimeoutMs: {
        sourceDescription: "Optional idle timeout in milliseconds. When set, Modal terminates the sandbox if no exec is active for this duration. Must be a positive multiple of 1000.",
        key: "idleTimeoutMs",
      },
      execTimeoutMs: {
        sourceDescription: "Default per-exec timeout in milliseconds when the caller does not provide one. Must be a positive multiple of 1000.",
        key: "execTimeoutMs",
      },
      blockNetwork: {
        sourceDescription: "Whether to block all egress network access from the sandbox.",
        key: "blockNetwork",
      },
      cidrAllowlist: {
        sourceDescription: "Optional list of CIDRs the sandbox is allowed to reach. Cannot be combined with blockNetwork.",
        key: "cidrAllowlist",
      },
      reuseLease: {
        sourceDescription: "When true, the sandbox is detached (not terminated) on release and resumed by id later. Reuse relies on Modal's sandbox lifetime and idle timeout because Modal has no separate pause primitive.",
        key: "reuseLease",
      },
    },
  },
  daytona: {
    pluginId: "paperclip.daytona-sandbox-provider",
    key: "daytona",
    fields: {
      apiKey: {
        sourceDescription: "Environment-specific Daytona API key. Paste a key or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Falls back to DAYTONA_API_KEY if omitted.",
        key: "apiKey",
      },
      apiUrl: {
        sourceDescription: "Optional Daytona API base URL. If omitted, the Daytona SDK uses its configured default endpoint.",
        key: "apiUrl",
      },
      target: {
        sourceDescription: "Optional Daytona target/region identifier.",
        key: "target",
      },
      snapshot: {
        sourceDescription: "Optional Daytona snapshot name to start from.",
        key: "snapshot",
      },
      image: {
        sourceDescription: "Optional base image or Daytona Image reference. If set, the sandbox is created from this image instead of a snapshot.",
        key: "image",
      },
      language: {
        sourceDescription: "Optional Daytona language hint for direct code execution. If omitted, Daytona uses its default runtime.",
        key: "language",
      },
      cpu: {
        sourceDescription: "Optional CPU allocation in cores.",
        key: "cpu",
      },
      memory: {
        sourceDescription: "Optional memory allocation in GiB. Supported sandbox sizes are 1, 2, 4, and 8 GiB.",
        key: "memory",
      },
      disk: {
        sourceDescription: "Optional disk allocation in GiB.",
        key: "disk",
      },
      gpu: {
        sourceDescription: "Optional GPU allocation in units.",
        key: "gpu",
      },
      timeoutMs: {
        sourceDescription: "Timeout for Daytona operations in milliseconds. Fresh lease acquisition shares one budget across creation, setup, and inline cleanup.",
        key: "timeoutMs",
      },
      livenessTimeoutMs: {
        sourceDescription: "Per-call timeout in milliseconds for the sandbox liveness read (refreshData). A silently unresponsive sandbox connection surfaces as a fast error instead of stalling until the outer RPC ceiling. The start and recovery calls derive their own deadline from timeoutMs, not this bound. `0` or less disables the bound. Defaults to 30000 when unset.",
        key: "livenessTimeoutMs",
      },
      autoStopInterval: {
        sourceDescription: "Daytona auto-stop interval in minutes. `0` disables auto-stop. Defaults to 15 when unset.",
        key: "autoStopInterval",
      },
      autoArchiveInterval: {
        sourceDescription: "Daytona auto-archive interval in minutes. Stopped sandboxes still count against the storage quota until archived, so this defaults to 60 when unset. `0` uses Daytona's max interval.",
        key: "autoArchiveInterval",
      },
      autoDeleteInterval: {
        sourceDescription: "Daytona auto-delete interval in minutes. Backstop reaper for sandboxes nobody resumes; defaults to 10080 (7 days) when unset. `-1` disables auto-delete and `0` deletes immediately after stop.",
        key: "autoDeleteInterval",
      },
      reuseLease: {
        sourceDescription: "Whether to stop and later resume the sandbox across runs instead of deleting it on release.",
        key: "reuseLease",
      },
      runnerLifecycleMode: {
        sourceDescription: "paperclip_runner lifecycle for this environment. Inherit uses the agent setting; warm keeps runnerd and the sandbox available between turns.",
        key: "runnerLifecycleMode",
      },
      runnerIdleTimeoutMs: {
        sourceDescription: "How long an idle warm paperclip_runner stays alive before it checkpoints and suspends.",
        key: "runnerIdleTimeoutMs",
      },
    },
  },
  e2b: {
    pluginId: "paperclip.e2b-sandbox-provider",
    key: "e2b",
    fields: {
      template: {
        sourceDescription: "E2B sandbox template name. Defaults to base when omitted.",
        key: "template",
      },
      apiKey: {
        sourceDescription: "Environment-specific E2B API key. Paste a key or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Falls back to E2B_API_KEY if omitted.",
        key: "apiKey",
      },
      timeoutMs: {
        sourceDescription: "Sandbox lifetime in milliseconds, refreshed on each command. Defaults to 1 hour. Raise this if your runs commonly idle longer than the default between commands.",
        key: "timeoutMs",
      },
      reuseLease: {
        sourceDescription: "Whether to pause and reuse sandboxes across runs.",
        key: "reuseLease",
      },
    },
  },
  novita: {
    pluginId: "paperclip.novita-sandbox-provider",
    key: "novita",
    fields: {
      apiKey: {
        sourceDescription: "Environment-specific Novita API key. Paste a key or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Falls back to NOVITA_API_KEY if omitted.",
        key: "apiKey",
      },
      domain: {
        sourceDescription: "Optional Novita API domain override. Leave empty to use the SDK default.",
        key: "domain",
      },
      template: {
        sourceDescription: "Novita sandbox template ID or name. Leave blank to use the SDK's default base template.",
        key: "template",
      },
      requestedCwd: {
        sourceDescription: "Workspace directory to create inside the sandbox lease.",
        key: "requestedCwd",
      },
      timeoutMs: {
        sourceDescription: "Sandbox lifetime and default per-command timeout in milliseconds.",
        key: "timeoutMs",
      },
      requestTimeoutMs: {
        sourceDescription: "HTTP/RPC request timeout for Novita SDK calls in milliseconds.",
        key: "requestTimeoutMs",
      },
      secure: {
        sourceDescription: "Use secure connections when supported by the Novita SDK.",
        key: "secure",
      },
      autoPause: {
        sourceDescription: "Enable Novita sandbox auto-pause behavior when supported by the selected template.",
        key: "autoPause",
      },
      reuseLease: {
        sourceDescription: "Pause and later resume the sandbox across Paperclip runs instead of killing it on release.",
        key: "reuseLease",
      },
    },
  },
  kubernetes: {
    pluginId: "paperclip.kubernetes-sandbox-provider",
    key: "kubernetes",
    fields: {
      inCluster: {
        sourceDescription: "When true, the plugin uses the in-pod ServiceAccount credentials. Requires paperclip-server to be running inside the target cluster.",
        key: "inCluster",
      },
      kubeconfig: {
        sourceDescription: "Inline kubeconfig YAML. Paste a kubeconfig or an existing Paperclip secret reference; pasted values are stored as company secrets.",
        key: "kubeconfig",
      },
      namespacePrefix: {
        sourceDescription: "Prefix for the per-company tenant namespace (default: paperclip-).",
        key: "namespacePrefix",
      },
      companySlug: {
        sourceDescription: "Override the auto-derived company slug used in the tenant namespace name.",
        key: "companySlug",
      },
      imageRegistry: {
        sourceDescription: "Override the default registry for agent runtime images (default: ghcr.io/paperclipai).",
        key: "imageRegistry",
      },
      imageAllowList: {
        sourceDescription: "Glob patterns of allowed `target.imageOverride` values. Empty list = no override permitted.",
        key: "imageAllowList",
      },
      imagePullSecrets: {
        sourceDescription: "Names of pre-created Docker image pull secrets in the tenant namespace.",
        key: "imagePullSecrets",
      },
      egressAllowFqdns: {
        sourceDescription: "Additional FQDNs to allow egress to from agent pods. Adapter-default FQDNs (e.g. api.anthropic.com) are added automatically.",
        key: "egressAllowFqdns",
      },
      egressAllowCidrs: {
        sourceDescription: "Additional CIDRs to allow egress to from agent pods.",
        key: "egressAllowCidrs",
      },
      egressMode: {
        sourceDescription: "Network policy mode. `cilium` enables FQDN-based egress filtering via CiliumNetworkPolicy.",
        key: "egressMode",
      },
      runtimeClassName: {
        sourceDescription: "Optional RuntimeClass for pod isolation (e.g. `kata-fc` for Firecracker-backed microVMs). Cluster must have the RuntimeClass installed.",
        key: "runtimeClassName",
      },
      serviceAccountAnnotations: {
        sourceDescription: "Annotations applied to the per-tenant ServiceAccount (e.g. `eks.amazonaws.com/role-arn` for IRSA).",
        key: "serviceAccountAnnotations",
      },
      jobTtlSecondsAfterFinished: {
        sourceDescription: "Seconds after a Job completes before it is garbage-collected (default: 900).",
        key: "jobTtlSecondsAfterFinished",
      },
      podActivityDeadlineSec: {
        sourceDescription: "Hard ceiling on a single run's wall-clock time (default: 3600).",
        key: "podActivityDeadlineSec",
      },
      adapterType: {
        sourceDescription: "The adapter type that Jobs in this environment will run (e.g. `claude_local`, `codex_local`). Defaults to `claude_local`. Each environment is bound to one adapter; create multiple environments for different adapters.",
        key: "adapterType",
      },
      backend: {
        sourceDescription: "sandbox-cr (default, alpha — requires kubernetes-sigs/agent-sandbox installed) | job (stable fallback — batch/v1 Job, one-shot entrypoint, no multi-command exec)",
        key: "backend",
      },
    },
  },
  "exe-dev": {
    pluginId: "paperclip.exe-dev-sandbox-provider",
    key: "exeDev",
    groups: {
      "SSH access": "sshAccess",
      "VM resources": "vmResources",
      "VM creation": "vmCreation",
      "API + runtime": "apiRuntime",
    },
    fields: {
      apiKey: {
        sourceDescription: "Paste your exe.dev API token, or pick a saved Paperclip secret. Create one at exe.dev → Settings → API tokens with `/exec` scope (`new`, `ls`, `rm`, plus `cp` if you use Source VM).",
        key: "apiKey",
      },
      sshPrivateKey: {
        sourceDescription: "Paste the SSH private key you registered with exe.dev, or pick a saved secret. Leave blank to fall back to an on-host key (see Advanced → SSH access).",
        key: "sshPrivateKey",
      },
      sshUser: {
        sourceDescription: "Login user on the VM. Leave blank to use the image default, usually `root`.",
        key: "sshUser",
      },
      sshIdentityFile: {
        sourceDescription: "Absolute path to a private key on the Paperclip host. Used only when SSH Private Key is empty.",
        key: "sshIdentityFile",
      },
      sshPort: {
        sourceDescription: "SSH port for direct VM access.",
        key: "sshPort",
      },
      strictHostKeyChecking: {
        sourceDescription: "Host key policy passed to ssh via StrictHostKeyChecking. Typical values are `accept-new`, `yes`, or `no`.",
        key: "strictHostKeyChecking",
      },
      image: {
        sourceDescription: "Optional container image to use when creating the VM.",
        key: "image",
      },
      cpu: {
        sourceDescription: "Optional CPU count passed to `exe.dev new --cpu`.",
        key: "cpu",
      },
      memory: {
        sourceDescription: "Optional memory size such as `4GB`.",
        key: "memory",
      },
      disk: {
        sourceDescription: "Optional disk size such as `20GB`.",
        key: "disk",
      },
      sourceVm: {
        sourceTitle: "Source VM",
        sourceDescription: "Name of an existing exe.dev VM to copy for each run with `exe.dev cp`, disk and config included. Leave blank to create a fresh VM with `exe.dev new`. Your API token must allow `cp`: tokens list their permitted commands, and one without `cp` fails with a 403. When set, leave image, command, env, integrations, tags, setup script, prompt, and comment empty: `cp` cannot apply them, and saving fails until they are cleared.",
        key: "sourceVm",
      },
      command: {
        sourceDescription: "Optional container command passed to `exe.dev new --command`.",
        key: "command",
      },
      env: {
        sourceDescription: "Optional environment variables applied at VM creation time.",
        key: "env",
      },
      integrations: {
        sourceDescription: "Optional exe.dev integrations to attach during VM creation.",
        key: "integrations",
      },
      tags: {
        sourceDescription: "Optional tags to apply during VM creation.",
        key: "tags",
      },
      setupScript: {
        sourceDescription: "Optional first-boot setup script passed to `exe.dev new --setup-script`.",
        key: "setupScript",
      },
      prompt: {
        sourceDescription: "Optional Shelley prompt passed to `exe.dev new --prompt`.",
        key: "prompt",
      },
      comment: {
        sourceDescription: "Optional short note attached to created VMs.",
        key: "comment",
      },
      namePrefix: {
        sourceDescription: "Optional prefix used when generating VM names.",
        key: "namePrefix",
      },
      apiUrl: {
        sourceDescription: "Optional exe.dev HTTPS API base URL or /exec endpoint. Defaults to https://exe.dev/exec.",
        key: "apiUrl",
      },
      timeoutMs: {
        sourceDescription: "Timeout for VM lifecycle and SSH operations in milliseconds.",
        key: "timeoutMs",
      },
      reuseLease: {
        sourceDescription: "Whether to keep the VM alive between runs instead of deleting it on release.",
        key: "reuseLease",
      },
    },
  },
  createos: {
    pluginId: "paperclip.createos-sandbox-provider",
    key: "createos",
    fields: {
      apiUrl: {
        sourceTitle: "API URL",
        sourceDescription: "https://api.sb.createos.sh",
        key: "apiUrl",
      },
      apiKey: {
        sourceDescription: "CreateOS API key or Paperclip secret reference. Saved keys become company secrets. The official API endpoint can use CREATEOS_API_KEY from the host; custom endpoints require an explicit key.",
        key: "apiKey",
      },
      shape: {
        sourceTitle: "Shape",
        sourceDescription: "Choose the sandbox CPU and memory size.",
        key: "shape",
      },
      rootfs: {
        sourceDescription: "Root filesystem or ready template ID/name. Omit to use the provider default. The image must supply Bash and the selected agent runtime dependencies.",
        key: "rootfs",
      },
      region: {
        sourceDescription: "Optional region; must match the API endpoint's region.",
        key: "region",
      },
      timeoutMs: {
        sourceDescription: "Operation and default command timeout in milliseconds. This is not a sandbox lifetime.",
        key: "timeoutMs",
      },
      reuseLease: {
        sourceDescription: "Pause the sandbox after a run and resume it for subsequent runs instead of deleting it.",
        key: "reuseLease",
      },
    },
  },
};

const OWN_LOCAL_FOLDER_PRESENTATION_KEYS: Record<string, { pluginKey: string; key: string }> = {
  "wiki-root": { pluginKey: "paperclipai.plugin-llm-wiki", key: "llmWikiRoot" },
};

const OWN_PLUGIN_UI_SLOT_PRESENTATION_KEYS: Record<string, Record<string, { key: string; sourceDisplayName: string }>> = {
  "paperclipai.plugin-llm-wiki": {
    "wiki-sidebar": { key: "llmWikiSidebar", sourceDisplayName: "Wiki" },
    "wiki-page": { key: "llmWikiPage", sourceDisplayName: "Wiki" },
    "wiki-route-sidebar": { key: "llmWikiRouteSidebar", sourceDisplayName: "Wiki" },
  },
  "paperclip.workspace-diff": {
    "workspace-changes-tab": { key: "workspaceChangesTab", sourceDisplayName: "Changes" },
  },
  "paperclip-kitchen-sink-example": {
    "kitchen-sink-page": { key: "kitchenSinkPage", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-settings-page": { key: "kitchenSinkSettingsPage", sourceDisplayName: "Kitchen Sink Settings" },
    "kitchen-sink-company-settings-page": { key: "kitchenSinkCompanySettingsPage", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-dashboard-widget": { key: "kitchenSinkDashboardWidget", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-sidebar-link": { key: "kitchenSinkSidebar", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-sidebar-panel": { key: "kitchenSinkSidebarPanel", sourceDisplayName: "Kitchen Sink Panel" },
    "kitchen-sink-project-link": { key: "kitchenSinkProjectSidebarItem", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-project-tab": { key: "kitchenSinkProjectTab", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-issue-tab": { key: "kitchenSinkIssueTab", sourceDisplayName: "Kitchen Sink" },
    "kitchen-sink-task-detail": { key: "kitchenSinkTaskDetailView", sourceDisplayName: "Kitchen Sink Task View" },
    "kitchen-sink-toolbar-action": { key: "kitchenSinkToolbarButton", sourceDisplayName: "Kitchen Sink Action" },
    "kitchen-sink-context-action": { key: "kitchenSinkContextMenuItem", sourceDisplayName: "Kitchen Sink Context" },
    "kitchen-sink-comment-annotation": { key: "kitchenSinkCommentAnnotation", sourceDisplayName: "Kitchen Sink Comment Annotation" },
    "kitchen-sink-comment-action": { key: "kitchenSinkCommentContextMenuItem", sourceDisplayName: "Kitchen Sink Comment Action" },
  },
  "paperclip-file-browser-example": {
    "files-link": { key: "fileBrowserFilesLink", sourceDisplayName: "Files" },
    "files-tab": { key: "fileBrowserFilesTab", sourceDisplayName: "Files" },
    "comment-file-links": { key: "fileBrowserCommentFileLinks", sourceDisplayName: "File Links" },
    "comment-open-files": { key: "fileBrowserCommentOpenFiles", sourceDisplayName: "Open in Files" },
  },
  "paperclipai.plugin-orchestration-smoke-example": {
    "health-widget": { key: "orchestrationSmokeHealthWidget", sourceDisplayName: "Orchestration Smoke Health" },
    "issue-panel": { key: "orchestrationSmokeIssuePanel", sourceDisplayName: "Orchestration Smoke" },
    settings: { key: "orchestrationSmokeSettings", sourceDisplayName: "Orchestration Smoke" },
  },
  "paperclip.hello-world-example": {
    "hello-world-dashboard-widget": { key: "helloWorldDashboardWidget", sourceDisplayName: "Hello World" },
  },
  "paperclipai.plugin-authoring-smoke-example": {
    "health-widget": { key: "pluginAuthoringSmokeHealthWidget", sourceDisplayName: "Plugin Authoring Smoke Example Health" },
  },
};

const OWN_PLUGIN_UI_LAUNCHER_PRESENTATION_KEYS: Record<string, Record<string, { key: string; sourceDisplayName: string }>> = {
  "paperclip-kitchen-sink-example": {
    "kitchen-sink-launcher": { key: "kitchenSinkModalLauncher", sourceDisplayName: "Kitchen Sink Modal" },
  },
};

function translate(t: TFunction, key: string, defaultValue: string): string {
  return t(key as never, { defaultValue });
}

export function hasOwnedPluginPresentation(pluginKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(OWN_PLUGIN_PRESENTATION_KEYS, pluginKey)
    || Object.prototype.hasOwnProperty.call(OWN_PLUGIN_UI_SLOT_PRESENTATION_KEYS, pluginKey)
    || Object.prototype.hasOwnProperty.call(OWN_PLUGIN_UI_LAUNCHER_PRESENTATION_KEYS, pluginKey);
}

export function localizePluginUiContributionPresentation<T extends {
  pluginKey: string;
  displayName: string;
  slots: Array<{ id: string; displayName: string }>;
  launchers?: Array<{ id: string; displayName: string }>;
}>(
  contribution: T,
  t: TFunction,
  isTrustedBundle = false,
): PluginUiContributionPresentation {
  if (!isTrustedBundle) {
    return { pluginDisplayName: contribution.displayName, slotDisplayNames: {}, launcherDisplayNames: {} };
  }

  const localizedPlugin = localizePluginPresentation(
    contribution.pluginKey,
    contribution.displayName,
    "",
    t,
    true,
  );
  const slotNames = Object.prototype.hasOwnProperty.call(OWN_PLUGIN_UI_SLOT_PRESENTATION_KEYS, contribution.pluginKey)
    ? OWN_PLUGIN_UI_SLOT_PRESENTATION_KEYS[contribution.pluginKey]
    : undefined;
  const slotDisplayNames: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const slot of contribution.slots) {
    if (!slotNames || !Object.prototype.hasOwnProperty.call(slotNames, slot.id)) continue;
    const ownedSlot = slotNames[slot.id];
    if (slot.displayName !== ownedSlot.sourceDisplayName) continue;
    slotDisplayNames[slot.id] = translate(t, `pluginPresentation.uiSlots.${ownedSlot.key}`, slot.displayName);
  }

  const launcherNames = Object.prototype.hasOwnProperty.call(OWN_PLUGIN_UI_LAUNCHER_PRESENTATION_KEYS, contribution.pluginKey)
    ? OWN_PLUGIN_UI_LAUNCHER_PRESENTATION_KEYS[contribution.pluginKey]
    : undefined;
  const launcherDisplayNames: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const launcher of contribution.launchers ?? []) {
    if (!launcherNames || !Object.prototype.hasOwnProperty.call(launcherNames, launcher.id)) continue;
    const ownedLauncher = launcherNames[launcher.id];
    if (launcher.displayName !== ownedLauncher.sourceDisplayName) continue;
    launcherDisplayNames[launcher.id] = translate(
      t,
      `pluginPresentation.uiLaunchers.${ownedLauncher.key}`,
      launcher.displayName,
    );
  }

  return { pluginDisplayName: localizedPlugin.displayName, slotDisplayNames, launcherDisplayNames };
}

export function localizePluginPresentation(
  pluginId: string,
  fallbackDisplayName: string,
  fallbackDescription: string,
  t: TFunction,
  isTrustedBundle = false,
): LocalizedPluginPresentation {
  const key = OWN_PLUGIN_PRESENTATION_KEYS[pluginId];
  if (!isTrustedBundle || !key) {
    return { displayName: fallbackDisplayName, description: fallbackDescription };
  }

  return {
    displayName: translate(t, `pluginPresentation.plugins.${key}.name`, fallbackDisplayName),
    description: translate(t, `pluginPresentation.plugins.${key}.description`, fallbackDescription),
  };
}

/** Translate the fixed plugin category enum only for a verified first-party bundle. */
export function localizePluginCategory(
  category: string,
  t: TFunction,
  isTrustedBundle = false,
): string {
  const key = OWN_PLUGIN_CATEGORY_KEYS[category];
  if (!isTrustedBundle || !key) return category;
  return translate(t, `pluginSettings.about.categoryValues.${key}`, category);
}

export function localizeSandboxProviderPresentation(
  providerKey: string,
  pluginKey: string | undefined,
  fallbackDisplayName: string,
  fallbackDescription: string | undefined,
  t: TFunction,
  isTrustedBundle = false,
): LocalizedSandboxProviderPresentation {
  const ownedProvider = OWN_SANDBOX_PROVIDER_PRESENTATION_KEYS[providerKey];
  if (!isTrustedBundle || !ownedProvider || ownedProvider.pluginId !== pluginKey) {
    return {
      displayName: fallbackDisplayName,
      ...(fallbackDescription === undefined ? {} : { description: fallbackDescription }),
    };
  }

  return {
    displayName: translate(t, `pluginPresentation.sandboxProviders.${ownedProvider.key}.name`, fallbackDisplayName),
    ...(fallbackDescription === undefined
      ? {}
      : {
          description: translate(
            t,
            `pluginPresentation.sandboxProviders.${ownedProvider.key}.description`,
            fallbackDescription,
          ),
        }),
  };
}

/**
 * Localize only known display metadata in a verified bundled provider schema.
 * The source schema stays untouched; unknown fields and changed descriptions
 * pass through verbatim, and config keys/constraints/values are never mapped.
 */
export function localizeSandboxProviderConfigSchema<T extends PluginConfigSchemaPresentationNode | null>(
  providerKey: string,
  pluginKey: string | undefined,
  schema: T,
  t: TFunction,
  isTrustedBundle = false,
): T {
  const ownedProvider = OWN_SANDBOX_PROVIDER_CONFIG_FIELD_PRESENTATION[providerKey];
  if (
    !schema
    || !isTrustedBundle
    || !ownedProvider
    || ownedProvider.pluginId !== pluginKey
    || !schema.properties
  ) {
    return schema;
  }

  let changed = false;
  const properties = { ...schema.properties };
  for (const [fieldKey, fieldSchema] of Object.entries(properties)) {
    let nextFieldSchema = fieldSchema;
    const presentation = ownedProvider.fields[fieldKey];
    if (
      presentation
      && fieldSchema.description === presentation.sourceDescription
      && (presentation.sourceTitle === undefined
        ? fieldSchema.title === undefined
        : fieldSchema.title === presentation.sourceTitle)
    ) {
      nextFieldSchema = {
        ...nextFieldSchema,
        title: translate(t, `pluginPresentation.sandboxProviderConfigFields.${ownedProvider.key}.${presentation.key}.name`, fieldKey),
        description: translate(t, `pluginPresentation.sandboxProviderConfigFields.${ownedProvider.key}.${presentation.key}.description`, presentation.sourceDescription),
      };
    }

    const rawGroup = nextFieldSchema["x-paperclip-group"];
    if (
      nextFieldSchema["x-paperclip-advanced"] === true
      && typeof rawGroup === "string"
      && ownedProvider.groups?.[rawGroup]
    ) {
      nextFieldSchema = {
        ...nextFieldSchema,
        "x-paperclip-group": translate(
          t,
          `pluginPresentation.sandboxProviderConfigGroups.${ownedProvider.key}.${ownedProvider.groups[rawGroup]}`,
          rawGroup,
        ),
      };
    }

    if (nextFieldSchema !== fieldSchema) {
      properties[fieldKey] = nextFieldSchema;
      changed = true;
    }
  }
  return (changed ? { ...schema, properties } : schema) as T;
}

/**
 * Translate only allowlisted labels from an exactly identified first-party
 * plugin instance-config schema. Field titles and descriptions must still
 * match their bundled source text; all other schema metadata and values stay
 * untouched.
 */
export function localizeBundledPluginInstanceConfigSchema<T extends PluginConfigSchemaPresentationNode | null>(
  pluginKey: string,
  schema: T,
  t: TFunction,
  isTrustedBundle = false,
): T {
  const ownedPlugin = OWN_PLUGIN_CONFIG_FIELD_PRESENTATION[pluginKey];
  if (!schema || !isTrustedBundle || !ownedPlugin || !schema.properties) return schema;

  let changed = false;
  const properties = { ...schema.properties };
  for (const [fieldKey, fieldSchema] of Object.entries(properties)) {
    const presentation = ownedPlugin.fields[fieldKey];
    if (
      !presentation
      || fieldSchema.title !== presentation.sourceTitle
      || fieldSchema.description !== presentation.sourceDescription
    ) {
      continue;
    }

    properties[fieldKey] = {
      ...fieldSchema,
      title: translate(t, `pluginPresentation.pluginConfigFields.${ownedPlugin.key}.${presentation.key}.name`, presentation.sourceTitle),
      description: translate(t, `pluginPresentation.pluginConfigFields.${ownedPlugin.key}.${presentation.key}.description`, presentation.sourceDescription),
    };
    changed = true;
  }

  return (changed ? { ...schema, properties } : schema) as T;
}

export function localizePluginLocalFolderPresentation(
  pluginKey: string,
  folderKey: string,
  fallbackDisplayName: string,
  fallbackDescription: string | undefined,
  t: TFunction,
  isTrustedBundle = false,
): LocalizedPluginResourcePresentation {
  const ownedFolder = OWN_LOCAL_FOLDER_PRESENTATION_KEYS[folderKey];
  if (!isTrustedBundle || !ownedFolder || ownedFolder.pluginKey !== pluginKey) {
    return {
      displayName: fallbackDisplayName,
      ...(fallbackDescription === undefined ? {} : { description: fallbackDescription }),
    };
  }

  return {
    displayName: translate(t, `pluginPresentation.localFolders.${ownedFolder.key}.name`, fallbackDisplayName),
    ...(fallbackDescription === undefined
      ? {}
      : { description: translate(t, `pluginPresentation.localFolders.${ownedFolder.key}.description`, fallbackDescription) }),
  };
}
