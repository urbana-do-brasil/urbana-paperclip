import type { TFunction } from "i18next";

export interface LocalizedPluginPresentation {
  displayName: string;
  description: string;
}

export interface LocalizedSandboxProviderPresentation {
  displayName: string;
  description?: string;
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

function translate(t: TFunction, key: string, defaultValue: string): string {
  return t(key as never, { defaultValue });
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
