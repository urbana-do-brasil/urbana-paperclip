// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/context/ThemeContext";
import { i18n } from "@/i18n";
import { TaskChatMarker } from "./TaskChatMarker";
import { TaskChatThreadView } from "./TaskChatThreadView";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

describe("TaskChatMarker", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

beforeEach(async () => {
  await i18n.changeLanguage("en");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:05:00.000Z"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

afterEach(async () => {
    flushSync(() => root?.unmount());
    root = null;
    container.remove();
    vi.useRealTimers();
  await i18n.changeLanguage("en");
  });

  it("renders a failed run as a timestamped disclosure without divider rules", () => {
    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatMarker
            item={{
              id: "run-1:failure",
              kind: "marker",
              variant: "interrupted",
              label: "Run failed",
              detail:
                "The runner stopped before returning an answer (runner_exited).",
              collapsible: true,
              createdAtIso: "2026-09-01T12:00:00.000Z",
              runHref: "/agents/codex/runs/run-1",
            }}
          />
        </ThemeProvider>,
      ),
    );

    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-testid="task-chat-collapsible-marker"] button[aria-expanded]',
    )!;
    expect(toggle.textContent).toContain("Run failed");
    expect(toggle.textContent).toContain("5m ago");
    expect(
      container
        .querySelector('[data-testid="task-chat-collapsible-marker"]')
        ?.classList.contains("items-start"),
    ).toBe(true);
    expect(container.querySelector(".border-dashed")).toBeNull();
    expect(container.textContent).not.toContain("runner_exited");

    flushSync(() => toggle.click());

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("runner_exited");
    expect(
      container.querySelector('a[href="/agents/codex/runs/run-1"]')
        ?.textContent,
    ).toBe("View run");
  });

  it("keeps expected cancellation neutral when collapsed and expanded", () => {
    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatMarker
            item={{
              id: "cancelled",
              kind: "marker",
              variant: "interrupted",
              tone: "neutral",
              label: "Run cancelled",
              detail: "Cancelled by you.",
              collapsible: true,
            }}
          />
        </ThemeProvider>,
      ),
    );
    const toggle = container.querySelector<HTMLButtonElement>(
      "button[aria-expanded]",
    )!;
    expect(toggle.classList).toContain("text-muted-foreground");
    expect(container.querySelector(".text-destructive")).toBeNull();
    flushSync(() => toggle.click());
    expect(container.textContent).toContain("Cancelled by you.");
    expect(container.querySelector(".text-destructive")).toBeNull();
  });

  it("keeps Try again available without retry instructions in the detail", async () => {
    const onTryAgain = vi.fn();
    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatMarker
            item={{
              id: "run-1:failure",
              kind: "marker",
              variant: "interrupted",
              label: "Run failed",
              detail: "The runner stopped before returning an answer.",
              collapsible: true,
            }}
            onTryAgain={onTryAgain}
          />
        </ThemeProvider>,
      ),
    );

    const retry = container.querySelector<HTMLButtonElement>(
      '[data-testid="task-chat-run-failed-try-again"]',
    )!;
    expect(container.textContent).not.toContain(
      "You can retry this message now",
    );
    flushSync(() => retry.click());
    await Promise.resolve();
    expect(onTryAgain).toHaveBeenCalledTimes(1);
  });

  it("routes Try again to the failed run retry callback", async () => {
    const onRetryFailedRun = vi.fn();
    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatThreadView
            scroll={false}
            items={[
              {
                id: "run-1:failure",
                kind: "marker",
                variant: "interrupted",
                label: "Run failed",
                detail: "The runner stopped before returning an answer.",
                collapsible: true,
                runId: "run-1",
              },
            ]}
            onRetryFailedRun={onRetryFailedRun}
          />
        </ThemeProvider>,
      ),
    );

    const retry = container.querySelector<HTMLButtonElement>(
      '[data-testid="task-chat-run-failed-try-again"]',
    )!;
    expect(retry).not.toBeNull();
    flushSync(() => retry.click());
    await Promise.resolve();
    expect(onRetryFailedRun).toHaveBeenCalledWith("run-1");
  });

  it("localizes retry, run links, and credential recovery controls in Brazilian Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatMarker
            item={{
              id: "run-1:failure",
              kind: "marker",
              variant: "interrupted",
              label: "Run failed",
              detail: "Falha preservada.",
              collapsible: true,
              runHref: "/agents/codex/runs/run-1",
              planHref: "#document-plan",
            }}
            tryAgainPending
            onTryAgain={() => {}}
          />
        </ThemeProvider>,
      ),
    );
    expect(container.querySelector('[data-testid="task-chat-run-failed-try-again"]')?.textContent)
      .toBe("Tentando novamente...");
    const disclosure = container.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')!;
    flushSync(() => disclosure.click());
    expect(container.querySelector('a[href="#document-plan"]')?.textContent).toBe("Ver plano salvo");
    expect(container.querySelector('a[href="/agents/codex/runs/run-1"]')?.textContent).toBe("Ver execução");

    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatMarker
            item={{
              id: "credential-denied",
              kind: "marker",
              variant: "interrupted",
              label: "Run failed",
              credentialAccess: {
                agentName: "Codex",
                deniedUser: "you",
                settingsHref: "/agents/codex/runtime",
              },
              runHref: "/agents/codex/runs/credential-denied",
            }}
          />
        </ThemeProvider>,
      ),
    );
    expect(container.textContent).toContain("Codex não pôde iniciar");
    expect(container.textContent).toContain("uma credencial de IA");
    expect(container.textContent).toContain("você não tem acesso");
    expect(container.querySelector('a[href="/agents/codex/runtime"]')?.textContent)
      .toBe("Alterar conexão de IA");
    expect(container.querySelector('a[href="/agents/codex/runs/credential-denied"]')?.textContent)
      .toBe("Ver execução");

    flushSync(() =>
      root!.render(
        <ThemeProvider>
          <TaskChatMarker
            item={{
              id: "credential-denied-defaults",
              kind: "marker",
              variant: "interrupted",
              label: "Run failed",
              credentialAccess: {
                agentName: "This agent",
                deniedUser: "the person this task runs for",
                settingsHref: "/agents/codex/runtime",
              },
            }}
          />
        </ThemeProvider>,
      ),
    );
    expect(container.textContent).toContain("Este agente não pôde iniciar");
    expect(container.textContent).toContain("a pessoa responsável por esta tarefa");
  });
});
