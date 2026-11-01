import {
  usePluginAction,
  usePluginData,
  type PluginHostContext,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";

type HealthData = {
  status: "ok" | "degraded" | "error";
  checkedAt: string;
};

function messagesFor(locale: PluginHostContext["locale"]) {
  if (locale === "pt-BR") {
    return {
      loading: "Carregando a saúde do plugin...",
      errorPrefix: "Erro do plugin:",
      title: "Exemplo de autoria de plugin",
      health: "Saúde",
      checked: "Verificado em",
      pingWorker: "Testar worker",
      unknown: "desconhecido",
      never: "nunca",
    };
  }

  return {
    loading: "Loading plugin health...",
    errorPrefix: "Plugin error:",
    title: "Plugin Authoring Smoke Example",
    health: "Health",
    checked: "Checked",
    pingWorker: "Ping Worker",
    unknown: "unknown",
    never: "never",
  };
}

export function DashboardWidget({ context }: PluginWidgetProps) {
  const messages = messagesFor(context.locale);
  const { data, loading, error } = usePluginData<HealthData>("health");
  const ping = usePluginAction("ping");

  if (loading) return <div>{messages.loading}</div>;
  if (error) return <div>{messages.errorPrefix} {error.message}</div>;

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <strong>{messages.title}</strong>
      <div>{messages.health}: {data?.status ?? messages.unknown}</div>
      <div>{messages.checked}: {data?.checkedAt ?? messages.never}</div>
      <button onClick={() => void ping()}>{messages.pingWorker}</button>
    </div>
  );
}
