import type { PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";

/**
 * Example dashboard widget showing the smallest possible UI contribution.
 */
export function HelloWorldDashboardWidget({ context }: PluginWidgetProps) {
  const messages = context.locale === "pt-BR"
    ? {
        label: "Widget de exemplo Olá, mundo",
        title: "Olá, mundo",
        description: "Este widget foi adicionado por",
        companyContext: "Contexto da empresa",
      }
    : {
        label: "Hello world plugin widget",
        title: "Hello world",
        description: "This widget was added by",
        companyContext: "Company context",
      };

  return (
    <section aria-label={messages.label}>
      <strong>{messages.title}</strong>
      <div>{messages.description} @paperclipai/plugin-hello-world-example.</div>
      {/* Include host context so authors can see where scoped IDs come from. */}
      <div>{messages.companyContext}: {context.companyId}</div>
    </section>
  );
}
