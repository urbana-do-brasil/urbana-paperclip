import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  isBundledPluginRecord,
  localizePluginLocalFolderPresentation,
  localizePluginPresentation,
  localizeManagedPluginDisplayName,
  localizeManagedPluginResourceDisplayName,
  localizePluginUiContributionPresentation,
  localizeSandboxProviderPresentation,
  isTrustedBundledPluginContribution,
} from "./plugin-presentation-localization";

afterAll(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

const ownUiSlotInventory = [
  {
    pluginKey: "paperclipai.plugin-llm-wiki",
    slots: [
      { id: "wiki-sidebar", sourceDisplayName: "Wiki", messageKey: "llmWikiSidebar", ptBr: "Wiki" },
      { id: "wiki-page", sourceDisplayName: "Wiki", messageKey: "llmWikiPage", ptBr: "Wiki" },
      { id: "wiki-route-sidebar", sourceDisplayName: "Wiki", messageKey: "llmWikiRouteSidebar", ptBr: "Wiki" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclip.workspace-diff",
    slots: [
      { id: "workspace-changes-tab", sourceDisplayName: "Changes", messageKey: "workspaceChangesTab", ptBr: "Alterações" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclip-kitchen-sink-example",
    slots: [
      { id: "kitchen-sink-page", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkPage", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-settings-page", sourceDisplayName: "Kitchen Sink Settings", messageKey: "kitchenSinkSettingsPage", ptBr: "Configurações do Kitchen Sink" },
      { id: "kitchen-sink-company-settings-page", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkCompanySettingsPage", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-dashboard-widget", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkDashboardWidget", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-sidebar-link", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkSidebar", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-sidebar-panel", sourceDisplayName: "Kitchen Sink Panel", messageKey: "kitchenSinkSidebarPanel", ptBr: "Painel do Kitchen Sink" },
      { id: "kitchen-sink-project-link", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkProjectSidebarItem", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-project-tab", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkProjectTab", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-issue-tab", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkIssueTab", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-task-detail", sourceDisplayName: "Kitchen Sink Task View", messageKey: "kitchenSinkTaskDetailView", ptBr: "Visão da tarefa do Kitchen Sink" },
      { id: "kitchen-sink-toolbar-action", sourceDisplayName: "Kitchen Sink Action", messageKey: "kitchenSinkToolbarButton", ptBr: "Ação do Kitchen Sink" },
      { id: "kitchen-sink-context-action", sourceDisplayName: "Kitchen Sink Context", messageKey: "kitchenSinkContextMenuItem", ptBr: "Contexto do Kitchen Sink" },
      { id: "kitchen-sink-comment-annotation", sourceDisplayName: "Kitchen Sink Comment Annotation", messageKey: "kitchenSinkCommentAnnotation", ptBr: "Anotação de comentário do Kitchen Sink" },
      { id: "kitchen-sink-comment-action", sourceDisplayName: "Kitchen Sink Comment Action", messageKey: "kitchenSinkCommentContextMenuItem", ptBr: "Ação de comentário do Kitchen Sink" },
    ],
    launchers: [
      { id: "kitchen-sink-launcher", sourceDisplayName: "Kitchen Sink Modal", messageKey: "kitchenSinkModalLauncher", ptBr: "Modal do Kitchen Sink" },
    ],
  },
  {
    pluginKey: "paperclip-file-browser-example",
    slots: [
      { id: "files-link", sourceDisplayName: "Files", messageKey: "fileBrowserFilesLink", ptBr: "Arquivos" },
      { id: "files-tab", sourceDisplayName: "Files", messageKey: "fileBrowserFilesTab", ptBr: "Arquivos" },
      { id: "comment-file-links", sourceDisplayName: "File Links", messageKey: "fileBrowserCommentFileLinks", ptBr: "Links de arquivos" },
      { id: "comment-open-files", sourceDisplayName: "Open in Files", messageKey: "fileBrowserCommentOpenFiles", ptBr: "Abrir em Arquivos" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclipai.plugin-orchestration-smoke-example",
    slots: [
      { id: "health-widget", sourceDisplayName: "Orchestration Smoke Health", messageKey: "orchestrationSmokeHealthWidget", ptBr: "Saúde do teste de fumaça da orquestração" },
      { id: "issue-panel", sourceDisplayName: "Orchestration Smoke", messageKey: "orchestrationSmokeIssuePanel", ptBr: "Teste de fumaça da orquestração" },
      { id: "settings", sourceDisplayName: "Orchestration Smoke", messageKey: "orchestrationSmokeSettings", ptBr: "Teste de fumaça da orquestração" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclip.hello-world-example",
    slots: [
      { id: "hello-world-dashboard-widget", sourceDisplayName: "Hello World", messageKey: "helloWorldDashboardWidget", ptBr: "Hello World" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclipai.plugin-authoring-smoke-example",
    slots: [
      { id: "health-widget", sourceDisplayName: "Plugin Authoring Smoke Example Health", messageKey: "pluginAuthoringSmokeHealthWidget", ptBr: "Saúde do exemplo de teste de fumaça de autoria de plugin" },
    ],
    launchers: [],
  },
] as const;

const ownUiSlotManifestSources: Record<string, string[]> = {
  "paperclipai.plugin-llm-wiki": ["../../../packages/plugins/plugin-llm-wiki/src/manifest.ts"],
  "paperclip.workspace-diff": ["../../../packages/plugins/plugin-workspace-diff/src/manifest.ts"],
  "paperclip-kitchen-sink-example": [
    "../../../packages/plugins/examples/plugin-kitchen-sink-example/src/manifest.ts",
    "../../../packages/plugins/examples/plugin-kitchen-sink-example/src/constants.ts",
  ],
  "paperclip-file-browser-example": ["../../../packages/plugins/examples/plugin-file-browser-example/src/manifest.ts"],
  "paperclipai.plugin-orchestration-smoke-example": ["../../../packages/plugins/examples/plugin-orchestration-smoke-example/src/manifest.ts"],
  "paperclip.hello-world-example": ["../../../packages/plugins/examples/plugin-hello-world-example/src/manifest.ts"],
  "paperclipai.plugin-authoring-smoke-example": ["../../../packages/plugins/examples/plugin-authoring-smoke-example/src/manifest.ts"],
};

describe("owned plugin presentation localization", () => {
  it("keeps the host translation allowlist aligned with all first-party slot IDs and labels", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);
      for (const owner of ownUiSlotInventory) {
        const manifestSource = ownUiSlotManifestSources[owner.pluginKey]
          ?.map((sourcePath) => readFileSync(new URL(sourcePath, import.meta.url), "utf8"))
          .join("\n");
        expect(manifestSource).toBeDefined();
        const contribution = {
          pluginKey: owner.pluginKey,
          displayName: owner.pluginKey,
          slots: owner.slots.map(({ id, sourceDisplayName }) => ({ id, displayName: sourceDisplayName })),
          launchers: owner.launchers.map(({ id, sourceDisplayName }) => ({ id, displayName: sourceDisplayName })),
        };
        const expectedDisplayNames = Object.fromEntries(owner.slots.map((slot) => [
          slot.id,
          locale === "pt-BR" ? slot.ptBr : slot.sourceDisplayName,
        ]));
        const expectedLauncherDisplayNames = Object.fromEntries(owner.launchers.map((launcher) => [
          launcher.id,
          locale === "pt-BR" ? launcher.ptBr : launcher.sourceDisplayName,
        ]));

        const presentation = localizePluginUiContributionPresentation(contribution, i18n.t, true);
        expect(presentation.slotDisplayNames).toEqual(expectedDisplayNames);
        expect(presentation.launcherDisplayNames).toEqual(expectedLauncherDisplayNames);
        for (const slot of owner.slots) {
          expect(manifestSource).toContain(slot.id);
          expect(manifestSource).toContain(`displayName: "${slot.sourceDisplayName}"`);
          expect(i18n.exists(`pluginPresentation.uiSlots.${slot.messageKey}`, { lng: locale })).toBe(true);
        }
        for (const launcher of owner.launchers) {
          expect(manifestSource).toContain(launcher.id);
          expect(manifestSource).toContain(`displayName: "${launcher.sourceDisplayName}"`);
          expect(i18n.exists(`pluginPresentation.uiLaunchers.${launcher.messageKey}`, { lng: locale })).toBe(true);
        }
        expect(contribution.slots.map((slot) => slot.displayName))
          .toEqual(owner.slots.map((slot) => slot.sourceDisplayName));
        expect(contribution.launchers.map((launcher) => launcher.displayName))
          .toEqual(owner.launchers.map((launcher) => launcher.sourceDisplayName));
      }
    }
  });

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

  it("localizes managed-resource plugin attribution only with matching installed and bundled identity", async () => {
    const attribution = {
      pluginId: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      pluginDisplayName: "Workspace Changes",
    };
    const installed = [{
      id: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
      manifestJson: { id: "paperclip.workspace-diff", displayName: "Workspace Changes" },
    }];
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];

    await i18n.changeLanguage("pt-BR");
    expect(localizeManagedPluginDisplayName(attribution, installed, bundled, i18n.t))
      .toBe("Alterações no workspace");

    expect(localizeManagedPluginDisplayName(attribution, undefined, bundled, i18n.t))
      .toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, installed, undefined, i18n.t))
      .toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, [{
      ...installed[0], id: "other-plugin",
    }], bundled, i18n.t)).toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, [{
      ...installed[0], manifestJson: { ...installed[0].manifestJson, displayName: "Stale name" },
    }], bundled, i18n.t)).toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, [{
      ...installed[0], packagePath: "/custom/vendor-copy",
    }], bundled, i18n.t)).toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName({
      ...attribution,
      pluginKey: "vendor.workspace-diff",
      pluginDisplayName: "External Workspace Tool",
    }, installed, bundled, i18n.t)).toBe("External Workspace Tool");
  });

  it("localizes only unchanged LLM Wiki resource names from an exactly bundled source", async () => {
    const attribution = {
      pluginId: "wiki-plugin",
      pluginKey: "paperclipai.plugin-llm-wiki",
      pluginDisplayName: "LLM Wiki",
    };
    const installed = [{
      id: "wiki-plugin",
      pluginKey: "paperclipai.plugin-llm-wiki",
      packageName: "@paperclipai/plugin-llm-wiki",
      packagePath: "/app/packages/plugins/plugin-llm-wiki",
      manifestJson: { id: "paperclipai.plugin-llm-wiki", displayName: "LLM Wiki" },
    }];
    const bundled = [{
      pluginKey: "paperclipai.plugin-llm-wiki",
      packageName: "@paperclipai/plugin-llm-wiki",
      localPath: "/app/packages/plugins/plugin-llm-wiki",
    }];

    await i18n.changeLanguage("pt-BR");
    const skillAttribution = { ...attribution, resourceKind: "skill" as const, resourceKey: "wiki-ingest" };
    const persistedResource = { id: "wiki-ingest-id", name: "Wiki Ingest", description: "Original content" };
    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      persistedResource.name,
      installed,
      bundled,
      i18n.t,
    )).toBe("Ingestão do Wiki");
    expect(persistedResource).toEqual({ id: "wiki-ingest-id", name: "Wiki Ingest", description: "Original content" });

    expect(localizeManagedPluginResourceDisplayName(
      { ...attribution, resourceKind: "routine", resourceKey: "nightly-wiki-lint" },
      "Run LLM Wiki lint",
      installed,
      bundled,
      i18n.t,
    )).toBe("Executar verificação do LLM Wiki");
    expect(localizeManagedPluginResourceDisplayName(
      { ...attribution, resourceKind: "agent", resourceKey: "wiki-maintainer" },
      "Wiki Maintainer",
      installed,
      bundled,
      i18n.t,
    )).toBe("Responsável pelo Wiki");

    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      "Team's renamed ingestion guide",
      installed,
      bundled,
      i18n.t,
    )).toBe("Team's renamed ingestion guide");
    expect(localizeManagedPluginResourceDisplayName(
      undefined,
      "Unmanaged skill name",
      installed,
      bundled,
      i18n.t,
    )).toBe("Unmanaged skill name");
    expect(localizeManagedPluginResourceDisplayName(
      { ...skillAttribution, resourceKey: "unknown-skill" },
      "Third-party skill name",
      installed,
      bundled,
      i18n.t,
    )).toBe("Third-party skill name");
    expect(localizeManagedPluginResourceDisplayName(
      { ...skillAttribution, pluginKey: "vendor.plugin-llm-wiki", pluginDisplayName: "Vendor Wiki" },
      "Vendor skill name",
      installed,
      bundled,
      i18n.t,
    )).toBe("Vendor skill name");
    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      persistedResource.name,
      [{ ...installed[0], packageName: "vendor/copied-llm-wiki", packagePath: "/custom/vendor-copy" }],
      bundled,
      i18n.t,
    )).toBe("Wiki Ingest");
    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      persistedResource.name,
      installed,
      undefined,
      i18n.t,
    )).toBe("Wiki Ingest");
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
      launcherDisplayNames: {},
    });
    expect(ownContribution.displayName).toBe("Workspace Changes");
    expect(ownContribution.slots[0]?.displayName).toBe("Changes");

    await i18n.changeLanguage("en");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true)).toEqual({
      pluginDisplayName: "Workspace Changes",
      slotDisplayNames: { "workspace-changes-tab": "Changes" },
      launcherDisplayNames: {},
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
      launcherDisplayNames: {},
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

  it("localizes allowlisted File Browser slots and Kitchen Sink launchers without rewriting declarations", async () => {
    const ownContribution = {
      pluginKey: "paperclip-file-browser-example",
      displayName: "File Browser (Example)",
      slots: [
        { id: "files-link", displayName: "Files" },
        { id: "files-tab", displayName: "Files" },
        { id: "comment-file-links", displayName: "File Links" },
        { id: "comment-open-files", displayName: "Open in Files" },
      ],
      launchers: [],
    };
    const ownLauncherContribution = {
      pluginKey: "paperclip-kitchen-sink-example",
      displayName: "Kitchen Sink (Example)",
      slots: [],
      launchers: [{ id: "kitchen-sink-launcher", displayName: "Kitchen Sink Modal" }],
    };

    await i18n.changeLanguage("pt-BR");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true)).toEqual({
      pluginDisplayName: "Navegador de arquivos (exemplo)",
      slotDisplayNames: {
        "files-link": "Arquivos",
        "files-tab": "Arquivos",
        "comment-file-links": "Links de arquivos",
        "comment-open-files": "Abrir em Arquivos",
      },
      launcherDisplayNames: {},
    });
    expect(localizePluginUiContributionPresentation(ownLauncherContribution, i18n.t, true).launcherDisplayNames)
      .toEqual({ "kitchen-sink-launcher": "Modal do Kitchen Sink" });
    expect(localizePluginUiContributionPresentation(ownLauncherContribution, i18n.t, false)).toEqual({
      pluginDisplayName: "Kitchen Sink (Example)",
      slotDisplayNames: {},
      launcherDisplayNames: {},
    });
    expect(localizePluginUiContributionPresentation({
      ...ownLauncherContribution,
      launchers: [{ id: "kitchen-sink-launcher", displayName: "Operator-customized modal" }],
    }, i18n.t, true).launcherDisplayNames).toEqual({});
    expect(ownContribution.slots.map((slot) => slot.displayName)).toEqual([
      "Files", "Files", "File Links", "Open in Files",
    ]);
    expect(ownLauncherContribution.launchers[0]?.displayName).toBe("Kitchen Sink Modal");

    // A matching slot ID and label from another package does not select a translation.
    const collidingPluginContribution = {
      ...ownContribution,
      pluginKey: "vendor.file-browser-compatible",
      slots: [{ id: "files-tab", displayName: "Files" }],
    };
    expect(localizePluginUiContributionPresentation(collidingPluginContribution, i18n.t, true).slotDisplayNames)
      .toEqual({});

    await i18n.changeLanguage("en");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true).slotDisplayNames)
      .toEqual({
        "files-link": "Files",
        "files-tab": "Files",
        "comment-file-links": "File Links",
        "comment-open-files": "Open in Files",
      });
    expect(localizePluginUiContributionPresentation(ownLauncherContribution, i18n.t, true).launcherDisplayNames)
      .toEqual({ "kitchen-sink-launcher": "Kitchen Sink Modal" });
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
