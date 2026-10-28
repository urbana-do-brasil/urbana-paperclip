// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { BoardClaimPage } from "./BoardClaim";

const session = vi.hoisted(() => vi.fn());
const status = vi.hoisted(() => vi.fn());
const claim = vi.hoisted(() => vi.fn());
vi.mock("../api/auth", () => ({ authApi: { getSession: () => session() } }));
vi.mock("../api/access", () => ({ accessApi: { getBoardClaimStatus: (token: string, code: string) => status(token, code), claimBoard: (token: string, code: string) => claim(token, code) } }));
vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompany: null }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
async function act(fn: () => void | Promise<void>) { let result: void | Promise<void>; flushSync(() => { result = fn(); }); await result!; }
async function flush() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); flushSync(() => {}); }

describe("BoardClaimPage", () => {
  let container: HTMLDivElement;
  beforeEach(async () => { await i18n.changeLanguage("en"); container = document.createElement("div"); document.body.appendChild(container); session.mockResolvedValue(null); status.mockResolvedValue({ status: "pending" }); claim.mockReset(); });
  afterEach(() => { container.remove(); vi.clearAllMocks(); });
  async function mount() {
    const root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    await act(() => root.render(<MemoryRouter initialEntries={["/board-claim/tok%2Ben?code=c%2Bde%2F1"]}><QueryClientProvider client={client}><Routes><Route path="/board-claim/:token" element={<BoardClaimPage />} /></Routes></QueryClientProvider></MemoryRouter>));
    await flush(); await flush();
    return root;
  }
  it.each([["pt-BR", "É necessário entrar"], ["en", "Sign in required"]])("preserves return URL for signed-out users in %s", async (locale, title) => {
    await i18n.changeLanguage(locale);
    const root = await mount();
    expect(container.querySelector("h1")?.textContent).toBe(title);
    expect(status).toHaveBeenCalledWith("tok+en", "c+de/1");
    const href = container.querySelector("a")!.getAttribute("href")!;
    expect(new URL(href, "https://example.test").searchParams.get("next")).toBe("/board-claim/tok%2Ben?code=c%2Bde%2F1");
    await act(() => root.unmount());
  });
  it.each([["pt-BR", "Reivindicar propriedade", "Não foi possível concluir a solicitação.", "Detalhes"], ["en", "Claim ownership", "The request could not be completed.", "Details"]])("shows provider errors and preserves claim parameters in %s", async (locale, button, failure, details) => {
    await i18n.changeLanguage(locale);
    session.mockResolvedValue({ user: { id: "user-1" } });
    claim.mockRejectedValue(new Error("Provider <raw>"));
    const root = await mount();
    expect(container.querySelector("button")?.textContent).toBe(button);
    await act(() => container.querySelector("button")!.click()); await flush(); await flush();
    expect(claim).toHaveBeenCalledWith("tok+en", "c+de/1");
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain(`${failure} ${details}: Provider <raw>`);
    expect(alert.querySelector("raw")).toBeNull();
    await act(() => root.unmount());
  });
  it.each([["pt-BR", "Propriedade do painel reivindicada"], ["en", "Board ownership claimed"]])("shows completed claim in %s", async (locale, title) => {
    await i18n.changeLanguage(locale);
    status.mockResolvedValue({ status: "claimed" });
    const root = await mount();
    expect(container.querySelector("h1")?.textContent).toBe(title);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/");
    await act(() => root.unmount());
  });
});
