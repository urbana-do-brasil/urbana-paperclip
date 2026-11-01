import {
  usePluginAction,
  usePluginData,
  type PluginDetailTabProps,
  type PluginSettingsPageProps,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";
import type React from "react";

type SurfaceStatus = {
  status: "ok" | "degraded" | "error";
  checkedAt: string;
  databaseNamespace: string;
  routeKeys: string[];
  capabilities: string[];
  summary: null | {
    rootIssueId: string;
    childIssueId: string | null;
    blockerIssueId: string | null;
    billingCode: string;
    subtreeIssueIds: string[];
    wakeupQueued: boolean;
  };
};

const panelStyle = {
  display: "grid",
  gap: 10,
  fontSize: 13,
  lineHeight: 1.45,
} satisfies React.CSSProperties;

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
} satisfies React.CSSProperties;

const buttonStyle = {
  border: "1px solid #1f2937",
  background: "#111827",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 10px",
  font: "inherit",
  cursor: "pointer",
} satisfies React.CSSProperties;

function messagesFor(locale: PluginWidgetProps["context"]["locale"]) {
  if (locale === "pt-BR") {
    return {
      status: "Status",
      namespace: "Namespace",
      routes: "Rotas",
      capabilities: "Capacidades",
      checked: "Verificado em",
      dashboardLoading: "Carregando o status do teste de orquestração...",
      dashboardError: "Erro no teste de orquestração:",
      loading: "Carregando o teste de orquestração...",
      error: "Erro no teste de orquestração:",
      settingsLoading: "Carregando as configurações do teste de orquestração...",
      settingsError: "Erro nas configurações do teste de orquestração:",
      title: "Teste de orquestração",
      runSmoke: "Executar teste",
      child: "Subtarefa",
      blocker: "Bloqueio",
      billing: "Código de cobrança",
      subtree: "Árvore de tarefas",
      wakeup: "Despertar",
      none: "nenhum",
      queued: "enfileirado",
      notQueued: "não enfileirado",
      noRun: "Nenhuma execução de teste registrada para esta tarefa.",
      settingsTitle: "Superfície do teste de orquestração",
    };
  }

  return {
    status: "Status",
    namespace: "Namespace",
    routes: "Routes",
    capabilities: "Capabilities",
    checked: "Checked",
    dashboardLoading: "Loading orchestration smoke status...",
    dashboardError: "Orchestration smoke error:",
    loading: "Loading orchestration smoke...",
    error: "Orchestration smoke error:",
    settingsLoading: "Loading orchestration smoke settings...",
    settingsError: "Orchestration smoke settings error:",
    title: "Orchestration Smoke",
    runSmoke: "Run Smoke",
    child: "Child",
    blocker: "Blocker",
    billing: "Billing",
    subtree: "Subtree",
    wakeup: "Wakeup",
    none: "none",
    queued: "queued",
    notQueued: "not queued",
    noRun: "No smoke run recorded for this issue.",
    settingsTitle: "Orchestration Smoke Surface",
  };
}

function SurfaceRows({ data, locale }: { data: SurfaceStatus; locale: PluginWidgetProps["context"]["locale"] }) {
  const messages = messagesFor(locale);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={rowStyle}><span>{messages.status}</span><strong>{data.status}</strong></div>
      <div style={rowStyle}><span>{messages.namespace}</span><code>{data.databaseNamespace}</code></div>
      <div style={rowStyle}><span>{messages.routes}</span><code>{data.routeKeys.join(", ")}</code></div>
      <div style={rowStyle}><span>{messages.capabilities}</span><strong>{data.capabilities.length}</strong></div>
    </div>
  );
}

export function DashboardWidget({ context }: PluginWidgetProps) {
  const messages = messagesFor(context.locale);
  const { data, loading, error } = usePluginData<SurfaceStatus>("surface-status", {
    companyId: context.companyId,
  });

  if (loading) return <div>{messages.dashboardLoading}</div>;
  if (error) return <div>{messages.dashboardError} {error.message}</div>;
  if (!data) return null;

  return (
    <div style={panelStyle}>
      <strong>{messages.title}</strong>
      <SurfaceRows data={data} locale={context.locale} />
      <div>{messages.checked} {data.checkedAt}</div>
    </div>
  );
}

export function IssuePanel({ context }: PluginDetailTabProps) {
  const messages = messagesFor(context.locale);
  const { data, loading, error, refresh } = usePluginData<SurfaceStatus>("surface-status", {
    companyId: context.companyId,
    issueId: context.entityId,
  });
  const initialize = usePluginAction("initialize-smoke");

  if (loading) return <div>{messages.loading}</div>;
  if (error) return <div>{messages.error} {error.message}</div>;
  if (!data) return null;

  return (
    <div style={panelStyle}>
      <div style={rowStyle}>
        <strong>{messages.title}</strong>
        <button
          style={buttonStyle}
          onClick={async () => {
            await initialize({ companyId: context.companyId, issueId: context.entityId });
            refresh();
          }}
        >
          {messages.runSmoke}
        </button>
      </div>
      <SurfaceRows data={data} locale={context.locale} />
      {data.summary ? (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={rowStyle}><span>{messages.child}</span><code>{data.summary.childIssueId ?? messages.none}</code></div>
          <div style={rowStyle}><span>{messages.blocker}</span><code>{data.summary.blockerIssueId ?? messages.none}</code></div>
          <div style={rowStyle}><span>{messages.billing}</span><code>{data.summary.billingCode}</code></div>
          <div style={rowStyle}><span>{messages.subtree}</span><strong>{data.summary.subtreeIssueIds.length}</strong></div>
          <div style={rowStyle}><span>{messages.wakeup}</span><strong>{data.summary.wakeupQueued ? messages.queued : messages.notQueued}</strong></div>
        </div>
      ) : (
        <div>{messages.noRun}</div>
      )}
    </div>
  );
}

export function SettingsPage({ context }: PluginSettingsPageProps) {
  const messages = messagesFor(context.locale);
  const { data, loading, error } = usePluginData<SurfaceStatus>("surface-status", {
    companyId: context.companyId,
  });

  if (loading) return <div>{messages.settingsLoading}</div>;
  if (error) return <div>{messages.settingsError} {error.message}</div>;
  if (!data) return null;

  return (
    <div style={panelStyle}>
      <strong>{messages.settingsTitle}</strong>
      <SurfaceRows data={data} locale={context.locale} />
    </div>
  );
}
