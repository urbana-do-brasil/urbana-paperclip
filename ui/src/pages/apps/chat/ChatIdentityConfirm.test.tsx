// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatIdentityConfirm } from "./ChatIdentityConfirm";
import { i18n } from "@/i18n";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), previewIdentityLink: vi.fn(), confirmIdentityLink: vi.fn(),
  requestIdentityAccess: vi.fn(), navigate: vi.fn(),
}));
vi.mock("@/api/chatEndpoints", () => ({ chatEndpointsApi: mocks }));
vi.mock("@/api/auth", () => ({ authApi: { getSession: mocks.getSession } }));
vi.mock("@/api/health", () => ({ healthApi: { get: async () => ({ deploymentMode: "authenticated" }) } }));
vi.mock("@/lib/router", () => ({
  useSearchParams: () => [new URLSearchParams({ token: "synthetic-token-that-is-at-least-32-characters" })],
  Navigate: (props: { to: string }) => { mocks.navigate(props.to); return null; },
}));

describe("self-service Slack identity confirmation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const identity = { provider: "slack", externalLabel: "Dotta", companyName: "Acme", botLabel: "CEO", selfService: true, canConfirm: true };
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: "user-a", name: "Dotta" } });
    mocks.previewIdentityLink.mockResolvedValue(identity);
    mocks.confirmIdentityLink.mockResolvedValue({ ok: true });
    mocks.requestIdentityAccess.mockResolvedValue({ status: "pending_approval" });
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });
  afterEach(() => { flushSync(() => root.unmount()); client.clear(); container.remove(); });
  const render = () => flushSync(() => root.render(<QueryClientProvider client={client}><ChatIdentityConfirm /></QueryClientProvider>));
  const button = (text: string) => Array.from(container.querySelectorAll("button")).find((node) => node.textContent === text)!;

  it("sends signed-out users to sign in with the confirmation route preserved", async () => {
    mocks.getSession.mockResolvedValue(null); render();
    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining("/auth?next=%2Fchat-identity%2Fconfirm%3Ftoken%3D")));
    expect(mocks.previewIdentityLink).not.toHaveBeenCalled();
  });
  it("requires an explicit identity confirmation from members", async () => {
    render(); await vi.waitFor(() => expect(button("Confirm identity")).toBeTruthy());
    expect(mocks.confirmIdentityLink).not.toHaveBeenCalled();
    button("Confirm identity").click();
    await vi.waitFor(() => expect(container.textContent).toContain("Identity linked"));
    expect(container.textContent).toContain("current Paperclip permissions");
    expect(container.querySelector('a')?.textContent).toBe("Return to Slack");
  });
  it("keeps other providers out of the Slack return flow", async () => {
    mocks.previewIdentityLink.mockResolvedValue({ ...identity, provider: "github", selfService: false });
    render(); await vi.waitFor(() => expect(button("Confirm identity")).toBeTruthy());
    button("Confirm identity").click();
    await vi.waitFor(() => expect(container.textContent).toContain("Identity linked"));
    expect(container.querySelector('a[href="https://app.slack.com/"]')).toBeNull();
  });
  it("lets nonmembers request access without confirming the identity", async () => {
    mocks.previewIdentityLink.mockResolvedValue({ ...identity, canConfirm: false });
    render(); await vi.waitFor(() => expect(button("Request access")).toBeTruthy());
    expect(button("Confirm identity")).toBeUndefined(); button("Request access").click();
    await vi.waitFor(() => expect(container.textContent).toContain("Access requested"));
    expect(mocks.confirmIdentityLink).not.toHaveBeenCalled();
    expect(mocks.requestIdentityAccess).toHaveBeenCalledTimes(1);
  });
  it("does not allow requests using an expired or consumed link", async () => {
    mocks.previewIdentityLink.mockRejectedValue(new Error("Expired")); render();
    await vi.waitFor(() => expect(container.textContent).toContain("This identity link is unavailable"));
    expect(container.querySelector("button")).toBeNull();
  });
  it.each([["pt-BR", "Confirmar identidade", "Identidade vinculada", "Voltar ao Slack"], ["en", "Confirm identity", "Identity linked", "Return to Slack"]])(
    "preserves identity and token when confirming in %s", async (locale, confirmLabel, success, returnLabel) => {
      await i18n.changeLanguage(locale);
      mocks.previewIdentityLink.mockResolvedValue({ ...identity, externalLabel: "Person <external>", companyName: "Acme <Corp>" });
      render(); await vi.waitFor(() => expect(button(confirmLabel)).toBeTruthy());
      expect(container.textContent).toContain("Person <external>");
      expect(container.textContent).toContain("Acme <Corp>");
      expect(container.querySelector("external")).toBeNull();
      button(confirmLabel).click();
      await vi.waitFor(() => expect(container.textContent).toContain(success));
      expect(container.textContent).toContain("Person <external>");
      expect(container.textContent).toContain("Acme <Corp>");
      expect(mocks.confirmIdentityLink).toHaveBeenCalledWith("synthetic-token-that-is-at-least-32-characters");
      expect(container.querySelector("a")?.textContent).toBe(returnLabel);
      expect(container.querySelector("a")?.getAttribute("href")).toBe("https://app.slack.com/");
    },
  );
  it.each([["pt-BR", "Solicitar acesso", "Não foi possível solicitar acesso."], ["en", "Request access", "Couldn't request access."]])(
    "announces request failures in %s without confirming identity", async (locale, requestLabel, message) => {
      await i18n.changeLanguage(locale);
      mocks.previewIdentityLink.mockResolvedValue({ ...identity, canConfirm: false });
      mocks.requestIdentityAccess.mockRejectedValue(new Error("expired"));
      render(); await vi.waitFor(() => expect(button(requestLabel)).toBeTruthy());
      button(requestLabel).click();
      await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain(message));
      expect(mocks.requestIdentityAccess).toHaveBeenCalledWith("synthetic-token-that-is-at-least-32-characters");
      expect(mocks.confirmIdentityLink).not.toHaveBeenCalled();
    },
  );
});
