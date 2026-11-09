// @vitest-environment jsdom
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MouseEvent as ReactMouseEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { i18n } from "@/i18n";
import { useHostContext as useSdkHostContext } from "../../../packages/plugins/sdk/src/ui/hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileTree as SdkFileTree,
  ManagedRoutinesList as SdkManagedRoutinesList,
  MarkdownBlock as SdkMarkdownBlock,
  MarkdownEditor as SdkMarkdownEditor,
  DataTable as SdkDataTable,
  ErrorBoundary as SdkErrorBoundary,
  Spinner as SdkSpinner,
  AssigneePicker as SdkAssigneePicker,
  ProjectPicker as SdkProjectPicker,
  type FileTreeNode as SdkFileTreeNode,
} from "../../../packages/plugins/sdk/src/ui/components";
import type { ManagedRoutinesListProps as SdkManagedRoutinesListProps } from "../../../packages/plugins/sdk/src/ui/index";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import {
  PluginBridgeContext,
  resolveHostNavigationHref,
  shouldHandleHostNavigationClick,
  useHostNavigation,
  type PluginBridgeContextValue,
} from "./bridge";
import { initPluginBridge } from "./bridge-init";
import { _createReactShimSourceForTests } from "./slots";
import { queryKeys } from "@/lib/queryKeys";

function clickEvent(
  overrides: Partial<ReactMouseEvent<HTMLAnchorElement>> = {},
): ReactMouseEvent<HTMLAnchorElement> {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    currentTarget: {
      hasAttribute: () => false,
    },
    ...overrides,
  } as ReactMouseEvent<HTMLAnchorElement>;
}

afterEach(async () => {
  delete globalThis.__paperclipPluginBridge__;
  await i18n.changeLanguage("en");
});

function act(callback: () => void) {
  flushSync(callback);
}

describe("plugin host navigation", () => {
  it("resolves plugin page routes into the active company prefix", () => {
    expect(resolveHostNavigationHref("/wiki", "PAP")).toBe("/PAP/wiki");
    expect(resolveHostNavigationHref("/wiki?tab=browse#page", "pap")).toBe(
      "/PAP/wiki?tab=browse#page",
    );
  });

  it("does not double-prefix active company paths or global host paths", () => {
    expect(resolveHostNavigationHref("/PAP/wiki", "PAP")).toBe("/PAP/wiki");
    expect(resolveHostNavigationHref("/pap/wiki", "PAP")).toBe("/pap/wiki");
  });

  it("rewrites legacy instance settings paths into the active company settings scope", () => {
    expect(resolveHostNavigationHref("/instance/settings/plugins", "PAP")).toBe(
      "/PAP/company/settings/instance/plugins",
    );
    expect(resolveHostNavigationHref("/settings/experimental?x=1#auto", "pap")).toBe(
      "/PAP/company/settings/instance/experimental?x=1#auto",
    );
  });

  it("intercepts only same-origin plain left-click navigation", () => {
    expect(shouldHandleHostNavigationClick(clickEvent(), "/PAP/wiki")).toBe(true);
    expect(
      shouldHandleHostNavigationClick(clickEvent({ ctrlKey: true }), "/PAP/wiki"),
    ).toBe(false);
    expect(
      shouldHandleHostNavigationClick(clickEvent(), "/PAP/wiki", "_blank"),
    ).toBe(false);
    expect(
      shouldHandleHostNavigationClick(clickEvent(), "https://example.com/wiki"),
    ).toBe(false);
  });
});

describe("plugin SDK host context bridge", () => {
  it("updates the locale exposed by useHostContext when the bridge scope changes", () => {
    initPluginBridge(React, ReactDOM);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Probe() {
      return React.createElement("output", { "data-testid": "plugin-locale" }, useSdkHostContext().locale);
    }
    function bridgeValue(locale: "pt-BR" | "en"): PluginBridgeContextValue {
      return {
        pluginId: "test-plugin",
        hostContext: {
          companyId: "co",
          companyPrefix: "PAP",
          projectId: null,
          entityId: null,
          entityType: null,
          userId: null,
          locale,
        },
      };
    }
    function render(locale: "pt-BR" | "en") {
      act(() => root.render(
        React.createElement(
          PluginBridgeContext.Provider,
          { value: bridgeValue(locale) },
          React.createElement(Probe),
        ),
      ));
    }

    render("pt-BR");
    expect(container.querySelector("output")?.textContent).toBe("pt-BR");
    render("en");
    expect(container.querySelector("output")?.textContent).toBe("en");

    act(() => root.unmount());
    container.remove();
  });
});

describe("useHostNavigation mobile drawer behavior", () => {
  // React 19's `act` requires the env flag and React DOM client.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  function makeBridgeValue(): PluginBridgeContextValue {
    return {
      pluginId: "test-plugin",
      hostContext: {
        companyId: "co",
        companyPrefix: "PAP",
        projectId: null,
        entityId: null,
        entityType: null,
        userId: null,
      },
    };
  }

  function setViewport(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    if (typeof window.matchMedia !== "function") {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: (query: string) => ({
          matches: /max-width:\s*767px/.test(query) ? width < 768 : false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }),
      });
    }
  }

  it("closes the sidebar drawer on mobile after a same-origin navigate()", () => {
    setViewport(390);

    let nav: ReturnType<typeof useHostNavigation> | null = null;
    let sidebar: ReturnType<typeof useSidebar> | null = null;
    function Probe() {
      nav = useHostNavigation();
      sidebar = useSidebar();
      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/PAP/wiki"] },
          React.createElement(
            SidebarProvider,
            null,
            React.createElement(
              PluginBridgeContext.Provider,
              { value: makeBridgeValue() },
              React.createElement(Probe),
            ),
          ),
        ),
      );
    });

    expect(sidebar!.isMobile).toBe(true);
    act(() => sidebar!.setSidebarOpen(true));
    expect(sidebar!.sidebarOpen).toBe(true);

    act(() => nav!.navigate("/wiki?section=ingest"));
    expect(sidebar!.sidebarOpen).toBe(false);

    act(() => root.unmount());
    container.remove();
  });

  it("leaves the sidebar open on desktop after navigate()", () => {
    setViewport(1280);

    let nav: ReturnType<typeof useHostNavigation> | null = null;
    let sidebar: ReturnType<typeof useSidebar> | null = null;
    function Probe() {
      nav = useHostNavigation();
      sidebar = useSidebar();
      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/PAP/wiki"] },
          React.createElement(
            SidebarProvider,
            null,
            React.createElement(
              PluginBridgeContext.Provider,
              { value: makeBridgeValue() },
              React.createElement(Probe),
            ),
          ),
        ),
      );
    });

    expect(sidebar!.isMobile).toBe(false);
    expect(sidebar!.sidebarOpen).toBe(true);

    act(() => nav!.navigate("/wiki?section=ingest"));
    expect(sidebar!.sidebarOpen).toBe(true);

    act(() => root.unmount());
    container.remove();
  });
});

describe("plugin SDK FileTree bridge", () => {
  const nodes: SdkFileTreeNode[] = [
    {
      name: "wiki",
      path: "wiki",
      kind: "dir",
      children: [
        {
          name: "index.md",
          path: "wiki/index.md",
          kind: "file",
          children: [],
        },
      ],
    },
  ];

  it("injects the host FileTree implementation through the bridge runtime", () => {
    initPluginBridge(React, ReactDOM);

    const html = renderToStaticMarkup(
      React.createElement(SdkFileTree, {
        nodes,
        expandedPaths: ["wiki"],
        selectedFile: "wiki/index.md",
        onToggleDir: () => undefined,
        onSelectFile: () => undefined,
      }),
    );

    expect(html).toContain('role="tree"');
    expect(html).toContain("wiki");
    expect(html).toContain("index.md");
  });

  it("throws a clear error when the host FileTree implementation is missing", () => {
    globalThis.__paperclipPluginBridge__ = {
      react: React,
      reactJsxRuntime: ReactJsxRuntime,
      reactDom: ReactDOM,
      sdkUi: {},
    };

    expect(() =>
      renderToStaticMarkup(
        React.createElement(SdkFileTree, {
          nodes,
          expandedPaths: ["wiki"],
          onToggleDir: () => undefined,
          onSelectFile: () => undefined,
        }),
      ),
    ).toThrow('Paperclip plugin UI runtime is not initialized for "FileTree"');
  });
});

describe("plugin SDK markdown component bridge", () => {
  it("injects markdown display and editor components through the bridge runtime", () => {
    initPluginBridge(React, ReactDOM);

    const registry = globalThis.__paperclipPluginBridge__?.sdkUi ?? {};
    expect(registry.MarkdownBlock).toBeTypeOf("function");
    expect(registry.MarkdownEditor).toBeTypeOf("function");
    expect(registry.IssuesList).toBeTypeOf("function");
    expect(registry.AssigneePicker).toBeTypeOf("function");
    expect(registry.ProjectPicker).toBeTypeOf("function");
    expect(registry.ManagedRoutinesList).toBeTypeOf("function");
  });

  it("renders plugin-provided markdown components when registered by the host", () => {
    globalThis.__paperclipPluginBridge__ = {
      react: React,
      reactJsxRuntime: ReactJsxRuntime,
      reactDom: ReactDOM,
      sdkUi: {
        MarkdownBlock: ({ content, enableWikiLinks, wikiLinkRoot }: { content: string; enableWikiLinks?: boolean; wikiLinkRoot?: string }) =>
          React.createElement("article", {
            "data-wiki-links": enableWikiLinks ? "true" : "false",
            "data-wiki-root": wikiLinkRoot,
          }, content),
        MarkdownEditor: ({ value }: { value: string }) =>
          React.createElement("textarea", { value, readOnly: true }),
        ManagedRoutinesList: ({ routines }: { routines: Array<{ title: string }> }) =>
          React.createElement("section", null, routines.map((routine) => routine.title).join(", ")),
      },
    };

    const markdownHtml = renderToStaticMarkup(React.createElement(SdkMarkdownBlock, {
      content: "# Wiki",
      enableWikiLinks: true,
      wikiLinkRoot: "/wiki/page",
    }));
    expect(markdownHtml).toContain("# Wiki");
    expect(markdownHtml).toContain('data-wiki-links="true"');
    expect(markdownHtml).toContain('data-wiki-root="/wiki/page"');
    expect(renderToStaticMarkup(React.createElement(SdkMarkdownEditor, { value: "# Wiki", onChange: () => undefined }))).toContain("# Wiki");
    expect(renderToStaticMarkup(React.createElement(SdkManagedRoutinesList, {
      routines: [{ key: "lint", title: "Run lint", status: "active" }],
    }))).toContain("Run lint");
  });

  it("forwards the optional managed-routine localization contract through the SDK bridge", () => {
    const labels = {
      configure: "Configurar",
      managedBy: "Gerenciado por {name}",
      schedule: "Agendamento",
      missingRefs: "Ausente",
      defaultsCanBeRepaired: "É possível reparar os padrões.",
      reconcile: "Reconciliar",
      reset: "Redefinir",
    };
    const props = {
      routines: [{
        key: "nightly-wiki-lint",
        title: "Run LLM Wiki lint",
        status: "active",
        resourceKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
      }],
      labels,
    } satisfies Pick<SdkManagedRoutinesListProps, "routines" | "labels">;

    globalThis.__paperclipPluginBridge__ = {
      react: React,
      reactJsxRuntime: ReactJsxRuntime,
      reactDom: ReactDOM,
      sdkUi: {
        ManagedRoutinesList: (received: Pick<SdkManagedRoutinesListProps, "routines" | "labels">) =>
          React.createElement("section", { "data-schedule-label": received.labels?.schedule }, [
            ...received.routines.flatMap((routine) => [routine.title, routine.resourceKey ?? ""]),
            received.labels?.configure,
            received.labels?.managedBy,
            received.labels?.defaultsCanBeRepaired,
          ].join("|")),
      },
    };

    const markup = renderToStaticMarkup(React.createElement(SdkManagedRoutinesList, props));
    expect(markup).toContain("Run LLM Wiki lint");
    expect(markup).toContain("Configurar");
    expect(markup).toContain("Gerenciado por {name}");
    expect(markup).toContain("É possível reparar os padrões.");
    expect(markup).toContain('data-schedule-label="Agendamento"');
    expect(markup).toContain("plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint");
  });
});

describe("plugin SDK host-owned fallback labels", () => {
  it("localizes table and spinner defaults while preserving plugin-provided text and data", async () => {
    initPluginBridge(React, ReactDOM);
    const tableProps = {
      columns: [
        { key: "id", header: "Provider ID" },
        { key: "name", header: "Provider column" },
      ],
      rows: [{ id: "provider-row-id", name: "Provider value" }],
    };

    await i18n.changeLanguage("en");
    expect(renderToStaticMarkup(React.createElement(SdkDataTable, { columns: [], rows: [] }))).toContain("No rows.");
    expect(renderToStaticMarkup(React.createElement(SdkDataTable, { ...tableProps, loading: true }))).toContain("Loading...");
    expect(renderToStaticMarkup(React.createElement(SdkSpinner))).toContain('aria-label="Loading"');

    await i18n.changeLanguage("pt-BR");
    expect(renderToStaticMarkup(React.createElement(SdkDataTable, { columns: [], rows: [] }))).toContain("Nenhuma linha.");
    expect(renderToStaticMarkup(React.createElement(SdkDataTable, { ...tableProps, loading: true }))).toContain("Carregando...");
    expect(renderToStaticMarkup(React.createElement(SdkSpinner))).toContain('aria-label="Carregando"');

    const customEmpty = renderToStaticMarkup(React.createElement(SdkDataTable, {
      columns: [],
      rows: [],
      emptyMessage: "Plugin-provided empty state",
    }));
    const customSpinner = renderToStaticMarkup(React.createElement(SdkSpinner, { label: "Plugin-provided loading label" }));
    const providerData = renderToStaticMarkup(React.createElement(SdkDataTable, tableProps));
    expect(customEmpty).toContain("Plugin-provided empty state");
    expect(customSpinner).toContain('aria-label="Plugin-provided loading label"');
    expect(providerData).toContain("Provider column");
    expect(providerData).toContain("Provider ID");
    expect(providerData).toContain("Provider value");
    expect(providerData).toContain("provider-row-id");
  });

  it("localizes the host error-boundary fallback and preserves a plugin fallback", async () => {
    initPluginBridge(React, ReactDOM);
    await i18n.changeLanguage("en");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    function BrokenPluginUi(): React.ReactNode {
      throw new Error("provider-owned diagnostic");
    }
    const broken = React.createElement(BrokenPluginUi);

    try {
      act(() => root.render(React.createElement(SdkErrorBoundary, { children: broken })));
      expect(container.textContent).toBe("Plugin UI failed to render.");

      await i18n.changeLanguage("pt-BR");
      act(() => root.render(React.createElement(SdkErrorBoundary, { children: broken })));
      expect(container.textContent).toBe("Falha ao renderizar a interface do plugin.");

      act(() => root.render(React.createElement(SdkErrorBoundary, { children: broken, fallback: "Plugin-provided fallback" })));
      expect(container.textContent).toBe("Plugin-provided fallback");
    } finally {
      act(() => root.unmount());
      consoleError.mockRestore();
      container.remove();
    }
  });

  it("localizes picker defaults on language changes while preserving plugin labels", async () => {
    initPluginBridge(React, ReactDOM);
    const hostContext = {
      companyId: null,
      companyPrefix: null,
      projectId: null,
      entityId: null,
      entityType: null,
      userId: "user-1",
      locale: "en",
    } satisfies PluginBridgeContextValue["hostContext"];
    const pickerCases = [
      {
        name: "assignee",
        className: "sdk-assignee-picker",
        english: { placeholder: "Responsible", none: "No responsible", search: "Search responsible...", empty: "No responsible found." },
        portuguese: { placeholder: "Responsável", none: "Sem responsável", search: "Buscar responsáveis...", empty: "Nenhum responsável encontrado." },
        external: { placeholder: "External assignee label", none: "External no-assignee label", search: "External assignee search", empty: "External assignee empty state" },
        create: (custom: boolean) => React.createElement(SdkAssigneePicker, {
          className: "sdk-assignee-picker",
          value: "",
          includeUsers: false,
          ...(custom ? {
            placeholder: "External assignee label",
            noneLabel: "External no-assignee label",
            searchPlaceholder: "External assignee search",
            emptyMessage: "External assignee empty state",
          } : {}),
          onChange: () => undefined,
        }),
      },
      {
        name: "project",
        className: "sdk-project-picker",
        english: { placeholder: "Project", none: "No project", search: "Search projects...", empty: "No projects found." },
        portuguese: { placeholder: "Projeto", none: "Sem projeto", search: "Buscar projetos...", empty: "Nenhum projeto encontrado." },
        external: { placeholder: "External project label", none: "External no-project label", search: "External project search", empty: "External project empty state" },
        create: (custom: boolean) => React.createElement(SdkProjectPicker, {
          className: "sdk-project-picker",
          value: "",
          ...(custom ? {
            placeholder: "External project label",
            noneLabel: "External no-project label",
            searchPlaceholder: "External project search",
            emptyMessage: "External project empty state",
          } : {}),
          onChange: () => undefined,
        }),
      },
    ];

    for (const pickerCase of pickerCases) {
      await React.act(async () => {
        await i18n.changeLanguage("en");
      });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(queryKeys.auth.session, {
        user: { id: "user-1" },
        session: { userId: "user-1" },
      });
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      const renderPicker = (custom: boolean) => React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(PluginBridgeContext.Provider, {
          value: { pluginId: "picker-test", hostContext },
        }, pickerCase.create(custom)),
      );

      try {
        await React.act(() => root.render(renderPicker(false)));
        const trigger = container.querySelector<HTMLButtonElement>(`.${pickerCase.className}`)!;
        expect(trigger.textContent).toBe(pickerCase.english.placeholder);
        await React.act(async () => {
          trigger.focus();
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const input = document.querySelector<HTMLInputElement>(`input[placeholder="${pickerCase.english.search}"]`)!;
        expect(input).not.toBeNull();
        expect(document.body.textContent).toContain(pickerCase.english.none);

        const setSearch = async (value: string) => React.act(() => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await setSearch("no matching value");
        expect(document.body.textContent).toContain(pickerCase.english.empty);

        await React.act(async () => {
          await i18n.changeLanguage("pt-BR");
        });
        expect(trigger.textContent).toBe(pickerCase.portuguese.placeholder);
        expect(input.placeholder).toBe(pickerCase.portuguese.search);
        expect(document.body.textContent).toContain(pickerCase.portuguese.empty);
        await setSearch("");
        expect(document.body.textContent).toContain(pickerCase.portuguese.none);
        await setSearch("no matching value");
        expect(document.body.textContent).toContain(pickerCase.portuguese.empty);

        await React.act(() => root.render(renderPicker(true)));
        expect(trigger.textContent).toBe(pickerCase.external.placeholder);
        expect(input.placeholder).toBe(pickerCase.external.search);
        expect(document.body.textContent).toContain(pickerCase.external.empty);
        await setSearch("");
        expect(document.body.textContent).toContain(pickerCase.external.none);
        await React.act(async () => {
          await i18n.changeLanguage("en");
        });
        expect(trigger.textContent).toBe(pickerCase.external.placeholder);
        expect(input.placeholder).toBe(pickerCase.external.search);
      } finally {
        await React.act(() => root.unmount());
        queryClient.clear();
        container.remove();
      }
    }
  });
});

describe("plugin React shim", () => {
  it("re-exports every named export from the host React module", () => {
    const source = _createReactShimSourceForTests(React);

    for (const name of Object.keys(React).sort()) {
      if (name === "default") continue;
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
      expect(source).toContain(`export const ${name} = R.${name};`);
    }

    expect(source).toContain("export default R;");
    expect(source).toContain("export const useInsertionEffect = R.useInsertionEffect;");
    expect(source).toContain("export const useId = R.useId;");
    expect(source).toContain("export const useSyncExternalStore = R.useSyncExternalStore;");
    expect(source).toContain("export const startTransition = R.startTransition;");
  });
});

describe("plugin jsx runtime bridge", () => {
  it("exposes the host jsx runtime on the bridge registry", () => {
    initPluginBridge(React, ReactDOM);

    const runtime = globalThis.__paperclipPluginBridge__?.reactJsxRuntime as typeof ReactJsxRuntime;
    expect(runtime.jsx).toBeTypeOf("function");
    expect(runtime.jsxs).toBeTypeOf("function");
    expect(runtime.Fragment).toBe(ReactJsxRuntime.Fragment);
  });

  it("renders unkeyed static children through the bridged runtime without key warnings", () => {
    initPluginBridge(React, ReactDOM);
    const runtime = globalThis.__paperclipPluginBridge__?.reactJsxRuntime as typeof ReactJsxRuntime;

    // Mirror what a compiled plugin bundle emits for static multi-child JSX:
    // jsxs() with an unkeyed children array. The previous shim rebuilt this
    // via createElement(type, { children }), which made dev React demand a
    // key on every static child (LOOA-1547 Panel/ProjectKnowledgeTab noise).
    const warnings: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    });
    try {
      renderToStaticMarkup(
        runtime.jsxs("section", {
          children: [
            runtime.jsx("header", { children: "static child one" }),
            runtime.jsx("div", { children: "static child two" }),
          ],
        }) as React.ReactElement,
      );
    } finally {
      spy.mockRestore();
    }

    expect(warnings.filter((message) => message.includes("key"))).toEqual([]);
  });
});
