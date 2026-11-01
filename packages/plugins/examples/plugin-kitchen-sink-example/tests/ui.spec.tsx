import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KitchenSinkCommentAnnotation,
  KitchenSinkCommentContextMenuItem,
  KitchenSinkContextMenuItem,
  KitchenSinkDashboardWidget,
  KitchenSinkIssueTab,
  KitchenSinkLauncherModal,
  KitchenSinkPage,
  KitchenSinkProjectSidebarItem,
  KitchenSinkProjectTab,
  KitchenSinkSettingsPage,
  KitchenSinkSidebarLink,
  KitchenSinkSidebarPanel,
  KitchenSinkTaskDetailView,
  KitchenSinkToolbarButton,
} from "../src/ui/index.js";
import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";
import { companyStatusOptions, issueStatusOptions } from "../src/ui/messages.js";

type HostDataResult = {
  data?: unknown;
  loading?: boolean;
  error?: { message: string } | null;
  refresh?: () => void;
};

type PluginBridge = {
  react: { createElement: typeof React.createElement };
  sdkUi: Record<string, unknown>;
};

const hostData = new Map<string, HostDataResult>();
const dataRequests: string[] = [];
let hostContext: PluginHostContext = {
  locale: "en",
  companyId: "company-id",
  companyPrefix: "acme",
  projectId: "project-id",
  entityId: "issue-id",
  entityType: "issue",
  parentEntityId: "parent-issue-id",
  userId: null,
};

function installPluginBridge() {
  const bridge: PluginBridge = {
    react: { createElement: React.createElement },
    sdkUi: {
      usePluginData: (key: string, params?: Record<string, unknown>) => {
        dataRequests.push(JSON.stringify({ key, params }));
        return hostData.get(key) ?? { loading: false, error: null, refresh: () => undefined };
      },
      usePluginAction: () => async () => undefined,
      useHostContext: () => hostContext,
      useHostNavigation: () => ({
        resolveHref: (to: string) => to,
        linkProps: (to: string) => ({ href: to }),
      }),
      usePluginStream: () => ({ events: [], lastEvent: undefined, connected: false, close: () => undefined }),
      usePluginToast: () => () => undefined,
      AssigneePicker: () => React.createElement("select", { "aria-label": "host-assignee-picker" }),
      ProjectPicker: () => React.createElement("select", { "aria-label": "host-project-picker" }),
    },
  };
  (globalThis as typeof globalThis & { __paperclipPluginBridge__?: PluginBridge })
    .__paperclipPluginBridge__ = bridge;
}

function overviewData() {
  return {
    pluginId: "paperclip-kitchen-sink-example",
    version: "0.1.0",
    capabilities: ["issues.read"],
    config: { demoValue: "keep-this-value" },
    runtimeLaunchers: [],
    recentRecords: [],
    counts: { companies: 2, projects: 3, issues: 4, goals: 5, agents: 6, entities: 7 },
    lastJob: null,
    lastWebhook: null,
    lastProcessResult: null,
    streamChannels: {},
    safeCommands: [],
    manifest: { jobs: [], webhooks: [], tools: [] },
  };
}

function prepareHost(locale: PluginHostContext["locale"]) {
  hostContext = { ...hostContext, locale };
  hostData.clear();
  hostData.set("overview", { data: overviewData(), loading: false });
  hostData.set("companies", { data: [], loading: false });
  hostData.set("projects", { data: [], loading: false });
  hostData.set("issues", {
    data: [{ id: "issue-id", title: "Original issue title Ω", status: "in_review", projectId: "project-id" }],
    loading: false,
  });
  hostData.set("goals", { data: [], loading: false });
  hostData.set("agents", { data: [], loading: false });
  hostData.set("plugin-config", { data: {}, loading: false });
  hostData.set("state-value", { data: { scope: { scopeKind: "company", stateKey: "revenue_clicker" }, value: 42 } });
  hostData.set("entities", { data: [], loading: false });
  hostData.set("workspaces", { data: [], loading: false });
  hostData.set("comment-context", {
    data: {
      commentId: "comment-id",
      issueId: "parent-issue-id",
      preview: "Original comment content Ω",
      length: 29,
      copiedCount: 3,
    },
  });
}

function html(element: React.ReactElement) {
  return renderToStaticMarkup(element);
}

describe("Kitchen Sink plugin UI localization", () => {
  beforeEach(() => {
    prepareHost("en");
    dataRequests.length = 0;
    installPluginBridge();
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __paperclipPluginBridge__?: PluginBridge })
      .__paperclipPluginBridge__;
  });

  it.each([
    ["pt-BR", "Visão geral", "Resumo do runtime", "CRUD de tarefas", "Criar tarefa", "Título da tarefa", "2 empresas"],
    ["en", "Overview", "Runtime Summary", "Issue CRUD", "Create issue", "Issue title", "2 companies"],
  ] as const)("localizes the plugin page in the host locale while preserving demo data for %s", (
    locale,
    overviewLabel,
    runtimeLabel,
    issueCrudLabel,
    createIssueLabel,
    issueTitleLabel,
    companyCount,
  ) => {
    prepareHost(locale);
    const context = { ...hostContext, locale };
    const markup = html(React.createElement(KitchenSinkPage, { context }));

    expect(markup).toContain(overviewLabel);
    expect(markup).toContain(runtimeLabel);
    expect(markup).toContain(issueCrudLabel);
    expect(markup).toContain(createIssueLabel);
    expect(markup).toContain(`aria-label="${issueTitleLabel}"`);
    expect(markup).toContain(companyCount);
    expect(markup).toContain("Kitchen Sink demo issue");
    expect(markup).toContain("Original issue title Ω");
    expect(markup).toContain("in_review");
    expect(markup).toContain("company-id");
    expect(markup).toContain("keep-this-value");
    expect(markup).toContain("scopeKind");
    expect(markup).toContain("MY_SECRET_REF");
  });

  it("localizes standalone host slots and preserves IDs and dynamic comment content", () => {
    prepareHost("pt-BR");
    hostContext = {
      ...hostContext,
      locale: "pt-BR",
      renderEnvironment: { environment: "hostOverlay", launcherId: "launcher-id", bounds: "wide" },
    };
    const projectContext = {
      ...hostContext,
      entityId: "project-id",
      entityType: "project" as const,
    };
    const issueContext = {
      ...hostContext,
      entityId: "issue-id",
      entityType: "issue" as const,
    };
    const commentContext = {
      ...hostContext,
      entityId: "comment-id",
      entityType: "comment" as const,
      parentEntityId: "parent-issue-id",
    };
    const markup = html(React.createElement("div", null,
      React.createElement(KitchenSinkDashboardWidget, { context: hostContext }),
      React.createElement(KitchenSinkSidebarLink, { context: hostContext }),
      React.createElement(KitchenSinkSidebarPanel),
      React.createElement(KitchenSinkProjectSidebarItem, { context: projectContext }),
      React.createElement(KitchenSinkProjectTab, { context: projectContext }),
      React.createElement(KitchenSinkIssueTab, { context: issueContext }),
      React.createElement(KitchenSinkTaskDetailView),
      React.createElement(KitchenSinkToolbarButton),
      React.createElement(KitchenSinkContextMenuItem),
      React.createElement(KitchenSinkCommentAnnotation, { context: commentContext }),
      React.createElement(KitchenSinkCommentContextMenuItem, { context: commentContext }),
      React.createElement(KitchenSinkLauncherModal),
    ));

    expect(markup).toContain("aria-label=\"Widget do painel\"");
    expect(markup).toContain("Painel Kitchen Sink");
    expect(markup).toContain("Aba de detalhes do projeto");
    expect(markup).toContain("Aba de detalhes da tarefa");
    expect(markup).toContain("Visualização de detalhes da tarefa");
    expect(markup).toContain("Ação do Kitchen Sink");
    expect(markup).toContain("Copiar para Kitchen Sink");
    expect(markup).toContain("Original comment content Ω");
    expect(markup).toContain("parent-issue-id");
    expect(markup).toContain("project-id?tab=plugin:paperclip-kitchen-sink-example:kitchen-sink-project-tab");
    expect(markup).toContain("hostOverlay");
    expect(dataRequests).toContain(JSON.stringify({
      key: "comment-context",
      params: { companyId: "company-id", issueId: "parent-issue-id", commentId: "comment-id" },
    }));
  });

  it("localizes status labels while keeping enum values unchanged", () => {
    expect(issueStatusOptions("pt-BR")).toEqual([
      { value: "backlog", label: "Fila de espera" },
      { value: "todo", label: "A fazer" },
      { value: "in_progress", label: "Em andamento" },
      { value: "in_review", label: "Em revisão" },
      { value: "done", label: "Concluída" },
      { value: "blocked", label: "Bloqueada" },
      { value: "cancelled", label: "Cancelada" },
    ]);
    expect(companyStatusOptions("pt-BR")).toEqual([
      { value: "active", label: "Ativa" },
      { value: "paused", label: "Pausada" },
      { value: "archived", label: "Arquivada" },
    ]);
    expect(issueStatusOptions("en").map(({ value, label }) => [value, label])).toEqual([
      ["backlog", "backlog"],
      ["todo", "todo"],
      ["in_progress", "in_progress"],
      ["in_review", "in_review"],
      ["done", "done"],
      ["blocked", "blocked"],
      ["cancelled", "cancelled"],
    ]);
  });

  it("uses the English fallback for an older host context without a locale", () => {
    const markup = html(React.createElement(KitchenSinkSettingsPage, {
      context: { ...hostContext, locale: undefined, companyId: null },
    }));

    expect(markup).toContain("Loading plugin config…");
  });
});
