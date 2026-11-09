// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Approval } from "@paperclipai/shared";
import { ApprovalCard } from "./ApprovalCard";
import { ThemeProvider } from "../context/ThemeContext";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("ApprovalCard localization", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    act(() => root.unmount());
    container.remove();
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("localizes the type, status and pending action while preserving the request subject", async () => {
    await i18n.changeLanguage("pt-BR");
    const approval = {
      id: "approval-1",
      companyId: "company-1",
      type: "hire_agent",
      status: "pending",
      payload: { name: "Agente de finanças" },
      requestedByAgentId: null,
      requestedByUserId: null,
      decidedByUserId: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Approval;

    act(() => {
      root.render(
        <ThemeProvider>
          <ApprovalCard
            approval={approval}
            requesterAgent={null}
            onApprove={() => {}}
            onReject={() => {}}
            isPending
            pendingAction="approve"
          />
        </ThemeProvider>,
      );
    });

    expect(container.textContent).toContain("Contratação de agente");
    expect(container.textContent).toContain("Agente de finanças");
    expect(container.textContent).toContain("Pendente");
    expect(container.textContent).toContain("Aprovando…");
    expect(container.textContent).toContain("Rejeitar");
  });
});
