// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultStatusCardRefreshPolicy } from "@paperclipai/shared";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { CreateStatusCardDialog } from "./CreateStatusCardDialog";

const mockCards = vi.hoisted(() => ({ create: vi.fn() }));
const mockAgents = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/api/statusCards", () => ({ statusCardsApi: mockCards }));
vi.mock("@/api/agents", () => ({ agentsApi: mockAgents }));
vi.mock("@/components/AgentAvatar", () => ({ AgentAvatar: () => null }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

describe("CreateStatusCardDialog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousLanguage = "pt-BR";
  const onOpenChange = vi.fn();
  beforeAll(() => { previousLanguage = i18n.language; });
  afterAll(async () => { await i18n.changeLanguage(previousLanguage); });
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    onOpenChange.mockReset();
    mockCards.create.mockReset().mockResolvedValue({ id: "new-card" });
    mockAgents.list.mockReset().mockResolvedValue([{ id: "agent-1", name: "USER AGENT", role: "developer", status: "idle" }]);
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
  });

  async function renderDialog() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    flushSync(() => root.render(<QueryClientProvider client={client}><CreateStatusCardDialog companyId="company-1" open onOpenChange={onOpenChange} /></QueryClientProvider>));
    await flush();
  }

  it("localizes examples and preserves the draft and agent ID when switching languages", async () => {
    await renderDialog();
    expect(document.body.textContent).toContain("O que você deseja acompanhar?");
    const example = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent === "tarefas sobre avaliações");
    flushSync(() => example!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const prompt = document.body.querySelector<HTMLTextAreaElement>("#status-card-prompt")!;
    expect(prompt.value).toBe("tarefas sobre avaliações");
    await i18n.changeLanguage("en");
    await flush();
    expect(prompt.value).toBe("tarefas sobre avaliações");
    expect(document.body.textContent).toContain("What do you want to keep an eye on?");
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(prompt, " USER PROMPT ");
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const agentSelect = document.body.querySelector<HTMLButtonElement>('button[aria-label="Select the card agent"]');
    expect(agentSelect).toBeTruthy();
    flushSync(() => agentSelect!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    const agent = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "USER AGENT");
    expect(agent).toBeTruthy();
    flushSync(() => agent!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const create = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Create card");
    flushSync(() => create!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(mockCards.create).toHaveBeenCalledWith("company-1", { interestPrompt: "USER PROMPT", titlePinned: false, agentId: "agent-1", refreshPolicy: defaultStatusCardRefreshPolicy });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the draft and translates a creation failure", async () => {
    mockCards.create.mockRejectedValue(null);
    await renderDialog();
    const prompt = document.body.querySelector<HTMLTextAreaElement>("#status-card-prompt")!;
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(prompt, "USER DRAFT");
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const create = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Criar cartão");
    flushSync(() => create!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(document.body.textContent).toContain("Não foi possível criar o cartão.");
    expect(prompt.value).toBe("USER DRAFT");
    await i18n.changeLanguage("en");
    await flush();
    expect(document.body.textContent).toContain("Could not create the card.");
    expect(prompt.value).toBe("USER DRAFT");
  });

  it("reports agent loading failures and retries without changing the default", async () => {
    mockAgents.list.mockRejectedValueOnce(new Error("provider detail")).mockResolvedValueOnce([]);
    await renderDialog();
    expect(document.body.textContent).toContain("Não foi possível carregar os agentes.");
    expect(document.body.textContent).not.toContain("provider detail");
    const retry = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Tentar novamente");
    flushSync(() => retry!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(mockAgents.list).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("Summarizer (padrão)");
  });
});
