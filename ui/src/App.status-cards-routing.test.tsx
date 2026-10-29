// @vitest-environment jsdom

import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, useTranslation } from "@/i18n";
import { App } from "./App";

const mockSettings = vi.hoisted(() => ({ getExperimental: vi.fn() }));
vi.mock("./api/instanceSettings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/instanceSettings")>();
  return { ...actual, instanceSettingsApi: { ...actual.instanceSettingsApi, getExperimental: mockSettings.getExperimental } };
});

// jsdom rejects Stitches' custom-property marker rule when <App>'s eager import
// graph evaluates. Keep its stylesheet bookkeeping intact with a valid fallback.
vi.hoisted(() => {
  const sheetProto = window.CSSStyleSheet.prototype as unknown as {
    insertRule: (rule: string, index?: number) => number;
    __statusCardsPatched?: boolean;
  };
  if (!sheetProto.__statusCardsPatched) {
    const original = sheetProto.insertRule;
    sheetProto.insertRule = function patched(this: CSSStyleSheet, rule: string, index?: number) {
      try {
        return original.call(this, rule, index);
      } catch {
        try {
          return original.call(this, ".status-cards-test-noop{}", index);
        } catch {
          return this.cssRules?.length ?? 0;
        }
      }
    };
    sheetProto.__statusCardsPatched = true;
  }
});

vi.mock("./components/Layout", async () => {
  const { Outlet } = await import("react-router-dom");
  return { Layout: () => <Outlet /> };
});
vi.mock("./components/Layout.production", async () => {
  const { Outlet } = await import("react-router-dom");
  return { Layout: () => <Outlet /> };
});
vi.mock("./components/OnboardingWizardVariant", () => ({ OnboardingWizardVariant: () => null }));
vi.mock("./components/CloudAccessGate", async () => {
  const { Outlet } = await import("react-router-dom");
  return { CloudAccessGate: () => <Outlet /> };
});
vi.mock("./pages/StatusCards", () => ({
  StatusCards: () => {
    const { pathname } = useLocation();
    const { cardId } = useParams<{ cardId?: string }>();
    const { t } = useTranslation();
    return <div data-testid="status-page">{t("navigation.status")}|{pathname}|{cardId ?? ""}</div>;
  },
}));
vi.mock("./pages/Dashboard", () => ({ Dashboard: () => <div data-testid="dashboard-page">Dashboard route</div> }));

const PAP_COMPANY = { id: "company-1", name: "Paperclip", issuePrefix: "PAP", status: "active" };
vi.mock("./context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [PAP_COMPANY],
    selectedCompanyId: PAP_COMPANY.id,
    selectedCompany: PAP_COMPANY,
    loading: false,
  }),
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

async function renderAppAt(container: HTMLElement, path: string) {
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  flushSync(() => root.render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  return root;
}

async function waitForRoute(container: HTMLElement, selector: string) {
  await vi.waitFor(() => expect(container.querySelector(selector)).not.toBeNull());
}

describe("App Status Cards routes", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockSettings.getExperimental.mockResolvedValue({
      enableStreamlinedUi: true,
      enableCombinedInboxTasks: false,
      enableSummaries: true,
      enableStatusCards: true,
    });
  });
  afterAll(async () => { await i18n.changeLanguage("en"); });
  afterEach(() => {
    flushSync(() => root?.unmount());
    root = null;
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it.each(["pt-BR", "en"])("resolves the real unprefixed /status route in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    root = await renderAppAt(container, "/status");
    await waitForRoute(container, '[data-testid="status-page"]');

    expect(container.querySelector('[data-testid="status-page"]')?.textContent).toBe("Status|/PAP/status|");
    expect(mockSettings.getExperimental).toHaveBeenCalled();
  });

  it.each(["pt-BR", "en"])("resolves a legacy card URL through App's real redirect in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    root = await renderAppAt(container, "/PAP/status-cards/card-abc123");
    await waitForRoute(container, '[data-testid="status-page"]');

    expect(container.querySelector('[data-testid="status-page"]')?.textContent).toBe(
      "Status|/PAP/status/card-abc123|card-abc123",
    );
  });

  it("redirects the real direct route when Status Cards is disabled", async () => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: true, enableStatusCards: false });
    root = await renderAppAt(container, "/PAP/status");
    await waitForRoute(container, '[data-testid="dashboard-page"]');

    expect(container.querySelector('[data-testid="status-page"]')).toBeNull();
  });
});
