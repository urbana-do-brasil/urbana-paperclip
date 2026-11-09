// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { JoinRequestQueue } from "./JoinRequestQueue";

const listJoinRequests = vi.hoisted(() => vi.fn());
const setBreadcrumbs = vi.hoisted(() => vi.fn());

vi.mock("@/api/access", () => ({
  accessApi: {
    listJoinRequests: (...args: unknown[]) => listJoinRequests(...args),
    approveJoinRequest: vi.fn(),
    rejectJoinRequest: vi.fn(),
  },
}));

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "Paperclip" },
  }),
}));

vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs }),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ pushToast: vi.fn() }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const request = {
  id: "request-1",
  inviteId: "invite-1",
  companyId: "company-1",
  requestType: "human",
  status: "pending_approval",
  requestIp: "203.0.113.42",
  requestingUserId: "user-1",
  requestEmailSnapshot: "ana@example.com",
  agentName: null,
  adapterType: null,
  capabilities: null,
  agentDefaultsPayload: null,
  claimSecretExpiresAt: null,
  claimSecretConsumedAt: null,
  createdAgentId: null,
  approvedByUserId: null,
  approvedAt: null,
  rejectedByUserId: null,
  rejectedAt: null,
  createdAt: new Date("2026-10-20T12:00:00Z"),
  updatedAt: new Date("2026-10-20T12:00:00Z"),
  requesterUser: { id: "user-1", name: "Ana Souza", email: "ana@example.com" },
  invite: {
    id: "invite-1",
    inviteType: "company_join",
    allowedJoinTypes: "both",
    humanRole: "operator",
    inviteMessage: "Convite interno de validação",
    createdAt: new Date("2026-10-19T12:00:00Z"),
    expiresAt: new Date("2026-11-19T12:00:00Z"),
    revokedAt: null,
    acceptedAt: null,
    invitedByUser: null,
  },
};

function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(
    <QueryClientProvider client={client}>
      <JoinRequestQueue />
    </QueryClientProvider>,
  ));
  return container;
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  listJoinRequests.mockReset().mockResolvedValue([request]);
  setBreadcrumbs.mockClear();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  await i18n.changeLanguage("en");
});

describe("JoinRequestQueue localization", () => {
  it.each([
    ["en", "Join Request Queue", "Pending approval", "Invite for humans and agents to join", "Approve"],
    ["pt-BR", "Fila de solicitações de entrada", "Aguardando aprovação", "Convite para entrada de pessoas e agentes", "Aprovar"],
  ])("renders the request and its invite context in %s", async (locale, title, status, inviteContext, approve) => {
    await i18n.changeLanguage(locale);
    const el = render();

    await vi.waitFor(() => expect(el.textContent).toContain(title));
    expect(el.textContent).toContain(status);
    expect(el.textContent).toContain("Ana Souza");
    expect(el.textContent).toContain("ana@example.com");
    expect(el.textContent).toContain("203.0.113.42");
    expect(el.textContent).toContain(inviteContext);
    expect(el.textContent).toContain("Convite interno de validação");
    expect(el.textContent).toContain(approve);
    expect(el.querySelectorAll("select")[0]?.value).toBe("pending_approval");
    expect(el.querySelectorAll("select")[1]?.value).toBe("all");
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { label: "Paperclip", href: "/dashboard" },
      { label: locale === "pt-BR" ? "Caixa de entrada" : "Inbox", href: "/inbox" },
      { label: locale === "pt-BR" ? "Solicitações de entrada" : "Join requests" },
    ]);
  });
});
