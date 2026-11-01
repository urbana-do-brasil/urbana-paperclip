// @vitest-environment jsdom

import { createElement } from "react";
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHostContext as useSdkHostContext } from "../../../packages/plugins/sdk/src/ui/hooks";
import { i18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { initPluginBridge } from "./bridge-init";
import {
  PluginSlotMount,
  _collectRegisterableExportNamesForTests,
  _resetPluginModuleLoader,
  registerPluginReactComponent,
  registerPluginWebComponent,
  type PluginSlotContext,
  type ResolvedPluginSlot,
} from "./slots";

let roots: Root[] = [];
let previousLanguage: string | undefined;
let queryClient: QueryClient | undefined;

beforeEach(() => {
  previousLanguage = i18n.resolvedLanguage ?? i18n.language;
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  for (const root of roots) {
    flushSync(() => {
      root.unmount();
    });
  }
  roots = [];
  queryClient?.clear();
  queryClient = undefined;
  _resetPluginModuleLoader();
  delete globalThis.__paperclipPluginBridge__;
  if (previousLanguage) {
    await React.act(async () => { await i18n.changeLanguage(previousLanguage); });
  }
});

describe("plugin slot export registration", () => {
  it("keeps declared missing exports visible for diagnostics", () => {
    const exports = _collectRegisterableExportNamesForTests(
      { Page: () => null },
      new Set(["Page", "MissingRouteSidebar"]),
    );

    expect([...exports]).toEqual(["Page", "MissingRouteSidebar"]);
  });

  it("registers component-like module exports even when the current contribution did not declare them", () => {
    const exports = _collectRegisterableExportNamesForTests(
      {
        Page: () => null,
        RouteSidebar: () => null,
        webComponentTag: "paperclip-widget",
        metadata: { ignored: true },
        count: 1,
        default: () => null,
      },
      new Set(["Page"]),
    );

    expect(exports).toEqual(new Set(["Page", "RouteSidebar", "webComponentTag"]));
  });

  it("updates an already-mounted placeholder when the slot export registers later", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const slot: ResolvedPluginSlot = {
      type: "routeSidebar",
      id: "content-machine-sidebar",
      displayName: "Content",
      exportName: "ContentMachineRouteSidebar",
      routePath: "content-machine",
      pluginId: "content-machine-plugin",
      pluginKey: "content-machine",
      pluginDisplayName: "Content Machine",
      pluginVersion: "1.0.0",
    };

    flushSync(() => {
      root.render(createElement(PluginSlotMount, {
        slot,
        context: { companyId: "company-1", companyPrefix: "PAP" },
        missingBehavior: "placeholder",
      }));
    });

    expect(container.textContent).toContain("Content Machine: Content");

    flushSync(() => {
      registerPluginWebComponent("content-machine", "ContentMachineRouteSidebar", "paperclip-test-sidebar");
    });

    expect(container.textContent).not.toContain("Content Machine: Content");
    expect(container.querySelector("paperclip-test-sidebar")).not.toBeNull();
  });

  it("keeps host-only labels out of the slot declaration passed to React plugins", async () => {
    let receivedSlot: ResolvedPluginSlot | undefined;
    function SlotProbe({ slot }: { slot: ResolvedPluginSlot }) {
      receivedSlot = slot;
      return null;
    }
    const slot: ResolvedPluginSlot = {
      type: "detailTab",
      id: "workspace-changes-tab",
      displayName: "Changes",
      exportName: "ChangesTab",
      pluginId: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      pluginDisplayName: "Workspace Changes",
      pluginVersion: "0.1.0",
      hostDisplayName: "Alterações",
      hostPluginDisplayName: "Alterações no workspace",
    };
    registerPluginReactComponent("paperclip.workspace-diff", "ChangesTab", SlotProbe);
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    queryClient.setQueryData(queryKeys.auth.session, { user: { id: "alice" } });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await React.act(async () => root.render(createElement(
      QueryClientProvider,
      { client: queryClient! },
      createElement(PluginSlotMount, { slot, context: { companyId: "company-1" } }),
    )));

    expect(receivedSlot?.displayName).toBe("Changes");
    expect(receivedSlot?.pluginDisplayName).toBe("Workspace Changes");
    expect(receivedSlot).not.toHaveProperty("hostDisplayName");
    expect(receivedSlot).not.toHaveProperty("hostPluginDisplayName");
  });

  it("keeps host-only labels out of custom-element slot metadata", async () => {
    const slot: ResolvedPluginSlot = {
      type: "detailTab",
      id: "workspace-changes-tab",
      displayName: "Changes",
      exportName: "ChangesTab",
      pluginId: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      pluginDisplayName: "Workspace Changes",
      pluginVersion: "0.1.0",
      hostDisplayName: "Alterações",
      hostPluginDisplayName: "Alterações no workspace",
    };
    registerPluginWebComponent("paperclip.workspace-diff", "ChangesTab", "paperclip-test-workspace-changes");
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    queryClient.setQueryData(queryKeys.auth.session, { user: { id: "alice" } });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await React.act(async () => root.render(createElement(
      QueryClientProvider,
      { client: queryClient! },
      createElement(PluginSlotMount, { slot, context: { companyId: "company-1" } }),
    )));

    const element = container.querySelector("paperclip-test-workspace-changes") as (HTMLElement & { pluginSlot?: ResolvedPluginSlot }) | null;
    expect(element?.pluginSlot?.displayName).toBe("Changes");
    expect(element?.pluginSlot).not.toHaveProperty("hostDisplayName");
    expect(element?.pluginSlot).not.toHaveProperty("hostPluginDisplayName");
  });

  it("passes the active locale through slot props and SDK context, updating without remounting", async () => {
    await React.act(async () => { await i18n.changeLanguage("pt-BR"); });
    initPluginBridge(React, await import("react-dom"));
    let mountCount = 0;

    function LocaleProbe({ context }: { context: PluginSlotContext }) {
      const hostContext = useSdkHostContext();
      const [mountId] = React.useState(() => ++mountCount);
      return createElement(
        "output",
        {
          "data-testid": "plugin-locale",
          "data-slot-locale": context.locale,
          "data-host-locale": hostContext.locale,
          "data-mount-id": String(mountId),
        },
        hostContext.locale,
      );
    }

    const slot: ResolvedPluginSlot = {
      type: "page",
      id: "locale-page",
      displayName: "Locale page",
      exportName: "LocalePage",
      routePath: "locale-page",
      pluginId: "locale-plugin",
      pluginKey: "locale-plugin",
      pluginDisplayName: "Locale Plugin",
      pluginVersion: "1.0.0",
    };
    registerPluginReactComponent("locale-plugin", "LocalePage", LocaleProbe);
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    queryClient.setQueryData(queryKeys.auth.session, { user: { id: "alice" } });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    flushSync(() => root.render(createElement(
      QueryClientProvider,
      { client: queryClient! },
      createElement(PluginSlotMount, {
        slot,
        context: { companyId: "company-1", companyPrefix: "PAP" },
      }),
    )));

    const output = () => container.querySelector<HTMLOutputElement>("output");
    expect(output()?.dataset.slotLocale).toBe("pt-BR");
    expect(output()?.dataset.hostLocale).toBe("pt-BR");
    expect(output()?.dataset.mountId).toBe("1");

    await React.act(async () => { await i18n.changeLanguage("en"); });
    expect(output()?.dataset.slotLocale).toBe("en");
    expect(output()?.dataset.hostLocale).toBe("en");
    expect(output()?.dataset.mountId).toBe("1");

    await React.act(async () => { await i18n.changeLanguage("pt-BR"); });
    expect(output()?.dataset.slotLocale).toBe("pt-BR");
    expect(output()?.dataset.hostLocale).toBe("pt-BR");
    expect(output()?.dataset.mountId).toBe("1");
  });

  it.each([
    ["pt-BR", "Falha ao renderizar External Plugin."],
    ["en", "External Plugin failed to render"],
  ])("localizes a plugin render fallback in %s and updates it after a language change", async (locale, message) => {
    await React.act(async () => { await i18n.changeLanguage(locale); });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const slot: ResolvedPluginSlot = {
      type: "page",
      id: "broken-page",
      displayName: "External page title",
      exportName: "BrokenPage",
      routePath: "broken-page",
      pluginId: "external-plugin-id",
      pluginKey: "external.plugin",
      pluginDisplayName: "External Plugin",
      pluginVersion: "1.0.0",
    };
    registerPluginReactComponent("external.plugin", "BrokenPage", () => {
      throw new Error("UPSTREAM PLUGIN FAILURE");
    });
    queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    queryClient.setQueryData(queryKeys.auth.session, { user: { id: "alice" } });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await React.act(async () => root.render(createElement(
      QueryClientProvider,
      { client: queryClient! },
      createElement(PluginSlotMount, { slot, context: { companyId: "company-1" } }),
    )));

    expect(container.textContent).toContain(message);
    expect(container.textContent).not.toContain("UPSTREAM PLUGIN FAILURE");

    const nextLocale = locale === "en" ? "pt-BR" : "en";
    const nextMessage = nextLocale === "en"
      ? "External Plugin failed to render"
      : "Falha ao renderizar External Plugin.";
    await React.act(async () => { await i18n.changeLanguage(nextLocale); });
    expect(container.textContent).toContain(nextMessage);

    consoleError.mockRestore();
  });
});
