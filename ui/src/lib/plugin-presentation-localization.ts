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
  fields: Record<string, { sourceDescription: string; key: string }>;
}> = {
  daytona: {
    pluginId: "paperclip.daytona-sandbox-provider",
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
  for (const [fieldKey, presentation] of Object.entries(ownedProvider.fields)) {
    const fieldSchema = properties[fieldKey];
    if (
      !fieldSchema
      || fieldSchema.title !== undefined
      || fieldSchema.description !== presentation.sourceDescription
    ) {
      continue;
    }
    properties[fieldKey] = {
      ...fieldSchema,
      title: translate(t, `pluginPresentation.sandboxProviderConfigFields.daytona.${presentation.key}.name`, fieldKey),
      description: translate(t, `pluginPresentation.sandboxProviderConfigFields.daytona.${presentation.key}.description`, presentation.sourceDescription),
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
