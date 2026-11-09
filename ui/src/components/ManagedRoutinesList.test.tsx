// @vitest-environment jsdom
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { appearanceForPalette, agentAvatarUrl, resolveAgentAppearance } from "@paperclipai/shared";
import { ManagedRoutinesList } from "./ManagedRoutinesList";

vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));
const routines = [{ key: "routine", title: "Daily summary", status: "active", assigneeAgentId: "agent-one" }];
function avatarSrc(markup: string) {
  const document = new DOMParser().parseFromString(markup, "text/html");
  return document.querySelector('[data-slot="agent-avatar"] img')?.getAttribute("src");
}
describe("routine agent identities", () => {
  it("keeps a saved palette for agents without legacy icons", () => {
    const appearance = appearanceForPalette("bubblegum-sky");
    const markup = renderToStaticMarkup(<ManagedRoutinesList routines={routines} agents={[{ id: "agent-one", name: "One", appearance, icon: null }]} />);
    expect(avatarSrc(markup)).toBe(agentAvatarUrl(appearance, 16));
  });
  it("uses the assignee ID for a stable fallback before the agent summary loads", () => {
    const markup = renderToStaticMarkup(<ManagedRoutinesList routines={routines} />);
    expect(avatarSrc(markup)).toBe(agentAvatarUrl(resolveAgentAppearance(null, "agent-one"), 16));
  });

  it("keeps default English labels for existing callers that omit localized copy", () => {
    const markup = renderToStaticMarkup(<ManagedRoutinesList
      routines={[{
        key: "routine",
        title: "Daily summary",
        status: "active",
        resourceKey: "nightly-wiki-lint",
        cronExpression: "0 3 * * *",
      }]}
      pluginDisplayName="LLM Wiki"
      onReconcile={() => undefined}
      onReset={() => undefined}
    />);

    expect(markup).toContain("Managed by LLM Wiki");
    expect(markup).toContain("Schedule 0 3 * * *");
    expect(markup).toContain("Routine defaults can be repaired.");
    expect(markup).toContain("Reconcile");
    expect(markup).toContain("Reset");
  });

  it("renders caller-provided localized labels without changing routine identity", () => {
    const markup = renderToStaticMarkup(<ManagedRoutinesList
      routines={[{
        key: "routine",
        title: "Run LLM Wiki lint",
        status: "active",
        resourceKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
        cronExpression: "0 3 * * *",
      }]}
      pluginDisplayName="LLM Wiki"
      labels={{
        configure: "Configurar",
        managedBy: "Gerenciado por {name}",
        schedule: "Agendamento",
        missingRefs: "Ausente",
        defaultsCanBeRepaired: "É possível reparar os padrões das rotinas.",
        reconciling: "Reconciliando...",
        reconcile: "Reconciliar",
        resetting: "Redefinindo...",
        reset: "Redefinir",
      }}
      onReconcile={() => undefined}
      onReset={() => undefined}
    />);

    expect(markup).toContain("Run LLM Wiki lint");
    expect(markup).toContain("plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint");
    expect(markup).toContain("Gerenciado por LLM Wiki");
    expect(markup).toContain("Agendamento 0 3 * * *");
    expect(markup).toContain("É possível reparar os padrões das rotinas.");
    expect(markup).toContain("Reconciliar");
    expect(markup).toContain("Redefinir");
    expect(markup).not.toContain("Managed by LLM Wiki");
    expect(markup).not.toContain("Schedule 0 3 * * *");
  });
});
