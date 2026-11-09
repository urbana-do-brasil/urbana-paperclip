// @vitest-environment jsdom

// Drive App's actual routine and activity route tree in both shell modes. The
// routine pages and feed rows are sentinels so the assertions cover route
// selection, prefixes, scope handoff, and locale without booting data-heavy UI.

import { act, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, useTranslation } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { App } from "./App";

const mockSettings = vi.hoisted(() => ({ getExperimental: vi.fn() }));
vi.mock("./api/instanceSettings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/instanceSettings")>();
  return { ...actual, instanceSettingsApi: { ...actual.instanceSettingsApi, getExperimental: mockSettings.getExperimental } };
});

// jsdom rejects Stitches' marker rule from App's eager import graph. Keep its
// stylesheet bookkeeping intact using a valid fallback rule.
vi.hoisted(() => {
  const sheetProto = window.CSSStyleSheet.prototype as unknown as {
    insertRule: (rule: string, index?: number) => number;
    __appRoutinesRoutingPatched?: boolean;
  };
  if (!sheetProto.__appRoutinesRoutingPatched) {
    const original = sheetProto.insertRule;
    sheetProto.insertRule = function patched(this: CSSStyleSheet, rule: string, index?: number) {
      try {
        return original.call(this, rule, index);
      } catch {
        try {
          return original.call(this, ".app-routines-routing-noop{}", index);
        } catch {
          return this.cssRules?.length ?? 0;
        }
      }
    };
    sheetProto.__appRoutinesRoutingPatched = true;
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
vi.mock("./context/BreadcrumbContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context/BreadcrumbContext")>();
  return { ...actual, useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) };
});

vi.mock("./pages/Routines", () => ({
  Routines: () => {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    return <div data-testid="routine-page">STREAMLINED_LIST|{pathname}|{t("routines.list.title")}</div>;
  },
}));
vi.mock("./pages/Routines.production", () => ({
  Routines: () => {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    return <div data-testid="routine-page">PRODUCTION_LIST|{pathname}|{t("routines.list.title")}</div>;
  },
}));
vi.mock("./pages/RoutineDetail", () => ({
  RoutineDetail: () => {
    const { pathname } = useLocation();
    const { routineId, section } = useParams<{ routineId?: string; section?: string }>();
    const { t } = useTranslation();
    return <div data-testid="routine-page">{`STREAMLINED_DETAIL|${pathname}|${routineId ?? ""}|${section ?? ""}|${t("routines.detail.sections.activity")}`}</div>;
  },
}));
vi.mock("./pages/RoutineDetail.production", () => ({
  RoutineDetail: () => {
    const { pathname } = useLocation();
    const { routineId, section } = useParams<{ routineId?: string; section?: string }>();
    const { t } = useTranslation();
    return <div data-testid="routine-page">{`PRODUCTION_DETAIL|${pathname}|${routineId ?? ""}|${section ?? ""}|${t("routines.detail.sections.activity")}`}</div>;
  },
}));
vi.mock("./pages/Dashboard", () => ({ Dashboard: () => <div>DASHBOARD_PAGE</div> }));

// Make App's selected activity path visible while retaining the real
// CompanyActivity, AuditHub, and production CompanyActivity components.
vi.mock("./pages/audit/AuditFeed", () => ({ AuditFeed: () => <div data-testid="generic-audit-feed">GENERIC_STREAMLINED_AUDIT</div> }));
vi.mock("./pages/audit/AuditFeed.production", () => ({ AuditFeed: () => <div data-testid="generic-audit-feed">GENERIC_PRODUCTION_AUDIT</div> }));
vi.mock("./components/PageTabBar", () => ({
  PageTabBar: ({ items, value }: { items: Array<{ value: string; label: string }>; value: string }) => (
    <div data-testid="audit-tabs">{items.map((item) => `${item.value}:${item.label}`).join("|")}@{value}</div>
  ),
}));
vi.mock("./pages/audit/RoutineAuditActivity", () => ({
  RoutineAuditActivity: ({ companyId, routineId }: { companyId: string; routineId: string }) => {
    const { t } = useTranslation();
    return <div data-testid="routine-audit-feed">{`${companyId}|${routineId}|${t("auditHub.routineActivityTitle")}`}</div>;
  },
}));
vi.mock("./pages/Costs", () => ({ Costs: () => null }));
vi.mock("./pages/Timeline", () => ({ Timeline: () => null }));
vi.mock("./pages/audit/AuditRuns", () => ({ AuditRuns: () => null }));

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

async function waitForText(container: HTMLElement, text: string) {
  await vi.waitFor(() => expect(container.textContent).toContain(text));
}

describe("App Routines routing", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(async () => {
    await act(async () => { await i18n.changeLanguage("en"); });
    container = document.createElement("div");
    document.body.appendChild(container);
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: true, enableCombinedInboxTasks: false });
  });

  afterAll(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  afterEach(() => {
    flushSync(() => root?.unmount());
    root = null;
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it.each([
    { locale: "en", label: "Routines", activity: "Activity" },
    { locale: "pt-BR", label: "Rotinas", activity: "Atividade" },
  ])("selects the real App routine routes in the streamlined shell ($locale)", async ({ locale, label, activity }) => {
    await act(async () => { await i18n.changeLanguage(locale); });
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: true, enableCombinedInboxTasks: false });
    for (const [path, expected] of [
      ["/PAP/routines", `STREAMLINED_LIST|/PAP/routines|${label}`],
      ["/PAP/routines/routine-1", `STREAMLINED_DETAIL|/PAP/routines/routine-1|routine-1||${activity}`],
      ["/PAP/routines/routine-1/activity", `STREAMLINED_DETAIL|/PAP/routines/routine-1/activity|routine-1|activity|${activity}`],
      ["/routines", `STREAMLINED_LIST|/PAP/routines|${label}`],
      ["/routines/routine-1", `STREAMLINED_DETAIL|/PAP/routines/routine-1|routine-1||${activity}`],
    ]) {
      root = await renderAppAt(container, path);
      await waitForText(container, expected);
      expect(container.querySelector('[data-testid="streamlined-shell"]')).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { locale: "en", label: "Routines", activity: "Activity" },
    { locale: "pt-BR", label: "Rotinas", activity: "Atividade" },
  ])("selects the production App routine routes in the production shell ($locale)", async ({ locale, label, activity }) => {
    await act(async () => { await i18n.changeLanguage(locale); });
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: false, enableCombinedInboxTasks: false });
    for (const [path, expected] of [
      ["/PAP/routines", `PRODUCTION_LIST|/PAP/routines|${label}`],
      ["/PAP/routines/routine-1", `PRODUCTION_DETAIL|/PAP/routines/routine-1|routine-1||${activity}`],
      ["/PAP/routines/routine-1/activity", `PRODUCTION_DETAIL|/PAP/routines/routine-1/activity|routine-1|activity|${activity}`],
      ["/routines", `PRODUCTION_LIST|/PAP/routines|${label}`],
      ["/routines/routine-1", `PRODUCTION_DETAIL|/PAP/routines/routine-1|routine-1||${activity}`],
    ]) {
      root = await renderAppAt(container, path);
      await waitForText(container, expected);
      expect(container.querySelector('[data-testid="production-shell"]')).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { locale: "en", title: "Routine activity" },
    { locale: "pt-BR", title: "Atividade da rotina" },
  ])("keeps a routine-scoped audit link usable in both shells ($locale)", async ({ locale, title }) => {
    await act(async () => { await i18n.changeLanguage(locale); });
    for (const shell of [
      { name: "streamlined", enabled: true },
      { name: "production", enabled: false },
    ]) {
      mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: shell.enabled, enableCombinedInboxTasks: false });
      root = await renderAppAt(container, "/PAP/activity?entityType=routine&entityId=routine-1");
      await waitForText(container, `company-1|routine-1|${title}`);
      expect(container.querySelector('[data-testid="routine-audit-feed"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="generic-audit-feed"]')).toBeNull();
      expect(container.querySelector(`[data-testid="${shell.name}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it("keeps the company-wide feed for activity URLs without a complete routine scope", async () => {
    for (const enabled of [true, false]) {
      mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableCombinedInboxTasks: false });
      for (const path of ["/PAP/activity", "/PAP/activity?entityType=routine"]) {
        root = await renderAppAt(container, path);
        await waitForText(container, enabled ? "GENERIC_STREAMLINED_AUDIT" : "GENERIC_PRODUCTION_AUDIT");
        expect(container.querySelector('[data-testid="routine-audit-feed"]')).toBeNull();
        flushSync(() => root?.unmount());
        root = null;
      }
    }
  });
});
