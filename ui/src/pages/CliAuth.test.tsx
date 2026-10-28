// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { CliAuthPage } from "./CliAuth";

const session = vi.hoisted(() => vi.fn());
const challenge = vi.hoisted(() => vi.fn());
const approve = vi.hoisted(() => vi.fn());
const cancel = vi.hoisted(() => vi.fn());
vi.mock("../api/auth", () => ({ authApi: { getSession: () => session() } }));
vi.mock("../api/access", () => ({ accessApi: {
  getCliAuthChallenge: (id: string, token: string) => challenge(id, token),
  approveCliAuthChallenge: (id: string, token: string) => approve(id, token),
  cancelCliAuthChallenge: (id: string, token: string) => cancel(id, token),
} }));
vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompany: null }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
async function act(fn: () => void | Promise<void>) {
  let result: void | Promise<void>;
  flushSync(() => { result = fn(); });
  await result!;
}
async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  flushSync(() => {});
}

describe("CliAuthPage", () => {
  let container: HTMLDivElement;
  const initialChallenge = {
    status: "pending", requiresSignIn: false, canApprove: true,
    command: "paperclip auth --name '<original>'", clientName: "Client <A>",
    requestedAccess: "instance_admin_required", requestedCompanyName: "Acme <Corp>",
  };
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div"); document.body.appendChild(container);
    session.mockResolvedValue(null); challenge.mockResolvedValue(initialChallenge);
    approve.mockReset(); cancel.mockReset();
  });
  afterEach(() => { container.remove(); vi.clearAllMocks(); });
  async function mount() {
    const root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    await act(() => root.render(
      <MemoryRouter initialEntries={["/cli-auth/id%2B1?token=tok%2Ben%2F1"]}>
        <QueryClientProvider client={client}><Routes><Route path="/cli-auth/:id" element={<CliAuthPage />} /></Routes></QueryClientProvider>
      </MemoryRouter>,
    ));
    await flush(); await flush();
    return root;
  }
  it.each([["pt-BR", "É necessário entrar"], ["en", "Sign in required"]])("preserves the login return URL in %s", async (locale, title) => {
    await i18n.changeLanguage(locale);
    const root = await mount();
    expect(container.querySelector("h1")?.textContent).toBe(title);
    expect(challenge).toHaveBeenCalledWith("id+1", "tok+en/1");
    const href = container.querySelector("a")!.getAttribute("href")!;
    expect(new URL(href, "https://example.test").searchParams.get("next")).toBe("/cli-auth/id%2B1?token=tok%2Ben%2F1");
    await act(() => root.unmount());
  });
  it.each([["pt-BR", "Aprovar acesso da CLI", "Não foi possível concluir a solicitação.", "Detalhes"], ["en", "Approve CLI access", "The request could not be completed.", "Details"]])("preserves challenge data and presents unknown errors in %s", async (locale, buttonLabel, failure, details) => {
    await i18n.changeLanguage(locale);
    session.mockResolvedValue({ user: { id: "user-1" } });
    approve.mockRejectedValue(new Error("Provider <raw>"));
    const root = await mount();
    expect(container.textContent).toContain(initialChallenge.command);
    expect(container.textContent).toContain(initialChallenge.clientName);
    expect(container.textContent).toContain(initialChallenge.requestedCompanyName);
    expect(container.querySelector("corp")).toBeNull();
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === buttonLabel)!;
    await act(() => button.click()); await flush(); await flush();
    expect(approve).toHaveBeenCalledWith("id+1", "tok+en/1");
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain(`${failure} ${details}: Provider <raw>`);
    expect(alert.querySelector("raw")).toBeNull();
    await act(() => root.unmount());
  });
  it.each([["pt-BR", "Acesso da CLI aprovado", "Desafio de autenticação da CLI expirado", "Desafio de autenticação da CLI cancelado"], ["en", "CLI access approved", "CLI auth challenge expired", "CLI auth challenge cancelled"]])("localizes terminal challenge states in %s", async (locale, approved, expired, cancelled) => {
    await i18n.changeLanguage(locale);
    for (const [state, title] of [["approved", approved], ["expired", expired], ["cancelled", cancelled]]) {
      challenge.mockResolvedValue({ ...initialChallenge, status: state });
      const root = await mount();
      expect(container.querySelector("h1")?.textContent).toBe(title);
      if (state === "approved") expect(container.textContent).toContain(initialChallenge.command);
      await act(() => root.unmount());
    }
  });
  it("cancels the original challenge", async () => {
    session.mockResolvedValue({ user: { id: "user-1" } });
    cancel.mockResolvedValue(undefined);
    const root = await mount();
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Cancel")!;
    await act(() => button.click()); await flush(); await flush();
    expect(cancel).toHaveBeenCalledWith("id+1", "tok+en/1");
    await act(() => root.unmount());
  });
});
