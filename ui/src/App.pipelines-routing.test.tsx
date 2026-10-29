// @vitest-environment jsdom

// Drive App's actual route table for pipeline pages and historical deep links.
// Route pages are sentinels so this guards registration, prefix redirects,
// rollout gates, and the real legacy item redirect without mounting data-heavy
// pipeline UI or making API requests.

import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    __appPipelinesRoutingPatched?: boolean;
  };
  if (!sheetProto.__appPipelinesRoutingPatched) {
    const original = sheetProto.insertRule;
    sheetProto.insertRule = function patched(this: CSSStyleSheet, rule: string, index?: number) {
      try {
        return original.call(this, rule, index);
      } catch {
        try {
          return original.call(this, ".app-pipelines-routing-noop{}", index);
        } catch {
          return this.cssRules?.length ?? 0;
        }
      }
    };
    sheetProto.__appPipelinesRoutingPatched = true;
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

// Keep Pipelines and its secondary route pages observable while preserving the
// production legacy redirect implementation itself.
vi.mock("./pages/Pipelines", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pages/Pipelines")>();
  const { useLocation: location, useParams: params } = await import("react-router-dom");
  const routeText = (name: string) => {
    const current = location();
    const routeParams = params<{ pipelineId?: string; caseId?: string }>();
    return <div data-testid="pipeline-page">{`${name}|${current.pathname}|${routeParams.pipelineId ?? ""}|${routeParams.caseId ?? ""}`}</div>;
  };
  return {
    ...actual,
    Pipelines: () => routeText("PIPELINES"),
    PipelineItemDetail: () => routeText("ITEM_DETAIL"),
    ReviewQueue: () => routeText("REVIEW_QUEUE"),
    Learnings: () => routeText("LEARNINGS"),
  };
});
vi.mock("./pages/PipelineSettings", async () => {
  const { useLocation, useParams } = await import("react-router-dom");
  return {
    PipelineSettings: () => {
      const { pathname } = useLocation();
      const { pipelineId } = useParams<{ pipelineId?: string }>();
      return <div data-testid="pipeline-page">SETTINGS|{pathname}|{pipelineId ?? ""}</div>;
    },
  };
});
vi.mock("./pages/Dashboard", () => ({ Dashboard: () => <div data-testid="dashboard-page">DASHBOARD</div> }));

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

describe("App Pipelines routing", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockSettings.getExperimental.mockResolvedValue({
      enableStreamlinedUi: true,
      enablePipelines: true,
      enableCases: true,
      enableStatusCards: true,
      enableCombinedInboxTasks: false,
    });
  });

  afterEach(() => {
    flushSync(() => root?.unmount());
    root = null;
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("resolves current pipeline pages in the $shell shell", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enablePipelines: true });
    const routes = [
      ["/PAP/pipelines", "PIPELINES|/PAP/pipelines||"],
      ["/PAP/pipelines/pipeline-1", "PIPELINES|/PAP/pipelines/pipeline-1|pipeline-1|"],
      ["/PAP/pipelines/pipeline-1/add", "PIPELINES|/PAP/pipelines/pipeline-1/add|pipeline-1|"],
      ["/PAP/pipelines/pipeline-1/settings", "SETTINGS|/PAP/pipelines/pipeline-1/settings|pipeline-1"],
      ["/PAP/pipelines/pipeline-1/items/item-1", "ITEM_DETAIL|/PAP/pipelines/pipeline-1/items/item-1|pipeline-1|item-1"],
      ["/PAP/review-queue", "REVIEW_QUEUE|/PAP/review-queue||"],
      ["/PAP/learnings", "LEARNINGS|/PAP/learnings||"],
    ];
    for (const [path, expected] of routes) {
      root = await renderAppAt(container, path);
      await waitForText(container, expected);
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("preserves prefixed and global legacy item URLs in the $shell shell", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enablePipelines: true });
    for (const path of [
      "/PAP/pipelines/pipeline-1/cases/item-1",
      "/pipelines/pipeline-1/cases/item-1",
    ]) {
      root = await renderAppAt(container, path);
      await waitForText(container, "ITEM_DETAIL|/PAP/pipelines/pipeline-1/items/item-1|pipeline-1|item-1");
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("redirects unprefixed current pipeline URLs using the active company prefix ($shell shell)", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enablePipelines: true });
    for (const [path, expected] of [
      ["/pipelines", "PIPELINES|/PAP/pipelines||"],
      ["/pipelines/pipeline-1", "PIPELINES|/PAP/pipelines/pipeline-1|pipeline-1|"],
      ["/pipelines/pipeline-1/add", "PIPELINES|/PAP/pipelines/pipeline-1/add|pipeline-1|"],
      ["/pipelines/pipeline-1/settings", "SETTINGS|/PAP/pipelines/pipeline-1/settings|pipeline-1"],
      ["/pipelines/pipeline-1/items/item-1", "ITEM_DETAIL|/PAP/pipelines/pipeline-1/items/item-1|pipeline-1|item-1"],
      ["/review-queue", "REVIEW_QUEUE|/PAP/review-queue||"],
      ["/learnings", "LEARNINGS|/PAP/learnings||"],
    ]) {
      root = await renderAppAt(container, path);
      await waitForText(container, expected);
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });

  it.each([
    { shell: "streamlined", enabled: true },
    { shell: "production", enabled: false },
  ])("blocks current and legacy pipeline paths when the feature flag is off ($shell shell)", async ({ shell, enabled }) => {
    mockSettings.getExperimental.mockResolvedValue({ enableStreamlinedUi: enabled, enablePipelines: false });
    for (const path of [
      "/PAP/pipelines",
      "/PAP/pipelines/pipeline-1",
      "/PAP/pipelines/pipeline-1/add",
      "/PAP/pipelines/pipeline-1/settings",
      "/PAP/pipelines/pipeline-1/items/item-1",
      "/PAP/pipelines/pipeline-1/cases/item-1",
      "/PAP/review-queue",
      "/PAP/learnings",
      "/pipelines",
      "/pipelines/pipeline-1",
      "/pipelines/pipeline-1/add",
      "/pipelines/pipeline-1/settings",
      "/pipelines/pipeline-1/items/item-1",
      "/pipelines/pipeline-1/cases/item-1",
      "/review-queue",
      "/learnings",
    ]) {
      root = await renderAppAt(container, path);
      await waitForText(container, "DASHBOARD");
      expect(container.querySelector("[data-testid='pipeline-page']")).toBeNull();
      expect(container.querySelector(`[data-testid="${shell}-shell"]`)).not.toBeNull();
      flushSync(() => root?.unmount());
      root = null;
    }
  });
});
