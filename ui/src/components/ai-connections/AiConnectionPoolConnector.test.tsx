// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { aiConnectionRouterAppDefinition, type AiManagedConnectionSummary } from "@paperclipai/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { AiConnectionPoolConnector } from "./AiConnectionPoolConnector";

const api = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listPools: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  inspect: vi.fn(),
  listGallery: vi.fn(),
  listAgents: vi.fn(),
  navigate: vi.fn(),
  setBreadcrumbs: vi.fn(),
  pushToast: vi.fn(),
}));
vi.mock("@/api/ai-connections", () => ({ aiConnectionsApi: { list: (companyId: string) => api.listAccounts(companyId) } }));
vi.mock("@/api/ai-connection-pools", () => ({ aiConnectionPoolsApi: {
  list: (companyId: string) => api.listPools(companyId),
  save: (companyId: string, body: unknown) => api.save(companyId, body),
  remove: (companyId: string, id: string, revision: number) => api.remove(companyId, id, revision),
  inspect: (companyId: string, id: string) => api.inspect(companyId, id),
} }));
vi.mock("@/api/tools", () => ({ toolsApi: { listGallery: (companyId: string) => api.listGallery(companyId) } }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: (companyId: string) => api.listAgents(companyId) } }));
vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-1" }) }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: api.setBreadcrumbs }) }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ pushToast: api.pushToast }) }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => api.navigate,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const pluginKey = "@paperclipai/plugin-example-router";
const routerApp = aiConnectionRouterAppDefinition(pluginKey, { name: "Example router", description: "Provider description" });
const credentialCanary = "secret-material-must-never-be-rendered-or-saved";
const account = {
  id: "ai-connection-id",
  grantId: "ai-grant-id",
  companyId: "company-1",
  provider: "anthropic",
  method: "subscription",
  name: "Research Claude account",
  ownership: "personal",
  ownerUserId: "user-1",
  ownerName: "Ada",
  isDefault: false,
  status: "connected",
  credentialMaterial: credentialCanary,
} as AiManagedConnectionSummary;

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.clearAllMocks();
  api.listAccounts.mockResolvedValue({ currentUserId: "user-1", canManageConnections: true, connections: [account] });
  api.listPools.mockResolvedValue([]);
  api.listGallery.mockResolvedValue({ apps: [routerApp] });
  api.listAgents.mockResolvedValue([]);
  api.inspect.mockResolvedValue({});
  api.save.mockImplementation(async (_companyId: string, body: { pluginKey: string; config: Record<string, unknown> }) => ({
    ...body.config, id: "pool-1", companyId: "company-1", pluginKey: body.pluginKey, revision: 1,
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  await i18n.changeLanguage("en");
});

async function renderConnector() {
  await act(async () => root.render(<QueryClientProvider client={client}><AiConnectionPoolConnector pluginKey={pluginKey} /></QueryClientProvider>));
  await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
}

function buttonByText(text: string) {
  return Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.trim() === text);
}

it.each([
  ["en", "Add a connection pool", "Claude subscription", "Continue", "Create pool", "Connectors", "AI connection pool"],
  ["pt-BR", "Adicionar um pool de conexões", "Assinatura Claude", "Continuar", "Criar pool", "Conectores", "Pool de conexões de IA"],
] as const)("localizes pool creation in %s and preserves the selected account binding", async (locale, title, methodLabel, continueLabel, saveLabel, connectorLabel, displayName) => {
  await i18n.changeLanguage(locale);
  await renderConnector();

  await vi.waitFor(() => expect(host.textContent, host.innerHTML).toContain(title));
  expect(host.querySelector("h1")?.textContent).toBe(title);
  expect(api.setBreadcrumbs).toHaveBeenCalledWith([{ label: connectorLabel, href: "/apps" }, { label: displayName }]);
  expect(host.textContent).toContain("Research Claude account");
  expect(host.textContent).toContain(methodLabel);
  expect(host.textContent).not.toContain(credentialCanary);
  const accountCheckbox = host.querySelector<HTMLButtonElement>('[role="checkbox"]');
  expect(accountCheckbox).toBeTruthy();
  await act(async () => accountCheckbox!.click());
  expect(accountCheckbox!.getAttribute("data-state")).toBe("checked");
  await act(async () => buttonByText(continueLabel)!.click());
  await act(async () => buttonByText(saveLabel)!.click());

  await vi.waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
  const [companyId, payload] = api.save.mock.calls[0] as [string, { pluginKey: string; config: { name: string; enabled: boolean; mode: string; thresholdPercent: number; members: Array<{ id: string; binding: Record<string, unknown>; profile: Record<string, unknown> }> } }];
  expect(companyId).toBe("company-1");
  expect(payload.pluginKey).toBe(pluginKey);
  expect(payload.config).toEqual({
    name: "AI connection pool",
    enabled: false,
    mode: "round_robin",
    thresholdPercent: 90,
    members: [{
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      binding: { mode: "delegated", provider: "anthropic", method: "subscription", connectionId: "ai-connection-id", grantId: "ai-grant-id" },
      profile: { provider: "acpx", acpxAgent: "claude", model: "claude-sonnet-5" },
    }],
  });
  expect(JSON.stringify(payload)).not.toContain(credentialCanary);
  expect(host.textContent).not.toContain(credentialCanary);
  expect(api.navigate).toHaveBeenCalledWith("/apps/pool-1/permissions");
});
