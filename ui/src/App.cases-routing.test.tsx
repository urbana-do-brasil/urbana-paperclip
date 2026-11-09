// @vitest-environment jsdom

// Regression guard for PAP-13002: the experimental Cases UI emits *unprefixed*
// links (`/cases`, `/cases/:id`) — the same global-unprefixed pattern Pipelines
// uses. Those only resolve if `cases` and `cases/:caseIdentifier` are registered
// as reserved unprefixed redirect routes in <App>; otherwise the first path
// segment is parsed as a company prefix ("CASES") and the page 404s with
// "No company matches prefix". This drives the real <App> route table so a
// future removal of those redirect routes fails loudly.

import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mockSettings = vi.hoisted(() => ({ getExperimental: vi.fn() }));
vi.mock("./api/instanceSettings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/instanceSettings")>();
  return { ...actual, instanceSettingsApi: { ...actual.instanceSettingsApi, getExperimental: mockSettings.getExperimental } };
});

// jsdom's CSS parser rejects the custom-property marker rule stitches inserts
// (`--sxs{--sxs:N}`), pulled into <App>'s eager import graph transitively via
// @codesandbox/sandpack-react. Substitute a benign, valid rule on parse failure
// so stitches' index bookkeeping stays intact and the module graph evaluates.
// (sandpack itself is never exercised by the routing under test.)
vi.hoisted(() => {
  const sheetProto = window.CSSStyleSheet.prototype as unknown as {
    insertRule: (rule: string, index?: number) => number;
    __pap13002Patched?: boolean;
  };
  if (!sheetProto.__pap13002Patched) {
    const original = sheetProto.insertRule;
    sheetProto.insertRule = function patched(this: CSSStyleSheet, rule: string, index?: number) {
      try {
        return original.call(this, rule, index);
      } catch {
        try {
          return original.call(this, ".pap13002-noop{}", index);
        } catch {
          return this.cssRules?.length ?? 0;
        }
      }
    };
    sheetProto.__pap13002Patched = true;
  }
});

// Real Layout renders the full authenticated shell (sidebar, data queries) and
// owns the "No company matches prefix" NotFound. For routing we only need it to
// resolve the :companyPrefix segment and render its nested routes.
vi.mock("./components/Layout", async () => {
  const { Outlet } = await import("react-router-dom");
  return { Layout: () => <div data-testid="streamlined-shell"><Outlet /></div> };
});
vi.mock("./components/Layout.production", async () => {
  const { Outlet } = await import("react-router-dom");
  return { Layout: () => <div data-testid="production-shell"><Outlet /></div> };
});

// Rendered by <App> outside <Routes> and needs DialogProvider; irrelevant here.
vi.mock("./components/OnboardingWizardVariant", () => ({
  OnboardingWizardVariant: () => null,
}));

// Sentinel pages so we can assert *which* route resolved.
vi.mock("./pages/Cases", () => ({
  Cases: () => {
    const { pathname } = useLocation();
    return <div>CASES_LIST_PAGE@{pathname}</div>;
  },
}));
vi.mock("./pages/CaseDetail", () => ({
  CaseDetail: () => {
    const { pathname } = useLocation();
    return <div>CASE_DETAIL_PAGE@{pathname}</div>;
  },
}));
vi.mock("./pages/Dashboard", () => ({ Dashboard: () => <div>DASHBOARD_PAGE</div> }));

// Cloud access is unrelated to the route-table regression. Let it fall through
// synchronously so this test does not poll its three query transitions.
vi.mock("./components/CloudAccessGate", async () => {
  const { Outlet } = await import("react-router-dom");
  return { CloudAccessGate: () => <Outlet /> };
});

// The prefix resolver + redirect logic both read the active company.
const PAP_COMPANY = {
  id: "company-1",
  name: "Paperclip",
  issuePrefix: "PAP",
  status: "active",
};
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
  flushSync(() => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return root;
}

/**
 * Waits on the condition, not on a fixed number of turns. The previous version
 * yielded at most three macrotasks before asserting, which is ample on an idle
 * machine and not when the suite is running many workers in parallel — the
 * container was still empty and the assertion failed on a route that resolves
 * perfectly well. `vi.waitFor` retries against a time budget instead, so a
 * loaded worker gets more turns rather than a failure.
 *
 * The same fix #11499 applied to the sibling `App.activity-routing.test.tsx`,
 * which had the identical loop with five turns instead of three.
 */
async function waitForRoute(container: HTMLElement, text: string) {
  await vi.waitFor(() => expect(container.textContent).toContain(text));
}

describe("App Cases routing (PAP-13002)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: true, enableCases: true });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("resolves current list and detail routes in the $shell shell", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableCases: true });
    const listRoot = await renderAppAt(container, "/PAP/cases");
    await waitForRoute(container, "CASES_LIST_PAGE@/PAP/cases");
    expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
    flushSync(() => listRoot.unmount());

    const detailRoot = await renderAppAt(container, "/PAP/cases/PAP-C7");
    await waitForRoute(container, "CASE_DETAIL_PAGE@/PAP/cases/PAP-C7");
    expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
    flushSync(() => detailRoot.unmount());
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("redirects unprefixed case list and identifier routes in the $shell shell", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableCases: true });
    const listRoot = await renderAppAt(container, "/cases");
    await waitForRoute(container, "CASES_LIST_PAGE@/PAP/cases");
    expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
    expect(container.textContent).not.toContain("No organization matches prefix");
    flushSync(() => listRoot.unmount());

    const detailRoot = await renderAppAt(container, "/cases/PAP-C7");
    await waitForRoute(container, "CASE_DETAIL_PAGE@/PAP/cases/PAP-C7");
    expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
    flushSync(() => detailRoot.unmount());
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("blocks direct and unprefixed routes when cases is off ($shell shell)", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enableCases: false });
    for (const path of ["/PAP/cases", "/PAP/cases/PAP-C7", "/cases", "/cases/PAP-C7"]) {
      const root = await renderAppAt(container, path);
      await waitForRoute(container, "DASHBOARD_PAGE");
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      expect(container.textContent).not.toContain("CASES_LIST_PAGE");
      expect(container.textContent).not.toContain("CASE_DETAIL_PAGE");
      flushSync(() => root.unmount());
    }
  });

  it("blocks a direct case route when settings cannot be read", async () => {
    mockSettings.getExperimental.mockRejectedValue(new Error("forbidden"));
    const root = await renderAppAt(container, "/PAP/cases/PAP-C7");
    await waitForRoute(container, "DASHBOARD_PAGE");
    expect(container.textContent).not.toContain("CASE_DETAIL_PAGE");
    flushSync(() => root.unmount());
  });
});
