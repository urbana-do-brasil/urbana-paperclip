// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { StatusCards } from "./index";

const company = vi.hoisted(() => ({ selectedCompanyId: "company-1" as string | null }));
const mockApi = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), updates: vi.fn(), refresh: vi.fn(), recompile: vi.fn(), patch: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/api/statusCards", () => ({ statusCardsApi: mockApi }));
vi.mock("@/context/CompanyContext", () => ({ useCompany: () => company }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate, useParams: () => ({}) }));
vi.mock("./StatusCardTile", () => ({ StatusCardTile: ({ card, onRefresh }: { card: { title: string }; onRefresh: () => void }) => <button data-testid="refresh" onClick={onRefresh}>{card.title}</button> }));
vi.mock("./CreateStatusCardDialog", () => ({ CreateStatusCardDialog: () => null }));
vi.mock("./StatusCardDetailDrawer", () => ({ StatusCardDetailDrawer: () => null }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const activeCard = { id: "active-1", title: "USER ACTIVE", todayTokens: 0, todayCostCents: 0 };
const archivedCard = { id: "archived-1", title: "USER ARCHIVED", archivedAt: "2026-10-20T12:00:00Z", lastGeneratedAt: "2026-10-18T12:00:00Z" };

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

describe("StatusCards list", () => {
  let container: HTMLDivElement;
  let previousLanguage = "pt-BR";
  beforeAll(() => { previousLanguage = i18n.language; });
  afterAll(async () => { await i18n.changeLanguage(previousLanguage); });
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    company.selectedCompanyId = "company-1";
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.clearAllMocks();
    mockApi.list.mockReset().mockResolvedValue([]);
    mockApi.updates.mockReset().mockResolvedValue([]);
    mockApi.refresh.mockReset().mockResolvedValue({});
    mockApi.patch.mockReset().mockResolvedValue({});
  });
  afterEach(() => { container.remove(); });

  async function renderPage() {
    const root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    flushSync(() => root.render(<QueryClientProvider client={client}><StatusCards /></QueryClientProvider>));
    await flush();
    return root;
  }

  it("requires an organization and does not query without one", async () => {
    company.selectedCompanyId = null;
    const root = await renderPage();
    expect(container.textContent).toContain("Selecione uma organização para ver os cartões de status.");
    expect(mockApi.list).not.toHaveBeenCalled();
    flushSync(() => root.unmount());
  });

  it("localizes loading and empty states", async () => {
    mockApi.list.mockImplementation(() => new Promise(() => {}));
    const loadingRoot = await renderPage();
    expect(container.textContent).toContain("Carregando cartões…");
    flushSync(() => loadingRoot.unmount());
    mockApi.list.mockResolvedValue([]);
    const root = await renderPage();
    expect(container.textContent).toContain("Ainda não há cartões de status");
    expect(container.textContent).toContain("Novo cartão");
    await i18n.changeLanguage("en");
    await flush();
    expect(container.textContent).toContain("No status cards yet");
    expect(container.textContent).toContain("New card");
    flushSync(() => root.unmount());
  });

  it("localizes archived cards and preserves navigation and restore payloads", async () => {
    mockApi.list.mockImplementation((_companyId: string, archived: boolean) => Promise.resolve(archived ? [archivedCard] : [activeCard]));
    const root = await renderPage();
    expect(container.textContent).toContain("Mostrar arquivados (1)");
    const show = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Mostrar arquivados"));
    flushSync(() => show!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(container.textContent).toContain("USER ARCHIVED");
    expect(container.textContent).toContain(`arquivado em ${new Date(archivedCard.archivedAt).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}`);
    const view = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Ver");
    flushSync(() => view!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(navigate).toHaveBeenCalledWith("/status/archived-1");
    const restore = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Restaurar");
    flushSync(() => restore!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(mockApi.patch).toHaveBeenCalledWith("archived-1", { archived: false });
    await i18n.changeLanguage("en");
    await flush();
    expect(container.textContent).toContain("Hide archived");
    expect(container.textContent).toContain(`archived ${new Date(archivedCard.archivedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}`);
    flushSync(() => root.unmount());
  });

  it("localizes errors and keeps provider details and action behavior", async () => {
    mockApi.list.mockImplementation((_companyId: string, archived: boolean) => archived ? Promise.reject(new Error("USER ARCHIVE ERROR")) : Promise.resolve([activeCard]));
    mockApi.refresh.mockRejectedValue(null);
    const root = await renderPage();
    expect(container.textContent).toContain("Não foi possível carregar os cartões arquivados");
    expect(container.textContent).toContain("USER ARCHIVE ERROR");
    const refresh = container.querySelector<HTMLButtonElement>('[data-testid="refresh"]');
    flushSync(() => refresh!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(mockApi.refresh).toHaveBeenCalledWith("active-1");
    expect(container.textContent).toContain("Não foi possível atualizar o cartão.");
    await i18n.changeLanguage("en");
    await flush();
    expect(container.textContent).toContain("Could not refresh the card.");
    flushSync(() => root.unmount());
  });
});
