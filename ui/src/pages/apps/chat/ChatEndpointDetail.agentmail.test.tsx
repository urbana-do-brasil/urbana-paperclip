// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatEndpointDetail } from "./ChatEndpointDetail";
import { queryKeys } from "@/lib/queryKeys";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";

const mocks = vi.hoisted(() => ({
  tab: "settings", get: vi.fn(), conversations: vi.fn(), activity: vi.fn(), setup: vi.fn(),
  control: vi.fn(), getConnection: vi.fn(), grants: vi.fn(), installs: vi.fn(), agents: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/api/chatEndpoints", () => ({ chatEndpointsApi: {
  get: mocks.get, listConversations: mocks.conversations, listActivityPage: mocks.activity, setup: mocks.setup,
} }));
vi.mock("@/api/email", () => ({ emailApi: { control: mocks.control } }));
vi.mock("@/api/tools", () => ({ toolsApi: {
  getConnection: mocks.getConnection, listConnectionGrants: mocks.grants, getConnectionInstalls: mocks.installs,
} }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: mocks.agents } }));
vi.mock("./EmailEndpointSetup", () => ({ EmailEndpointSettings: () => <h1>Email settings</h1> }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: () => {} }) }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ pushToast: () => {} }) }));
vi.mock("@/lib/router", () => ({
  useLocation: () => ({ state: null }),
  useParams: () => ({ endpointId: "inbox", tab: mocks.tab }), useNavigate: () => mocks.navigate,
  Link: ({ children, to, ...props }: React.ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
  Navigate: () => null,
}));

describe("AgentMail connection management tabs", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  const endpoint = { id: "inbox", companyId: "company", connectionId: "runtime", provider: "agentmail",
    assignedAgentId: "ralph", assignedAgentName: "Ralph", botExternalId: "ralph@example.test",
    allowUnlinkedPeople: false, status: "active", setup: { step: "complete" } };
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
    mocks.tab = "settings";
    mocks.get.mockResolvedValue(endpoint);
    mocks.getConnection.mockResolvedValue({ id: "runtime", companyId: "company", config: { credentialConnectionId: "account" } });
    mocks.grants.mockResolvedValue({ grants: [{ status: "active", kind: "organization" }], capabilities: { canConfigure: true } });
    mocks.installs.mockResolvedValue({ installs: [{ targetType: "agent", targetId: "ralph" }] });
    mocks.agents.mockResolvedValue([{ id: "ralph", name: "Ralph", status: "idle" }]);
    mocks.conversations.mockResolvedValue([]);
    mocks.activity.mockResolvedValue({ items: [], nextCursor: null });
    mocks.control.mockResolvedValue({ id: "inbox", companyId: "company", status: "paused" });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });
  afterEach(async () => { await act(async () => root.unmount()); client.clear(); container.remove(); });
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  async function render(tab: string) {
    mocks.tab = tab;
    await act(async () => root.render(<QueryClientProvider client={client}><TooltipProvider><ChatEndpointDetail /></TooltipProvider></QueryClientProvider>));
    await vi.waitFor(() => {
      expect(container.textContent?.trim().length).toBeGreaterThan(0);
      expect(container.textContent).not.toMatch(/Loading (connection|access|conversations|activity)…/);
    }, { timeout: 3000 });
  }
  async function click(label: string) {
    const button = [...container.querySelectorAll("button")].find(node => node.textContent?.trim() === label);
    expect(button).toBeDefined(); await act(async () => button!.click());
    await vi.waitFor(() => expect(button!.disabled).toBe(false), { timeout: 3000 });
    await settle();
  }
  it("renders settings only on Settings and loads the saved credential on Access", async () => {
    await render("settings"); expect(container.textContent).toContain("Email settings");
    await render("access");
    expect(container.textContent).not.toContain("Email settings");
    expect(container.textContent).toContain(i18n.t("apps.appDetail.identities.anyHumanInCompany"));
    expect(container.textContent).toContain(i18n.t("apps.appDetail.permissions.access.heading"));
    expect(container.textContent).toContain("Ralph");
    expect(mocks.grants).toHaveBeenCalledWith("account"); expect(mocks.installs).toHaveBeenCalledWith("account");
    expect(mocks.grants).not.toHaveBeenCalledWith("runtime");
  });
  it.each([
    ["en", "Access", "These settings apply to the saved AgentMail account and all inboxes using it."],
    ["pt-BR", "Acesso", "Estas configurações se aplicam à conta AgentMail salva e a todas as caixas de entrada que a utilizam."],
  ])("localizes the saved AgentMail access wrapper in %s", async (locale, heading, accountNote) => {
    await i18n.changeLanguage(locale);
    await render("access");
    await vi.waitFor(() => expect(container.textContent).toContain(accountNote));
    expect(container.textContent).toContain(heading);
    expect(mocks.getConnection).toHaveBeenCalledWith("runtime");
    expect(mocks.grants).toHaveBeenCalledWith("account");
  });
  it("shows an access failure rather than editable controls when the credential cannot load", async () => {
    mocks.getConnection.mockRejectedValue(new Error("Offline")); await render("access");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("could not be loaded");
    expect(container.querySelector('[role="radiogroup"]')).toBeNull(); expect(mocks.grants).not.toHaveBeenCalled();
  });
  it("uses inbox-local access for a legacy inbox with no saved account", async () => {
    mocks.getConnection.mockResolvedValue({ id: "runtime", config: {} }); await render("access");
    expect(mocks.grants).toHaveBeenCalledWith("runtime");
  });
  it.each([
    ["en", "Customer thread <provider>", "Investigate <provider> webhook", "OPS-47", "Waiting", "Conversations"],
    ["pt-BR", "Customer thread <provider>", "Investigate <provider> webhook", "OPS-47", "Aguardando", "Conversas"],
  ])("localizes AgentMail conversations in %s and preserves external metadata", async (locale, externalLabel, taskTitle, identifier, stateLabel, listLabel) => {
    await i18n.changeLanguage(locale);
    const externalUrl = "https://mail.example.test/conversations/provider-thread-42?message=mail-msg-99&keep=%2F";
    mocks.conversations.mockResolvedValue([{
      id: "conversation-provider-row-42",
      externalLabel,
      externalUrl,
      issueId: "task-external-42",
      issueIdentifier: identifier,
      issueTitle: taskTitle,
      state: "waiting",
      updatedAt: "2026-11-03T12:34:56.000Z",
    }]);
    await render("conversations");
    await vi.waitFor(() => expect(container.textContent).toContain(externalLabel));

    expect(container.textContent).toContain(taskTitle);
    expect(container.textContent).toContain(identifier);
    expect(container.textContent).toContain(stateLabel);
    expect(container.querySelector("provider")).toBeNull();
    expect(container.querySelector(`ul[aria-label="${listLabel}"]`)).not.toBeNull();
    expect(container.querySelector('a[href="/issues/task-external-42"]')).not.toBeNull();
    const providerLink = [...container.querySelectorAll("a")].find((anchor) => anchor.href === externalUrl);
    expect(providerLink?.textContent).toBe(externalLabel);
    expect(providerLink?.getAttribute("target")).toBe("_blank");
    expect(providerLink?.getAttribute("rel")).toBe("noreferrer");
    expect(mocks.conversations).toHaveBeenCalledWith("inbox");
  });
  it.each([
    ["en", "Send an email", "Conversations could not be loaded", "Try again", "No email conversations yet"],
    ["pt-BR", "Envie um e-mail", "Não foi possível carregar as conversas", "Tentar novamente", "Ainda não há conversas por e-mail"],
  ])("localizes the AgentMail conversation empty and error states in %s", async (locale, emptyMessage, errorMessage, retryLabel, obsoleteEmptyCopy) => {
    await i18n.changeLanguage(locale);
    await render("conversations");
    await vi.waitFor(() => expect(container.textContent).toContain(emptyMessage));
    client.removeQueries({ queryKey: queryKeys.chatEndpoints.conversations("inbox") });
    mocks.conversations.mockRejectedValue(new Error("Offline"));
    await render("conversations");
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain(errorMessage));
    expect(container.textContent).not.toContain(obsoleteEmptyCopy);
    mocks.conversations.mockResolvedValue([]);
    await click(retryLabel);
    await vi.waitFor(() => expect(container.textContent).toContain(emptyMessage));
  });
  it("loads activity and routes pause through the email API without replacing cached chat detail with an email summary", async () => {
    mocks.activity.mockImplementation(async () => {
      // Query completion can follow the initial endpoint render, especially
      // while the complete UI suite is running. Wait for data, not a short sleep.
      await new Promise(resolve => setTimeout(resolve, 100));
      return { items: [{ id: "delivery", kind: "delivery", status: "failed", summary: "Email received", createdAt: "2026-10-01T00:00:00Z", replayable: true,
      resolutionActions: ["retry_anyway"] }, { id: "publication", kind: "publication", status: "delivery_unknown", summary: "Email send unconfirmed",
      createdAt: "2026-10-01T00:00:00Z", resolutionActions: ["mark_delivered", "retry_anyway", "cancel"] }], nextCursor: null };
    });
    await render("activity"); expect(container.textContent).toContain("Email received");
    expect(container.textContent).not.toContain("Email settings"); expect(container.textContent).not.toContain("Replay");
    expect([...container.querySelectorAll("button")].some(button => button.textContent?.trim() === "Resolve")).toBe(false);
    expect(container.querySelector('a[href="/apps/chat/inbox/conversations"]')).not.toBeNull();
    await click("Pause"); expect(mocks.control).toHaveBeenCalledWith("inbox", "pause"); expect(mocks.setup).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.chatEndpoints.detail("inbox"))).toMatchObject({ provider: "agentmail", assignedAgentName: "Ralph" });
    await click("Reconnect"); expect(mocks.navigate).toHaveBeenCalledWith("/apps/chat/inbox/settings");
  });
});
