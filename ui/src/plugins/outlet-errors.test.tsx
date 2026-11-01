// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PluginUiContribution } from "@/api/plugins";
import { pluginsApi } from "@/api/plugins";
import { i18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { PluginLauncherOutlet, PluginLauncherProvider } from "./launchers";
import { _resetPluginModuleLoader, PluginSlotOutlet, registerPluginReactComponent } from "./slots";

vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompany: null }) }));

const contribution: PluginUiContribution = {
  pluginId: "fixture", pluginKey: "fixture.sidebar", displayName: "Fixture", version: "1",
  uiEntryFile: "index.js",
  slots: [
    { type: "sidebar", id: "nav", displayName: "Nav", exportName: "SidebarItem" },
    { type: "sidebarPanel", id: "panel", displayName: "Panel", exportName: "SidebarPanel" },
  ],
  launchers: [{
    id: "open", displayName: "Fixture launcher", placementZone: "sidebar",
    action: { type: "navigate", target: "/fixture" },
  }],
};
const localeLauncherContribution: PluginUiContribution = {
  ...contribution,
  launchers: [{
    id: "locale-modal",
    displayName: "Locale launcher",
    placementZone: "sidebar",
    action: { type: "openDrawer", target: "LocaleLauncher" },
  }],
};
const context = { companyId: "company-1", companyPrefix: "PAP" };
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let previousLanguage: string | undefined;

async function render(errorBehavior?: "inline" | "hidden") {
  await act(async () => root.render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PluginLauncherProvider>
          <PluginSlotOutlet slotTypes={["sidebar"]} context={context} errorBehavior={errorBehavior} />
          <PluginLauncherOutlet placementZones={["sidebar"]} context={context} errorBehavior={errorBehavior} />
          <PluginSlotOutlet slotTypes={["sidebarPanel"]} context={context} errorBehavior={errorBehavior} />
        </PluginLauncherProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  previousLanguage = i18n.resolvedLanguage ?? i18n.language;
  // Module and session fetches stay pending; components are registered directly.
  vi.stubGlobal("__paperclipPluginBridge__", {});
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.spyOn(pluginsApi, "listUiContributions").mockRejectedValue(new TypeError("Failed to fetch"));
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); client.clear(); _resetPluginModuleLoader();
  if (previousLanguage) await act(async () => { await i18n.changeLanguage(previousLanguage); });
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

it.each([
  ["en", "Plugin extensions unavailable: Failed to fetch"],
  ["pt-BR", "Extensões de plugins indisponíveis: Failed to fetch"],
])("localizes slot errors and preserves the external detail in %s", async (locale, slotError) => {
  await act(async () => { await i18n.changeLanguage(locale); });
  await render();
  await vi.waitFor(() => expect(container.textContent).toContain("unavailable"));
  expect(container.textContent).toContain(slotError);
  expect(container.textContent).toContain("Plugin launchers unavailable: Failed to fetch");
});

it("hides errors and keeps the last loaded slots and launchers when errorBehavior is hidden", async () => {
  registerPluginReactComponent("fixture.sidebar", "SidebarItem", () => <span>Fixture sidebar item</span>);
  registerPluginReactComponent("fixture.sidebar", "SidebarPanel", () => <span>Fixture sidebar panel</span>);
  client.setQueryData(queryKeys.plugins.uiContributions, [contribution]);
  await render("hidden");
  expect(container.textContent).toContain("Fixture sidebar item");
  expect(container.textContent).toContain("Fixture sidebar panel");

  await act(async () => {
    await client.refetchQueries({ queryKey: queryKeys.plugins.uiContributions });
    // React Query notifies observers on a timer; let the error render land.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(client.getQueryState(queryKeys.plugins.uiContributions)?.status).toBe("error");
  expect(container.textContent).not.toContain("unavailable");
  expect(container.textContent).toContain("Fixture sidebar item");
  expect(container.textContent).toContain("Fixture sidebar panel");
  expect(container.textContent).toContain("Fixture launcher");
});

it("updates launcher host locale while its plugin component stays mounted", async () => {
  await act(async () => { await i18n.changeLanguage("pt-BR"); });
  let mountCount = 0;
  registerPluginReactComponent("fixture.sidebar", "LocaleLauncher", ({ context }) => {
    const [mountId] = useState(() => ++mountCount);
    return <output data-testid="launcher-locale" data-mount-id={mountId}>{context.locale}</output>;
  });
  client.setQueryData(queryKeys.plugins.uiContributions, [localeLauncherContribution]);
  await render("hidden");
  const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Locale launcher");
  expect(trigger).toBeDefined();

  await act(async () => {
    trigger!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(container.querySelector("[data-testid=launcher-locale]")?.textContent).toBe("pt-BR");
  expect(container.querySelector("[data-testid=launcher-locale]")?.getAttribute("data-mount-id")).toBe("1");

  await act(async () => { await i18n.changeLanguage("en"); });
  expect(container.querySelector("[data-testid=launcher-locale]")?.textContent).toBe("en");
  expect(container.querySelector("[data-testid=launcher-locale]")?.getAttribute("data-mount-id")).toBe("1");
});

it("localizes launcher chrome without changing the launcher declaration passed to plugin code", async () => {
  await act(async () => { await i18n.changeLanguage("pt-BR"); });
  const pluginKey = "paperclip-kitchen-sink-example";
  const packageName = "@paperclipai/plugin-kitchen-sink-example";
  const packagePath = "/app/packages/plugins/examples/plugin-kitchen-sink-example";
  const contribution: PluginUiContribution = {
    pluginId: "plugin-kitchen",
    pluginKey,
    displayName: "Kitchen Sink (Example)",
    version: "0.1.0",
    uiEntryFile: "index.js",
    slots: [],
    launchers: [{
      id: "kitchen-sink-launcher",
      displayName: "Kitchen Sink Modal",
      placementZone: "sidebar",
      action: { type: "openDrawer", target: "LauncherProbe" },
      render: { environment: "hostOverlay", bounds: "wide" },
    }],
  };
  type LauncherMetadata = { displayName: string; pluginDisplayName: string; hostPluginDisplayName?: string };
  let receivedLauncher: LauncherMetadata | undefined;
  function LauncherProbe({ launcher }: { launcher: LauncherMetadata }) {
    receivedLauncher = launcher;
    return <span data-testid="launcher-probe">{launcher.displayName}</span>;
  }
  registerPluginReactComponent(pluginKey, "LauncherProbe", LauncherProbe as never);
  client.setQueryData(queryKeys.plugins.uiContributions, [contribution]);
  client.setQueryData(queryKeys.plugins.all, [{
    id: "plugin-kitchen",
    pluginKey,
    packageName,
    packagePath,
    manifestJson: { id: pluginKey },
  }]);
  client.setQueryData(queryKeys.plugins.examples, [{ pluginKey, packageName, localPath: packagePath }]);
  client.setQueryData(queryKeys.auth.session, { user: { id: "alice" } });

  await render("hidden");
  let trigger = Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent === "Modal do Kitchen Sink");
  expect(trigger).toBeDefined();

  await act(async () => { await i18n.changeLanguage("en"); });
  trigger = Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent === "Kitchen Sink Modal");
  expect(trigger).toBeDefined();

  await act(async () => {
    trigger!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(receivedLauncher).toMatchObject({
    displayName: "Kitchen Sink Modal",
    pluginDisplayName: "Kitchen Sink (Example)",
  });
  expect(receivedLauncher).not.toHaveProperty("hostDisplayName");
  expect(receivedLauncher).not.toHaveProperty("hostPluginDisplayName");
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog?.querySelector("h2")?.textContent).toBe("Kitchen Sink Modal");
  expect(dialog?.querySelector("p")?.textContent).toBe("Kitchen Sink (Example)");
  expect(contribution.launchers[0]?.displayName).toBe("Kitchen Sink Modal");
});
