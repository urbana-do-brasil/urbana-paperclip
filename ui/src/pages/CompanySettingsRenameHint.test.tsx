// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryKeys } from "@/lib/queryKeys";
import { CompanySettings } from "./CompanySettings";

const mockCompaniesApi = vi.hoisted(() => ({
  update: vi.fn(),
  archive: vi.fn(),
}));

const mockAssetsApi = vi.hoisted(() => ({
  uploadCompanyLogo: vi.fn(),
}));

const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockSetSelectedCompanyId = vi.hoisted(() => vi.fn());

const SELECTED_COMPANY = {
  id: "company-1",
  name: "Acme Robotics",
  description: null,
  status: "active",
  issuePrefix: "ACM",
  brandColor: null,
  logoUrl: null,
  attachmentMaxBytes: null,
  requireBoardApprovalForNewAgents: false,
  interactionResolverGovernance: {},
};

vi.mock("../api/companies", () => ({ companiesApi: mockCompaniesApi }));
vi.mock("../api/assets", () => ({ assetsApi: mockAssetsApi }));

vi.mock("../components/decision-models/DecisionModelSettings", () => ({
  DecisionModelSettingsSection: () => null,
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [SELECTED_COMPANY],
    selectedCompany: SELECTED_COMPANY,
    selectedCompanyId: SELECTED_COMPANY.id,
    setSelectedCompanyId: mockSetSelectedCompanyId,
  }),
}));

// Both panels below the name field own their own queries and are not part of
// what this test covers.
vi.mock("../components/InteractionGovernancePanel", () => ({
  InteractionGovernancePanel: () => null,
  applyGovernanceChange: (governance: unknown) => governance,
}));

vi.mock("./InstanceGeneralSettings", () => ({
  InstanceGeneralSettings: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const CLOUD_HEALTH = {
  status: "ok" as const,
  cloud: {
    managed: true as const,
    managedBy: "paperclip-cloud" as const,
    stackSlug: "acme-labs",
    cloudBaseUrl: "https://cloud.example.test",
  },
};

const SELF_HOSTED_HEALTH = { status: "ok" as const, cloud: null };

const RENAME_HINT =
  "Renaming can change this company's task ID prefix. Existing task IDs are renumbered and old task links stop resolving.";

async function flushReact() {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("CompanySettings rename hint", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    mockCompaniesApi.update.mockImplementation(async (_companyId: string, patch: Record<string, unknown>) => ({
      ...SELECTED_COMPANY,
      ...(typeof patch.name === "string" ? { name: patch.name } : {}),
      ...(typeof patch.description === "string" || patch.description === null ? { description: patch.description } : {}),
      ...(typeof patch.logoAssetId === "string" ? { logoUrl: "/api/assets/logo/content" } : {}),
    }));
    mockAssetsApi.uploadCompanyLogo.mockResolvedValue({ assetId: "logo-asset-1" });
  });

  afterEach(async () => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  function render(health: unknown) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // CloudAccessGate owns the health fetch in the app; seeding the cache is how
    // useCloudInstance sees a managed instance under test.
    queryClient.setQueryData(queryKeys.health, health);
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <MemoryRouter>
              <CompanySettings />
            </MemoryRouter>
          </TooltipProvider>
        </QueryClientProvider>,
      );
    });
    return root;
  }

  function hintText() {
    return Array.from(container.querySelectorAll("p")).find(
      (element) => element.textContent?.trim() === RENAME_HINT,
    );
  }

  it("warns that a rename re-keys task IDs on a managed instance", () => {
    const root = render(CLOUD_HEALTH);
    expect(hintText()).toBeDefined();
    flushSync(() => root.unmount());
  });

  it("stays silent on a self-hosted instance, where a rename keeps the prefix", () => {
    const root = render(SELF_HOSTED_HEALTH);
    expect(hintText()).toBeUndefined();
    flushSync(() => root.unmount());
  });

  it("localizes organization fields and preserves name, description, and logo upload values", async () => {
    await i18n.changeLanguage("pt-BR");
    const root = render(SELF_HOSTED_HEALTH);

    expect(container.textContent).toContain("Nome da organização");
    expect(container.textContent).toContain("Aparência");
    expect(container.textContent).toContain("Logotipo");
    expect(container.textContent).toContain("Admissões");
    expect(container.textContent).toContain("Exigir aprovação do conselho para novas admissões");
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { label: "Acme Robotics", href: "/dashboard" },
      { label: "Configurações" },
    ]);
    const hiringToggle = container.querySelector<HTMLButtonElement>(
      '[data-testid="company-settings-team-approval-toggle"]',
    );
    expect(hiringToggle?.getAttribute("aria-checked")).toBe("false");
    flushSync(() => hiringToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flushReact();
    expect(mockCompaniesApi.update).toHaveBeenCalledWith("company-1", {
      requireBoardApprovalForNewAgents: true,
    });

    const textInputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]'));
    const nameInput = textInputs[0]!;
    const descriptionInput = textInputs[1]!;
    const setInputValue = (input: HTMLInputElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    flushSync(() => {
      setInputValue(nameInput, "Acme Robotics BR");
      setInputValue(descriptionInput, "Brazilian team");
    });
    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Salvar alterações",
    );
    expect(saveButton).toBeDefined();
    flushSync(() => saveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flushReact();
    expect(mockCompaniesApi.update).toHaveBeenCalledWith("company-1", {
      name: "Acme Robotics BR",
      description: "Brazilian team",
    });

    const logoInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["logo"], "brand.svg", { type: "image/svg+xml" });
    Object.defineProperty(logoInput, "files", { configurable: true, value: [file] });
    flushSync(() => logoInput.dispatchEvent(new Event("change", { bubbles: true })));
    await flushReact();
    await flushReact();
    expect(mockAssetsApi.uploadCompanyLogo).toHaveBeenCalledWith("company-1", file);
    expect(mockCompaniesApi.update).toHaveBeenCalledWith("company-1", { logoAssetId: "logo-asset-1" });
    expect(container.textContent).toContain("Remover logotipo");

    flushSync(() => root.unmount());
  });

  it("localizes the managed-instance rename warning while retaining the task ID constraint", async () => {
    await i18n.changeLanguage("pt-BR");
    const root = render(CLOUD_HEALTH);
    expect(container.textContent).toContain(
      "Renomear pode alterar o prefixo dos IDs de tarefas desta organização. Os IDs existentes serão renumerados e os links antigos deixarão de funcionar.",
    );
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.value).toBe("Acme Robotics");
    flushSync(() => root.unmount());
  });
});
