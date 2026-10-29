// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ToolMcpGatewayWithTokens, ToolProfileWithDetails } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { GatewaysList } from "./GatewaysList";

const mocks = vi.hoisted(() => ({
  listGateways: vi.fn(),
  listProfiles: vi.fn(),
  listConnections: vi.fn(),
  listApplications: vi.fn(),
  updateGateway: vi.fn(),
  listAgents: vi.fn(),
  listProjects: vi.fn(),
  setBreadcrumbs: vi.fn(),
  pushToast: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/api/tools", () => ({ toolsApi: {
  listGateways: (...args: unknown[]) => mocks.listGateways(...args),
  listProfiles: (...args: unknown[]) => mocks.listProfiles(...args),
  listConnections: (...args: unknown[]) => mocks.listConnections(...args),
  listApplications: (...args: unknown[]) => mocks.listApplications(...args),
  updateGateway: (...args: unknown[]) => mocks.updateGateway(...args),
} }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: (...args: unknown[]) => mocks.listAgents(...args) } }));
vi.mock("@/api/projects", () => ({ projectsApi: { list: (...args: unknown[]) => mocks.listProjects(...args) } }));
vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-1" }) }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: mocks.setBreadcrumbs }) }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ pushToast: mocks.pushToast }) }));
vi.mock("@/lib/router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function gateway(status = "active"): ToolMcpGatewayWithTokens {
  return {
    id: "gateway-1",
    companyId: "company-1",
    gatewayPublicId: "public-gateway-1",
    name: "Research MCP",
    displaySlug: "research-mcp",
    slug: "research-mcp",
    description: null,
    status,
    profileId: "profile-1",
    defaultProfileMode: "gateway_only",
    contextScopeType: "company",
    contextScopeId: null,
    agentId: null,
    projectId: null,
    issueId: null,
    approvalIssueId: null,
    endpointPath: "/mcp/gateways/public-gateway-1",
    authConfig: {} as ToolMcpGatewayWithTokens["authConfig"],
    headerPolicy: {} as ToolMcpGatewayWithTokens["headerPolicy"],
    metadataPolicy: {} as ToolMcpGatewayWithTokens["metadataPolicy"],
    onDemandToolsConfig: {} as ToolMcpGatewayWithTokens["onDemandToolsConfig"],
    metadata: null,
    createdByAgentId: null,
    createdByUserId: "user-1",
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tokens: [],
    clientSnippets: [],
  } as ToolMcpGatewayWithTokens;
}

function profile(): ToolProfileWithDetails {
  return {
    id: "profile-1",
    companyId: "company-1",
    profileKey: "research",
    name: "Research access",
    description: null,
    status: "active",
    defaultAction: "deny",
    newToolsReviewedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
    bindings: [],
    summary: { accessMode: "selected", allowedToolCount: 2, allowedApplicationCount: 1, excludedToolCount: 0, totalToolCount: 2, assignmentCount: 1, appliesToAgentCount: 1, isCompanyDefault: false },
  } as ToolProfileWithDetails;
}

describe("GatewaysList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    mocks.listGateways.mockReset().mockResolvedValue({ gateways: [gateway()] });
    mocks.listProfiles.mockReset().mockResolvedValue({ profiles: [profile()] });
    mocks.listConnections.mockReset().mockResolvedValue({ connections: [] });
    mocks.listApplications.mockReset().mockResolvedValue({ applications: [] });
    mocks.updateGateway.mockReset().mockImplementation(async (_companyId: string, _gatewayId: string, input: { status: string }) => gateway(input.status));
    mocks.listAgents.mockReset().mockResolvedValue([]);
    mocks.listProjects.mockReset().mockResolvedValue([]);
    mocks.setBreadcrumbs.mockReset();
    mocks.pushToast.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes the list and keeps gateway toggle payloads intact", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    await act(async () => root.render(<QueryClientProvider client={client}><GatewaysList /></QueryClientProvider>));
    await vi.waitFor(() => expect(container.textContent).toContain("Research MCP"));

    expect(container.textContent).toContain("Um gateway é um endpoint MCP seguro");
    expect(container.textContent).toContain("Escopo");
    expect(container.textContent).toContain("Último uso");
    expect(container.querySelector('input[aria-label="Buscar gateways"]')).toBeTruthy();
    expect(mocks.setBreadcrumbs).toHaveBeenCalledWith([
      { label: "Conectores", href: "/apps" },
      { label: "Gateways" },
    ]);

    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="Desativar Research MCP"]')!;
    await act(async () => toggle.click());
    await vi.waitFor(() => expect(mocks.updateGateway).toHaveBeenCalledWith("company-1", "gateway-1", { status: "disabled" }));
    expect(mocks.pushToast).toHaveBeenCalledWith({
      title: "Gateway desativado",
      body: "Research MCP está desativado — nenhum cliente consegue usá-lo.",
      tone: "success",
    });
  });
});
