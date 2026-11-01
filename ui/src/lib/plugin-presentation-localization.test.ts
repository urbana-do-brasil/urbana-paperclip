import { afterAll, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  isBundledPluginRecord,
  localizePluginPresentation,
  localizeSandboxProviderPresentation,
} from "./plugin-presentation-localization";

afterAll(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe("owned plugin presentation localization", () => {
  it("recognizes a first-party source only when the installed record matches the host bundle", () => {
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];
    const installed = {
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
    };

    expect(isBundledPluginRecord(installed, bundled)).toBe(true);
    expect(isBundledPluginRecord({ ...installed, packagePath: "/custom/vendor-copy" }, bundled)).toBe(false);
    expect(isBundledPluginRecord({ ...installed, packageName: "vendor/workspace-diff" }, bundled)).toBe(false);
  });

  it("preserves external metadata when a package reuses a first-party manifest ID", async () => {
    await i18n.changeLanguage("pt-BR");
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];
    const external = {
      pluginKey: "paperclip.workspace-diff",
      packageName: "vendor/copied-workspace-plugin",
      packagePath: "/custom/vendor/copied-workspace-plugin",
    };
    const isTrustedBundle = isBundledPluginRecord(external, bundled);

    expect(localizePluginPresentation(
      "paperclip.workspace-diff",
      "Vendor Workspace Tool",
      "The external manifest description remains verbatim.",
      i18n.t,
      isTrustedBundle,
    )).toEqual({
      displayName: "Vendor Workspace Tool",
      description: "The external manifest description remains verbatim.",
    });
  });

  it("localizes first-party plugin metadata in Portuguese and English", async () => {
    const fallback = {
      displayName: "Workspace Changes",
      description: "Adds a Changes tab to execution and project workspaces using plugin-local Git diff computation and @pierre/diffs.",
    };

    await i18n.changeLanguage("pt-BR");
    expect(localizePluginPresentation("paperclip.workspace-diff", fallback.displayName, fallback.description, i18n.t, true))
      .toEqual({
        displayName: "Alterações no workspace",
        description: "Adiciona uma aba de alterações aos workspaces de execução e de projetos usando o cálculo de diff do Git do próprio plugin e @pierre/diffs.",
      });

    await i18n.changeLanguage("en");
    expect(localizePluginPresentation("paperclip.workspace-diff", fallback.displayName, fallback.description, i18n.t, true))
      .toEqual(fallback);
  });

  it("localizes first-party sandbox metadata and preserves unknown provider text", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(localizeSandboxProviderPresentation(
      "daytona",
      "paperclip.daytona-sandbox-provider",
      "Daytona Sandbox",
      "Provisions Daytona sandboxes with configurable image or snapshot selection, startup timeouts, and lease reuse.",
      i18n.t,
      true,
    )).toEqual({
      displayName: "Sandbox Daytona",
      description: "Provisiona sandboxes do Daytona com seleção de imagem ou snapshot, timeouts de inicialização e reutilização de leases configuráveis.",
    });

    const external = localizeSandboxProviderPresentation(
      "vendor-container",
      "vendor.sandbox-provider",
      "Fornecedor Externo",
      "Texto do provedor; preserve it verbatim.",
      i18n.t,
    );
    expect(external).toEqual({
      displayName: "Fornecedor Externo",
      description: "Texto do provedor; preserve it verbatim.",
    });

    expect(localizeSandboxProviderPresentation(
      "daytona",
      "vendor.daytona-compat-provider",
      "Vendor Daytona Compat",
      "A vendor-owned provider reusing a familiar key stays unchanged.",
      i18n.t,
      true,
    )).toEqual({
      displayName: "Vendor Daytona Compat",
      description: "A vendor-owned provider reusing a familiar key stays unchanged.",
    });
  });

  it("preserves names and descriptions from external plugin manifests", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(localizePluginPresentation(
      "vendor.search-provider",
      "外部 Search Provider",
      "Vendor-owned description stays in its original language.",
      i18n.t,
      false,
    )).toEqual({
      displayName: "外部 Search Provider",
      description: "Vendor-owned description stays in its original language.",
    });

    expect(localizePluginPresentation(
      "paperclip.workspace-diff",
      "Workspace Changes",
      "Manifest ID reused by an external package.",
      i18n.t,
      false,
    )).toEqual({
      displayName: "Workspace Changes",
      description: "Manifest ID reused by an external package.",
    });
  });
});
