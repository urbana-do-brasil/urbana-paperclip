// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Agent } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  PrimaryAgentIndicator,
  PrimaryAgentPresentationProvider,
  SetPrimaryAgentButton,
  type PrimaryAgentPresentation,
} from "./PrimaryAgentPresentation";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

function agent(id: string, name: string): Agent {
  return { id, companyId: "company-1", name, status: "active" } as unknown as Agent;
}

async function render(children: React.ReactNode, value: PrimaryAgentPresentation) {
  await act(async () => {
    root.render(
      <TooltipProvider>
        <PrimaryAgentPresentationProvider value={value}>{children}</PrimaryAgentPresentationProvider>
      </TooltipProvider>,
    );
  });
}

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe("primary agent presentation localization", () => {
  it("localizes the primary-agent accessible indicator", async () => {
    const current = agent("agent-1", "Alpha Agent");
    await render(<PrimaryAgentIndicator agentId={current.id} companyId={current.companyId} />, {
      companyId: current.companyId,
      primaryAgentId: current.id,
      primaryAgent: current,
      onChange: vi.fn(),
    });
    expect(host.querySelector('[aria-label="Meu agente principal"]')).not.toBeNull();
  });

  it("localizes primary-agent selection and its confirmation dialog", async () => {
    const current = agent("agent-1", "Agente atual");
    const next = agent("agent-2", "Agente novo");
    const onChange = vi.fn();
    await render(<SetPrimaryAgentButton agent={next} />, {
      companyId: next.companyId,
      primaryAgentId: current.id,
      primaryAgent: current,
      onChange,
    });

    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Definir como meu agente principal"]');
    expect(trigger).not.toBeNull();
    await act(async () => trigger!.click());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain("Alterar seu agente principal?");
    expect(document.body.textContent).toContain("Agente novo passará a ser seu agente principal.");
    expect(document.body.textContent).toContain("Cancelar");
    const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find((button) => button.textContent?.includes("Definir como meu agente principal"));
    expect(confirm).not.toBeUndefined();
    await act(async () => confirm!.click());
    expect(onChange).toHaveBeenCalledWith(next.id);
  });
});
