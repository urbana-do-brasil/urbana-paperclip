// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pluginsApi, type PluginUiContribution } from "@/api/plugins";
import { i18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import {
  PluginSlotMount,
  _resetPluginModuleLoader,
  ensurePluginContributionLoaded,
  registerPluginReactComponent,
  usePluginUiContributionsWithPresentation,
  usePluginSlots,
  type ResolvedPluginSlot,
} from "./slots";

const contribution: PluginUiContribution = {
  pluginId: "navigation", pluginKey: "fixture.navigation", displayName: "Navigation", version: "1",
  uiEntryFile: "index.js", launchers: [],
  slots: [{ type: "organizationSwitcher", id: "navigation", displayName: "Organizations", exportName: "Switcher" }],
};
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let previousLanguage: string | undefined;
function Consumer() {
  const { isLoading } = usePluginSlots({ slotTypes: ["organizationSwitcher"] });
  return <span>{isLoading ? "Loading" : "Ready"}</span>;
}
function ContributionConsumer() {
  const { data, presentations, isLoading } = usePluginUiContributionsWithPresentation();
  const contributionRow = data?.[0];
  const slot = contributionRow?.slots[0];
  const presentation = contributionRow ? presentations.get(contributionRow.pluginId) : undefined;
  return <span>{isLoading
    ? "Loading"
    : `${presentation?.pluginDisplayName ?? "Missing"} / ${contributionRow?.displayName ?? "Missing"} / ${presentation?.slotDisplayNames[slot?.id ?? ""] ?? slot?.displayName ?? "Missing"} / ${slot?.displayName ?? "Missing"}`}</span>;
}
let pluginMountCount = 0;
function MountedSlotProbe({ slot }: { slot: ResolvedPluginSlot }) {
  const [mountId] = useState(() => ++pluginMountCount);
  return <span data-testid="mounted-slot-probe" data-mount-id={mountId} data-display-name={slot.displayName}>
    {slot.displayName}
  </span>;
}
function PresentationMountedSlotConsumer() {
  const { slots } = usePluginSlots({ slotTypes: ["detailTab"], entityType: "project_workspace" });
  const slot = slots[0];
  if (!slot) return null;
  return <>
    <span data-testid="host-slot-label">{slot.hostDisplayName}</span>
    <PluginSlotMount slot={slot} context={{ companyId: "company-1" }} />
  </>;
}
async function render() {
  await act(async () => root.render(<QueryClientProvider client={client}><Consumer /></QueryClientProvider>));
}
beforeEach(() => {
  pluginMountCount = 0;
  previousLanguage = i18n.resolvedLanguage ?? i18n.language;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("__paperclipPluginBridge__", {});
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); client.clear(); _resetPluginModuleLoader();
  if (previousLanguage) await act(async () => { await i18n.changeLanguage(previousLanguage); });
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
it("does not wait for or load modules for unrelated slots", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  client.setQueryData(queryKeys.plugins.uiContributions, [{ ...contribution,
    slots: [{ type: "page", id: "other", displayName: "Other", exportName: "Page", routePath: "other" }],
  }]);
  await render();
  expect(container.textContent).toBe("Ready");
  expect(fetch).not.toHaveBeenCalled();
});
it("settles when a module import started by another consumer fails", async () => {
  let reject!: (error: Error) => void;
  const fetch = vi.fn(() => new Promise<Response>((_resolve, rejectPromise) => { reject = rejectPromise; }));
  vi.stubGlobal("fetch", fetch); vi.spyOn(console, "error").mockImplementation(() => {});
  client.setQueryData(queryKeys.plugins.uiContributions, [contribution]);
  const loading = ensurePluginContributionLoaded(contribution);
  await render();
  expect(container.textContent).toBe("Loading");
  await act(async () => { reject(new Error("unavailable")); await loading; });
  expect(container.textContent).toBe("Ready");
  expect(fetch).toHaveBeenCalledOnce();
});

it("localizes a verified bundled slot after matching its installed package identity", async () => {
  await i18n.changeLanguage("pt-BR");
  client.setQueryData(queryKeys.plugins.uiContributions, [{
    ...contribution,
    pluginId: "plugin-workspace",
    pluginKey: "paperclip.workspace-diff",
    displayName: "Workspace Changes",
    slots: [{ type: "detailTab", id: "workspace-changes-tab", displayName: "Changes", exportName: "ChangesTab" }],
  }]);
  client.setQueryData(queryKeys.plugins.all, [{
    id: "plugin-workspace",
    pluginKey: "paperclip.workspace-diff",
    packageName: "@paperclipai/plugin-workspace-diff",
    packagePath: "/app/packages/plugins/plugin-workspace-diff",
    manifestJson: { id: "paperclip.workspace-diff" },
  }]);
  client.setQueryData(queryKeys.plugins.examples, [{
    pluginKey: "paperclip.workspace-diff",
    packageName: "@paperclipai/plugin-workspace-diff",
    localPath: "/app/packages/plugins/plugin-workspace-diff",
  }]);

  await act(async () => root.render(<QueryClientProvider client={client}><ContributionConsumer /></QueryClientProvider>));

  expect(container.textContent).toBe("Alterações no workspace / Workspace Changes / Alterações / Changes");
});

it("keeps a copied contribution in its source language when the bundle path does not match", async () => {
  await i18n.changeLanguage("pt-BR");
  client.setQueryData(queryKeys.plugins.uiContributions, [{
    ...contribution,
    pluginId: "copied-workspace-plugin",
    pluginKey: "paperclip.workspace-diff",
    displayName: "Workspace Changes",
    slots: [{ type: "detailTab", id: "workspace-changes-tab", displayName: "Changes", exportName: "ChangesTab" }],
  }]);
  client.setQueryData(queryKeys.plugins.all, [{
    id: "copied-workspace-plugin",
    pluginKey: "paperclip.workspace-diff",
    packageName: "vendor/copied-workspace-plugin",
    packagePath: "/custom/vendor/copied-workspace-plugin",
    manifestJson: { id: "paperclip.workspace-diff" },
  }]);
  client.setQueryData(queryKeys.plugins.examples, [{
    pluginKey: "paperclip.workspace-diff",
    packageName: "@paperclipai/plugin-workspace-diff",
    localPath: "/app/packages/plugins/plugin-workspace-diff",
  }]);

  await act(async () => root.render(<QueryClientProvider client={client}><ContributionConsumer /></QueryClientProvider>));

  expect(container.textContent).toBe("Workspace Changes / Workspace Changes / Changes / Changes");
});

it("falls back to source metadata when bundle provenance cannot be read", async () => {
  await i18n.changeLanguage("pt-BR");
  client.setQueryData(queryKeys.plugins.uiContributions, [{
    ...contribution,
    pluginId: "plugin-workspace",
    pluginKey: "paperclip.workspace-diff",
    displayName: "Workspace Changes",
    slots: [{ type: "detailTab", id: "workspace-changes-tab", displayName: "Changes", exportName: "ChangesTab" }],
  }]);
  vi.spyOn(pluginsApi, "list").mockRejectedValue(new Error("bundle record unavailable"));
  vi.spyOn(pluginsApi, "listBundled").mockRejectedValue(new Error("bundle catalog unavailable"));

  await act(async () => root.render(<QueryClientProvider client={client}><ContributionConsumer /></QueryClientProvider>));
  await act(async () => {
    await vi.waitFor(() => expect(container.textContent).toBe("Workspace Changes / Workspace Changes / Changes / Changes"));
  });
});

it("shows original contribution metadata while provenance is pending, then updates host labels", async () => {
  await i18n.changeLanguage("pt-BR");
  client.setQueryData(queryKeys.plugins.uiContributions, [{
    ...contribution,
    pluginId: "plugin-workspace",
    pluginKey: "paperclip.workspace-diff",
    displayName: "Workspace Changes",
    slots: [{ type: "detailTab", id: "workspace-changes-tab", displayName: "Changes", exportName: "ChangesTab" }],
  }]);
  let resolveInstalled!: (value: Awaited<ReturnType<typeof pluginsApi.list>>) => void;
  let resolveBundled!: (value: Awaited<ReturnType<typeof pluginsApi.listBundled>>) => void;
  vi.spyOn(pluginsApi, "list").mockImplementation(() => new Promise((resolve) => { resolveInstalled = resolve; }));
  vi.spyOn(pluginsApi, "listBundled").mockImplementation(() => new Promise((resolve) => { resolveBundled = resolve; }));

  await act(async () => root.render(<QueryClientProvider client={client}><ContributionConsumer /></QueryClientProvider>));

  expect(container.textContent).toBe("Workspace Changes / Workspace Changes / Changes / Changes");

  await act(async () => {
    resolveInstalled([{
      id: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
      manifestJson: { id: "paperclip.workspace-diff" },
    } as Awaited<ReturnType<typeof pluginsApi.list>>[number]]);
    resolveBundled([{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    } as Awaited<ReturnType<typeof pluginsApi.listBundled>>[number]]);
    await vi.waitFor(() => expect(container.textContent).toBe(
      "Alterações no workspace / Workspace Changes / Alterações / Changes",
    ));
  });
});

it("updates host labels after delayed proof and locale changes without remounting the plugin", async () => {
  await i18n.changeLanguage("pt-BR");
  const ownContribution: PluginUiContribution = {
    ...contribution,
    pluginId: "plugin-workspace",
    pluginKey: "paperclip.workspace-diff",
    displayName: "Workspace Changes",
    slots: [{
      type: "detailTab",
      id: "workspace-changes-tab",
      displayName: "Changes",
      exportName: "ChangesTab",
      entityTypes: ["project_workspace"],
    }],
  };
  client.setQueryData(queryKeys.plugins.uiContributions, [ownContribution]);
  client.setQueryData(queryKeys.auth.session, { user: { id: "alice" } });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("plugin module fetch not needed for registered test component")));
  vi.spyOn(console, "error").mockImplementation(() => {});
  let resolveInstalled!: (value: Awaited<ReturnType<typeof pluginsApi.list>>) => void;
  let resolveBundled!: (value: Awaited<ReturnType<typeof pluginsApi.listBundled>>) => void;
  vi.spyOn(pluginsApi, "list").mockImplementation(() => new Promise((resolve) => { resolveInstalled = resolve; }));
  vi.spyOn(pluginsApi, "listBundled").mockImplementation(() => new Promise((resolve) => { resolveBundled = resolve; }));
  registerPluginReactComponent("paperclip.workspace-diff", "ChangesTab", MountedSlotProbe);

  await act(async () => root.render(<QueryClientProvider client={client}><PresentationMountedSlotConsumer /></QueryClientProvider>));
  expect(container.querySelector('[data-testid="host-slot-label"]')?.textContent).toBe("Changes");
  expect(container.querySelector('[data-testid="mounted-slot-probe"]')?.textContent).toBe("Changes");
  expect(container.querySelector('[data-testid="mounted-slot-probe"]')?.getAttribute("data-mount-id")).toBe("1");

  await act(async () => {
    resolveInstalled([{
      id: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
      manifestJson: { id: "paperclip.workspace-diff" },
    } as Awaited<ReturnType<typeof pluginsApi.list>>[number]]);
    resolveBundled([{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    } as Awaited<ReturnType<typeof pluginsApi.listBundled>>[number]]);
    await vi.waitFor(() => expect(container.querySelector('[data-testid="host-slot-label"]')?.textContent).toBe("Alterações"));
  });
  expect(container.querySelector('[data-testid="mounted-slot-probe"]')?.getAttribute("data-display-name")).toBe("Changes");
  expect(container.querySelector('[data-testid="mounted-slot-probe"]')?.getAttribute("data-mount-id")).toBe("1");

  await act(async () => { await i18n.changeLanguage("en"); });
  expect(container.querySelector('[data-testid="host-slot-label"]')?.textContent).toBe("Changes");
  expect(container.querySelector('[data-testid="mounted-slot-probe"]')?.getAttribute("data-display-name")).toBe("Changes");
  expect(container.querySelector('[data-testid="mounted-slot-probe"]')?.getAttribute("data-mount-id")).toBe("1");
});
