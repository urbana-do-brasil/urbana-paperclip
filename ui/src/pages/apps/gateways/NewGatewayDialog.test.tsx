// @vitest-environment jsdom

import { type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ToolMcpGatewayWithTokens, ToolProfileWithDetails } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { NewGatewayDialog } from "./NewGatewayDialog";

const { listProfilesMock, createGatewayMock, pushToastMock } = vi.hoisted(() => ({
  listProfilesMock: vi.fn(),
  createGatewayMock: vi.fn(),
  pushToastMock: vi.fn(),
}));

vi.mock("@/api/tools", () => ({
  toolsApi: {
    listProfiles: (...args: unknown[]) => listProfilesMock(...args),
    createGateway: (...args: unknown[]) => createGatewayMock(...args),
  },
}));

vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ pushToast: pushToastMock }) }));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function profile(): ToolProfileWithDetails {
  return {
    id: "profile-1",
    companyId: "company-1",
    profileKey: "profile",
    name: "Research profile",
    description: null,
    status: "active",
    defaultAction: "deny",
    newToolsReviewedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
    bindings: [],
    summary: {
      accessMode: "selected",
      allowedToolCount: 2,
      allowedApplicationCount: 1,
      excludedToolCount: 0,
      totalToolCount: 2,
      assignmentCount: 1,
      appliesToAgentCount: 1,
      isCompanyDefault: false,
    },
  } as ToolProfileWithDetails;
}

async function flushReact() {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

describe("NewGatewayDialog", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    listProfilesMock.mockReset().mockResolvedValue({ profiles: [profile()] });
    createGatewayMock.mockReset().mockResolvedValue({ id: "gateway-1", name: "Research gateway" } as ToolMcpGatewayWithTokens);
    pushToastMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    flushSync(() => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes creation while preserving gateway request values", async () => {
    await i18n.changeLanguage("pt-BR");
    const onOpenChange = vi.fn();
    flushSync(() => root.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <NewGatewayDialog companyId="company-1" open onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    ));
    await flushReact();

    expect(container.textContent).toContain("Novo gateway");
    expect(container.textContent).toContain("O perfil define quais ferramentas este gateway permite.");
    const nameInput = container.querySelector<HTMLInputElement>('input[required]')!;
    const description = container.querySelector<HTMLTextAreaElement>("textarea")!;
    const profileSelect = container.querySelector<HTMLSelectElement>("select")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    const descriptionSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    flushSync(() => {
      setter.call(nameInput, "Research gateway");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      descriptionSetter.call(description, "For the research team");
      description.dispatchEvent(new Event("input", { bubbles: true }));
      profileSelect.value = "profile-1";
      profileSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const form = container.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushReact();

    expect(createGatewayMock).toHaveBeenCalledWith("company-1", {
      name: "Research gateway",
      description: "For the research team",
      profileId: "profile-1",
      defaultProfileMode: "gateway_only",
      contextScopeType: "company",
    });
    expect(pushToastMock).toHaveBeenCalledWith({ title: "Gateway criado", body: "Research gateway", tone: "success" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
