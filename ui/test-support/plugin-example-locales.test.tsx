import { afterEach, describe, expect, it, vi } from "vitest";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";
import { DashboardWidget as AuthoringDashboardWidget } from "../../packages/plugins/examples/plugin-authoring-smoke-example/src/ui/index";
import { HelloWorldDashboardWidget } from "../../packages/plugins/examples/plugin-hello-world-example/src/ui/index";
import {
  DashboardWidget as OrchestrationDashboardWidget,
  IssuePanel as OrchestrationIssuePanel,
  SettingsPage as OrchestrationSettingsPage,
} from "../../packages/plugins/examples/plugin-orchestration-smoke-example/src/ui/index";

type PluginDataResult = {
  data: unknown;
  loading: boolean;
  error: { message: string } | null;
  refresh: () => void;
};

type DataCall = { key: string; params?: Record<string, unknown> };

const hostContext: PluginHostContext = {
  locale: "en",
  companyId: "co_demo_123",
  companyPrefix: "demo-company",
  projectId: "prj_demo_456",
  entityId: "iss_demo_789",
  entityType: "issue",
  userId: "usr_demo_012",
};

const surfaceData = {
  status: "degraded" as const,
  checkedAt: "2032-04-05T06:07:08.000Z",
  databaseNamespace: "plugin_orchestration_smoke",
  routeKeys: ["initialize", "summary"],
  capabilities: ["issues.read", "issues.create"],
  summary: {
    rootIssueId: "iss_root_demo_1",
    childIssueId: "iss_child_demo_2",
    blockerIssueId: null,
    billingCode: "plugin-smoke:iss_root_demo_1",
    subtreeIssueIds: ["iss_root_demo_1", "iss_child_demo_2"],
    wakeupQueued: true,
  },
};

function installPluginBridge(dataResult: PluginDataResult) {
  const dataCalls: DataCall[] = [];
  const actionKeys: string[] = [];
  const actionCalls: Array<{ key: string; input: unknown }> = [];

  Reflect.set(globalThis, "__paperclipPluginBridge__", {
    sdkUi: {
      usePluginData: (key: string, params?: Record<string, unknown>) => {
        dataCalls.push({ key, params });
        return dataResult;
      },
      usePluginAction: (key: string) => {
        actionKeys.push(key);
        return async (input?: unknown) => {
          actionCalls.push({ key, input });
        };
      },
    },
  });

  return { dataCalls, actionKeys, actionCalls };
}

function render(component: unknown, props: unknown) {
  return renderToStaticMarkup(createElement(component as never, props as never));
}

function findButton(node: ReactNode): { onClick?: () => Promise<void>; children?: ReactNode } | null {
  if (!isValidElement(node)) return null;
  if (node.type === "button") {
    return node.props as { onClick?: () => Promise<void>; children?: ReactNode };
  }

  const props = node.props as { children?: ReactNode };
  for (const child of Children.toArray(props.children)) {
    const button = findButton(child);
    if (button) return button;
  }

  return null;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "__paperclipPluginBridge__");
});

describe("first-party example plugin locales", () => {
  it("localizes the authoring example from host locale and preserves worker values", () => {
    const bridge = installPluginBridge({
      data: { status: "degraded", checkedAt: "2031-02-03T04:05:06.000Z" },
      loading: false,
      error: null,
      refresh: () => undefined,
    });

    const english = render(AuthoringDashboardWidget, { context: { ...hostContext, locale: "en" } });
    const portuguese = render(AuthoringDashboardWidget, { context: { ...hostContext, locale: "pt-BR" } });

    expect(english).toContain("Plugin Authoring Smoke Example");
    expect(english).toContain("Health: degraded");
    expect(english).toContain("Checked: 2031-02-03T04:05:06.000Z");
    expect(english).toContain(">Ping Worker</button>");
    expect(portuguese).toContain("Exemplo de autoria de plugin");
    expect(portuguese).toContain("Saúde: degraded");
    expect(portuguese).toContain("Verificado em: 2031-02-03T04:05:06.000Z");
    expect(portuguese).toContain(">Testar worker</button>");
    expect(bridge.dataCalls).toEqual([
      { key: "health", params: undefined },
      { key: "health", params: undefined },
    ]);
    expect(bridge.actionKeys).toEqual(["ping", "ping"]);
  });

  it("localizes authoring loading and error copy while preserving escaped bridge detail", () => {
    const loadingBridge = installPluginBridge({
      data: null,
      loading: true,
      error: null,
      refresh: () => undefined,
    });
    expect(render(AuthoringDashboardWidget, { context: { ...hostContext, locale: "pt-BR" } }))
      .toContain("Carregando a saúde do plugin...");

    const errorBridge = installPluginBridge({
      data: null,
      loading: false,
      error: { message: "Worker returned <code>E_OFFLINE</code>" },
      refresh: () => undefined,
    });
    const errorMarkup = render(AuthoringDashboardWidget, { context: { ...hostContext, locale: "pt-BR" } });
    expect(errorMarkup).toContain("Erro do plugin:");
    expect(errorMarkup).toContain("Worker returned &lt;code&gt;E_OFFLINE&lt;/code&gt;");
    expect(loadingBridge.actionKeys).toEqual(["ping"]);
    expect(errorBridge.actionKeys).toEqual(["ping"]);
  });

  it("localizes Hello World labels and accessibility name without rewriting demo identifiers", () => {
    const english = render(HelloWorldDashboardWidget, {
      context: { ...hostContext, locale: "en" },
    });
    const portuguese = render(HelloWorldDashboardWidget, {
      context: { ...hostContext, locale: "pt-BR" },
    });

    expect(english).toContain('aria-label="Hello world plugin widget"');
    expect(english).toContain("Hello world");
    expect(english).toContain("This widget was added by @paperclipai/plugin-hello-world-example.");
    expect(english).toContain("Company context: co_demo_123");
    expect(portuguese).toContain('aria-label="Widget de exemplo Olá, mundo"');
    expect(portuguese).toContain("<strong>Olá, mundo</strong>");
    expect(portuguese).toContain("Este widget foi adicionado por @paperclipai/plugin-hello-world-example.");
    expect(portuguese).toContain("Contexto da empresa: co_demo_123");
  });

  it("localizes orchestration surfaces and retains route, status, timestamp, and ID values", () => {
    const bridge = installPluginBridge({
      data: surfaceData,
      loading: false,
      error: null,
      refresh: () => undefined,
    });

    const english = render(OrchestrationDashboardWidget, {
      context: { ...hostContext, locale: "en" },
    });
    const portuguese = render(OrchestrationDashboardWidget, {
      context: { ...hostContext, locale: "pt-BR" },
    });

    expect(english).toContain("Orchestration Smoke");
    expect(english).toContain("Status</span><strong>degraded</strong>");
    expect(english).toContain("Routes</span><code>initialize, summary</code>");
    expect(english).toContain("Checked 2032-04-05T06:07:08.000Z");
    expect(portuguese).toContain("Teste de orquestração");
    expect(portuguese).toContain("Status</span><strong>degraded</strong>");
    expect(portuguese).toContain("Rotas</span><code>initialize, summary</code>");
    expect(portuguese).toContain("Verificado em 2032-04-05T06:07:08.000Z");
    expect(portuguese).toContain("plugin_orchestration_smoke");
    expect(bridge.dataCalls).toEqual([
      { key: "surface-status", params: { companyId: "co_demo_123" } },
      { key: "surface-status", params: { companyId: "co_demo_123" } },
    ]);
  });

  it("localizes issue and settings UI while preserving scope, payload, and technical results", () => {
    const bridge = installPluginBridge({
      data: surfaceData,
      loading: false,
      error: null,
      refresh: () => undefined,
    });

    const issuePanel = render(OrchestrationIssuePanel, {
      context: { ...hostContext, locale: "pt-BR", entityId: "iss_demo_789", entityType: "issue" },
    });
    const settings = render(OrchestrationSettingsPage, {
      context: { ...hostContext, locale: "pt-BR" },
    });

    expect(issuePanel).toContain(">Executar teste</button>");
    expect(issuePanel).toContain("Subtarefa</span><code>iss_child_demo_2</code>");
    expect(issuePanel).toContain("Bloqueio</span><code>nenhum</code>");
    expect(issuePanel).toContain("Código de cobrança</span><code>plugin-smoke:iss_root_demo_1</code>");
    expect(issuePanel).toContain("Árvore de tarefas</span><strong>2</strong>");
    expect(issuePanel).toContain("Despertar</span><strong>enfileirado</strong>");
    expect(settings).toContain("Superfície do teste de orquestração");
    expect(bridge.dataCalls).toEqual([
      { key: "surface-status", params: { companyId: "co_demo_123", issueId: "iss_demo_789" } },
      { key: "surface-status", params: { companyId: "co_demo_123" } },
    ]);
    expect(bridge.actionKeys).toEqual(["initialize-smoke"]);
  });

  it("keeps the orchestration action key and scoped IDs unchanged", async () => {
    const refresh = vi.fn();
    const bridge = installPluginBridge({
      data: surfaceData,
      loading: false,
      error: null,
      refresh,
    });
    const context = {
      ...hostContext,
      locale: "pt-BR" as const,
      entityId: "iss_demo_789",
      entityType: "issue",
    };

    const button = findButton(OrchestrationIssuePanel({ context }));
    expect(button).not.toBeNull();
    await button?.onClick?.();

    expect(bridge.actionCalls).toEqual([{
      key: "initialize-smoke",
      input: { companyId: "co_demo_123", issueId: "iss_demo_789" },
    }]);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("uses the host's PT-BR locale for orchestration loading, errors, and empty state", () => {
    installPluginBridge({ data: null, loading: true, error: null, refresh: () => undefined });
    expect(render(OrchestrationDashboardWidget, { context: { ...hostContext, locale: "pt-BR" } }))
      .toContain("Carregando o status do teste de orquestração...");

    installPluginBridge({
      data: null,
      loading: false,
      error: { message: "Unknown route key" },
      refresh: () => undefined,
    });
    expect(render(OrchestrationSettingsPage, { context: { ...hostContext, locale: "pt-BR" } }))
      .toContain("Erro nas configurações do teste de orquestração: Unknown route key");

    installPluginBridge({
      data: { ...surfaceData, summary: null },
      loading: false,
      error: null,
      refresh: () => undefined,
    });
    expect(render(OrchestrationIssuePanel, {
      context: { ...hostContext, locale: "pt-BR", entityId: "iss_demo_789", entityType: "issue" },
    })).toContain("Nenhuma execução de teste registrada para esta tarefa.");
  });
});
