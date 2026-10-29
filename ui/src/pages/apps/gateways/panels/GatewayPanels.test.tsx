// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ToolMcpGatewayWithTokens, ToolProfileWithDetails } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import type { GatewayAppRow } from "../gateway-helpers";
import { AppsToolsPanel } from "./AppsToolsPanel";
import { GatewayAdvancedPanel } from "./GatewayAdvancedPanel";
import { OverviewPanel } from "./OverviewPanel";

const mocks = vi.hoisted(() => ({
  updateGateway: vi.fn(),
  pushToast: vi.fn(),
  navigate: vi.fn(),
  copyTextToClipboard: vi.fn(),
}));

vi.mock("@/api/tools", () => ({ toolsApi: { updateGateway: (...args: unknown[]) => mocks.updateGateway(...args) } }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ pushToast: mocks.pushToast }) }));
vi.mock("@/lib/router", () => ({ useNavigate: () => mocks.navigate, Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: (...args: unknown[]) => mocks.copyTextToClipboard(...args) }));
vi.mock("../NewGatewayDialog", () => ({ gatewaysQueryKey: (companyId: string) => ["gateways", companyId] }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function gateway(): ToolMcpGatewayWithTokens {
  return {
    id: "gateway-1",
    companyId: "company-1",
    gatewayPublicId: "public-gateway-1",
    name: "Research MCP",
    displaySlug: "research-mcp",
    slug: "research-mcp",
    description: null,
    status: "active",
    profileId: "profile-1",
    defaultProfileMode: "gateway_only",
    contextScopeType: "company",
    contextScopeId: "company-1",
    agentId: null,
    projectId: null,
    issueId: null,
    approvalIssueId: null,
    endpointPath: "/mcp/gateways/public-gateway-1",
    authConfig: { mode: "bearer" } as unknown as ToolMcpGatewayWithTokens["authConfig"],
    headerPolicy: { allowedHeaders: ["Authorization"] } as unknown as ToolMcpGatewayWithTokens["headerPolicy"],
    metadataPolicy: {} as ToolMcpGatewayWithTokens["metadataPolicy"],
    onDemandToolsConfig: {} as ToolMcpGatewayWithTokens["onDemandToolsConfig"],
    metadata: null,
    createdByAgentId: null,
    createdByUserId: "user-1",
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
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
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    entries: [],
    bindings: [],
    summary: { accessMode: "selected", allowedToolCount: 2, allowedApplicationCount: 1, excludedToolCount: 0, totalToolCount: 2, assignmentCount: 1, appliesToAgentCount: 1, isCompanyDefault: false },
  } as ToolProfileWithDetails;
}

const apps: GatewayAppRow[] = [{
  application: { id: "app-1", name: "GitHub" } as GatewayAppRow["application"],
  connection: null,
  toolCount: 3,
  needsAttention: true,
  attentionReason: "missing_secret",
}];

describe("gateway detail panels", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    vi.clearAllMocks();
    mocks.updateGateway.mockResolvedValue(gateway());
    mocks.copyTextToClipboard.mockResolvedValue(undefined);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes the overview and preserves its MCP client configuration", async () => {
    await act(async () => root.render(
      <OverviewPanel gateway={gateway()} profile={profile()} apps={apps} agentNames={new Map()} projectNames={new Map()} toggleDisabled={false} onToggle={vi.fn()} />,
    ));

    expect(container.textContent).toContain("Quem pode usar");
    expect(container.textContent).toContain("Apps neste gateway");
    expect(container.textContent).toContain("Requer atenção");
    expect(container.textContent).toContain('/mcp/gateways/public-gateway-1');
    expect(container.textContent).toContain('"Authorization": "Bearer pcgw_•••_TOKEN"');
    expect(container.textContent).toContain('"paperclip-research-mcp"');
  });

  it("localizes the apps and tools table in English", async () => {
    await i18n.changeLanguage("en");
    await act(async () => root.render(<AppsToolsPanel apps={apps} profile={profile()} />));

    expect(container.textContent).toContain("These apps go through this gateway.");
    expect(container.textContent).toContain("Tools");
    expect(container.textContent).toContain("Needs attention");
    expect(container.textContent).toContain("GitHub");
  });

  it("keeps protocol values intact and archives with the original API payload", async () => {
    await act(async () => root.render(
      <QueryClientProvider client={client}><GatewayAdvancedPanel companyId="company-1" gateway={gateway()} /></QueryClientProvider>,
    ));

    expect(container.textContent).toContain("Zona de risco");
    expect(container.textContent).toContain("streamable_http");
    expect(container.textContent).toContain("bearer");
    expect(container.textContent).toContain("2025-03-26");
    expect(container.textContent).toContain('"gatewayPublicId": "public-gateway-1"');

    const archiveButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Arquivar gateway")!;
    await act(async () => archiveButton.click());
    const nameInput = container.querySelector<HTMLInputElement>('input[aria-label="Digite o nome do gateway para confirmar o arquivamento"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(nameInput, "Research MCP");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const confirmButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Arquivar gateway")!;
    await act(async () => confirmButton.click());
    await vi.waitFor(() => expect(mocks.updateGateway).toHaveBeenCalledWith("company-1", "gateway-1", { status: "archived" }));
  });
});
