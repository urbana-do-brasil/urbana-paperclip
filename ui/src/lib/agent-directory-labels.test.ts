import { afterAll, describe, expect, it } from "vitest";
import {
  getEnvironmentCapabilities,
  type Agent,
  type Environment,
  type EnvironmentCapabilities,
  type PluginRecord,
} from "@paperclipai/shared";
import type { AvailableBundledPlugin } from "@/api/plugins";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { resolveAgentEnvironment } from "./agent-directory-labels";

const ownPluginKey = "paperclip.daytona-sandbox-provider";
const ownPackageName = "@paperclipai/plugin-daytona";
const ownPackagePath = "/app/packages/plugins/sandbox-providers/daytona";

function makePlugin(overrides: Partial<PluginRecord> = {}): PluginRecord {
  return {
    id: "daytona-plugin-id",
    pluginKey: ownPluginKey,
    packageName: ownPackageName,
    version: "0.1.0",
    apiVersion: 1,
    categories: [],
    manifestJson: {
      id: ownPluginKey,
      displayName: "Daytona Sandbox Provider",
    } as PluginRecord["manifestJson"],
    status: "ready",
    installOrder: 1,
    packagePath: ownPackagePath,
    lastError: null,
    installedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

const bundledPlugin: AvailableBundledPlugin = {
  pluginKey: ownPluginKey,
  packageName: ownPackageName,
  displayName: "Daytona Sandbox Provider",
  description: "First-party Daytona sandbox provider.",
  localPath: ownPackagePath,
  tag: "first-party",
  experimental: false,
  hasBuiltEntrypoints: true,
};

function makeCapabilities(pluginId = "daytona-plugin-id", displayName = "Daytona Sandbox"): EnvironmentCapabilities {
  return getEnvironmentCapabilities(["codex_local"], {
    sandboxProviders: {
      daytona: {
        status: "supported",
        source: "plugin",
        pluginId,
        pluginKey: ownPluginKey,
        displayName,
        description: "A provider-owned description.",
      },
    },
  });
}

const environment: Environment = {
  id: "env-daytona",
  name: "Daytona environment",
  description: null,
  driver: "sandbox",
  status: "active",
  config: { provider: "daytona" },
  envVars: {},
  metadata: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const agent = { defaultEnvironmentId: environment.id } as Agent;

const missingProofSources: Array<{
  state: string;
  installed: readonly PluginRecord[] | undefined;
  bundled: readonly AvailableBundledPlugin[] | undefined;
}> = [
  { state: "installed plugin data is loading", installed: undefined, bundled: [bundledPlugin] },
  { state: "installed plugin data is empty", installed: [], bundled: [bundledPlugin] },
  { state: "bundled catalog data is loading", installed: [makePlugin()], bundled: undefined },
  { state: "bundled catalog data is empty", installed: [makePlugin()], bundled: [] },
  { state: "both sources are missing", installed: undefined, bundled: undefined },
];

const missingProofCases = (["pt-BR", "en"] as const).flatMap((locale) =>
  missingProofSources.map((source) => ({
    ...source,
    locale,
    expectedDetail: locale === "pt-BR"
      ? "Daytona Sandbox (provedor de sandbox)"
      : "Daytona Sandbox sandbox provider",
  })),
);

function resolve(
  capabilities: EnvironmentCapabilities,
  installedPlugins?: readonly PluginRecord[],
  bundledPlugins?: readonly AvailableBundledPlugin[],
) {
  return resolveAgentEnvironment(
    agent,
    new Map([[environment.id, environment]]),
    null,
    capabilities,
    i18n.t,
    installedPlugins,
    bundledPlugins,
  );
}

afterAll(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe("agent directory sandbox provider labels", () => {
  it.each([
    ["pt-BR", "Sandbox Daytona (provedor de sandbox)"],
    ["en", "Daytona Sandbox sandbox provider"],
  ] as const)("localizes a trusted bundled provider in %s", async (locale, expectedDetail) => {
    await i18n.changeLanguage(locale);

    expect(resolve(makeCapabilities(), [makePlugin()], [bundledPlugin]).detail).toBe(expectedDetail);
  });

  it.each([
    ["pt-BR", "Vendor Daytona Compat (provedor de sandbox)"],
    ["en", "Vendor Daytona Compat sandbox provider"],
  ] as const)("preserves a colliding external provider in %s", async (locale, expectedDetail) => {
    await i18n.changeLanguage(locale);
    const externalPlugin = makePlugin({
      id: "vendor-plugin-id",
      packageName: "vendor/daytona-compatible",
      packagePath: "/custom/vendor/daytona-compatible",
      manifestJson: {
        id: ownPluginKey,
        displayName: "Vendor Daytona Compat",
      } as PluginRecord["manifestJson"],
    });

    expect(resolve(
      makeCapabilities("vendor-plugin-id", "Vendor Daytona Compat"),
      [externalPlugin],
      [bundledPlugin],
    ).detail).toBe(expectedDetail);
  });

  it.each(missingProofCases)("falls back to source metadata when $state in $locale", async ({
    locale,
    installed,
    bundled,
    expectedDetail,
  }) => {
    await i18n.changeLanguage(locale);

    expect(resolve(makeCapabilities(), installed, bundled).detail).toBe(expectedDetail);
  });
});
