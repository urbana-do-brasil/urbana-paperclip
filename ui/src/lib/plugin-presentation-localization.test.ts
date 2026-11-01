import { afterAll, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  isBundledPluginRecord,
  localizePluginLocalFolderPresentation,
  localizePluginPresentation,
  localizePluginUiContributionPresentation,
  localizeSandboxProviderPresentation,
  isTrustedBundledPluginContribution,
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

  it("requires a UI contribution to match its installed record and exact bundled package", () => {
    const contribution = { pluginId: "plugin-workspace", pluginKey: "paperclip.workspace-diff" };
    const installed = [{
      id: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
      manifestJson: { id: "paperclip.workspace-diff" },
    }];
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];

    expect(isTrustedBundledPluginContribution(contribution, installed, bundled)).toBe(true);
    expect(isTrustedBundledPluginContribution({ ...contribution, pluginId: "other-plugin" }, installed, bundled)).toBe(false);
    expect(isTrustedBundledPluginContribution(contribution, [{
      ...installed[0], packagePath: "/custom/copied-plugin",
    }], bundled)).toBe(false);
    expect(isTrustedBundledPluginContribution(contribution, [{
      ...installed[0], manifestJson: { id: "vendor.workspace-diff" },
    }], bundled)).toBe(false);
    expect(isTrustedBundledPluginContribution(contribution, undefined, undefined)).toBe(false);
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

  it("localizes only allowlisted labels from verified own UI slot declarations", async () => {
    const ownContribution = {
      pluginId: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      displayName: "Workspace Changes",
      version: "0.1.0",
      uiEntryFile: "index.js",
      slots: [{
        type: "detailTab",
        id: "workspace-changes-tab",
        displayName: "Changes",
        exportName: "ChangesTab",
      }],
      launchers: [],
    };

    await i18n.changeLanguage("pt-BR");
    const portuguesePresentation = localizePluginUiContributionPresentation(ownContribution, i18n.t, true);
    expect(portuguesePresentation).toEqual({
      pluginDisplayName: "Alterações no workspace",
      slotDisplayNames: { "workspace-changes-tab": "Alterações" },
    });
    expect(ownContribution.displayName).toBe("Workspace Changes");
    expect(ownContribution.slots[0]?.displayName).toBe("Changes");

    await i18n.changeLanguage("en");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true)).toEqual({
      pluginDisplayName: "Workspace Changes",
      slotDisplayNames: { "workspace-changes-tab": "Changes" },
    });
  });

  it("preserves copied plugin contribution metadata and non-static slot text", async () => {
    await i18n.changeLanguage("pt-BR");
    const copiedContribution = {
      pluginId: "external-plugin",
      pluginKey: "paperclip.workspace-diff",
      displayName: "Vendor Changes",
      version: "9.0.0",
      uiEntryFile: "index.js",
      slots: [{
        type: "detailTab",
        id: "workspace-changes-tab",
        displayName: "Vendor supplied label",
        exportName: "ChangesTab",
      }],
      launchers: [],
    };

    expect(localizePluginUiContributionPresentation(copiedContribution, i18n.t, false)).toEqual({
      pluginDisplayName: "Vendor Changes",
      slotDisplayNames: {},
    });
    expect(copiedContribution.displayName).toBe("Vendor Changes");
    expect(copiedContribution.slots[0]?.displayName).toBe("Vendor supplied label");
    const trustedPresentation = localizePluginUiContributionPresentation({
      ...copiedContribution,
      pluginId: "plugin-workspace",
      displayName: "Workspace Changes",
      slots: [{ ...copiedContribution.slots[0], displayName: "User supplied label" }],
    }, i18n.t, true);
    expect(trustedPresentation.slotDisplayNames["workspace-changes-tab"]).toBeUndefined();
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

  it("localizes an owned managed-folder declaration only for its verified plugin", async () => {
    await i18n.changeLanguage("pt-BR");
    const fallbackDescription = "Company-scoped local folder that stores raw sources, wiki pages, Paperclip project standups under wiki/projects/, AGENTS.md, IDEA.md, wiki/index.md, and wiki/log.md.";

    expect(localizePluginLocalFolderPresentation(
      "paperclipai.plugin-llm-wiki",
      "wiki-root",
      "Wiki root",
      fallbackDescription,
      i18n.t,
      true,
    )).toEqual({
      displayName: "Pasta raiz da Wiki",
      description: "Pasta local da organização que armazena fontes brutas, páginas da Wiki, sínteses dos projetos do Paperclip em wiki/projects/, AGENTS.md, IDEA.md, wiki/index.md e wiki/log.md.",
    });

    expect(localizePluginLocalFolderPresentation(
      "paperclipai.plugin-llm-wiki",
      "wiki-root",
      "Vendor Wiki root",
      "Vendor metadata remains unchanged.",
      i18n.t,
      false,
    )).toEqual({
      displayName: "Vendor Wiki root",
      description: "Vendor metadata remains unchanged.",
    });
    expect(localizePluginLocalFolderPresentation(
      "vendor.wiki-compatible",
      "wiki-root",
      "Compatible folder",
      "A vendor reused the folder key.",
      i18n.t,
      true,
    )).toEqual({
      displayName: "Compatible folder",
      description: "A vendor reused the folder key.",
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
