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
  return { Layout: () => <div data-testid="streamlined-shell"><Outlet /></div> };
});
vi.mock("./components/Layout.production", async () => {
  const { Outlet } = await import("react-router-dom");
  return { Layout: () => <div data-testid="production-shell"><Outlet /></div> };
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

  it.each(["pt-BR", "en"])("resolves the real unprefixed /status route in the streamlined shell (%s)", async (locale) => {
    await i18n.changeLanguage(locale);
    root = await renderAppAt(container, "/status");
    await waitForRoute(container, '[data-testid="status-page"]');

    expect(container.querySelector('[data-testid="status-page"]')?.textContent).toBe("Status|/PAP/status|");
    expect(container.querySelector('[data-testid="streamlined-shell"]')).not.toBeNull();
    expect(mockSettings.getExperimental).toHaveBeenCalled();
  });

  it.each(["pt-BR", "en"])("resolves current card detail in the streamlined shell (%s)", async (locale) => {
    await i18n.changeLanguage(locale);
    root = await renderAppAt(container, "/PAP/status/card-abc123");
    await waitForRoute(container, '[data-testid="status-page"]');

    expect(container.querySelector('[data-testid="status-page"]')?.textContent).toBe(
      "Status|/PAP/status/card-abc123|card-abc123",
    );
    expect(container.querySelector('[data-testid="streamlined-shell"]')).not.toBeNull();
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("resolves the current board and card routes in the $shell shell", async ({ shell, enabled }) => {
    await i18n.changeLanguage("en");
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableStatusCards: true });
    for (const [path, expected] of [
      ["/PAP/status", "Status|/PAP/status|"],
      ["/PAP/status/card-abc123", "Status|/PAP/status/card-abc123|card-abc123"],
    ]) {
      root = await renderAppAt(container, path);
      await waitForRoute(container, '[data-testid="status-page"]');
      expect(container.querySelector('[data-testid="status-page"]')?.textContent).toBe(expected);
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("redirects the prefixed and unprefixed legacy status-cards aliases in the $shell shell", async ({ shell, enabled }) => {
    await i18n.changeLanguage("en");
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableStatusCards: true });
    for (const [path, expected] of [
      ["/status", "Status|/PAP/status|"],
      ["/status/card-abc123", "Status|/PAP/status/card-abc123|card-abc123"],
      ["/PAP/status-cards/card-abc123", "Status|/PAP/status/card-abc123|card-abc123"],
      ["/status-cards/card-abc123", "Status|/PAP/status/card-abc123|card-abc123"],
      ["/PAP/status-cards", "Status|/PAP/status|"],
      ["/status-cards", "Status|/PAP/status|"],
    ]) {
      root = await renderAppAt(container, path);
      await waitForRoute(container, '[data-testid="status-page"]');
      expect(container.querySelector('[data-testid="status-page"]')?.textContent).toBe(expected);
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("blocks current and legacy status routes when the flag is off ($shell shell)", async ({ shell, enabled }) => {
    await i18n.changeLanguage("en");
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableStatusCards: false });
    for (const path of [
      "/PAP/status",
      "/PAP/status/card-abc123",
      "/status",
      "/status/card-abc123",
      "/PAP/status-cards",
      "/PAP/status-cards/card-abc123",
      "/status-cards",
      "/status-cards/card-abc123",
    ]) {
      root = await renderAppAt(container, path);
      await waitForRoute(container, '[data-testid="dashboard-page"]');
      expect(container.querySelector('[data-testid="status-page"]')).toBeNull();
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });
});
