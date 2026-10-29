// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusCardsExperimentalGate } from "./StatusCardsExperimentalGate";
import { StatusCardsLegacyRedirect } from "./StatusCardsLegacyRedirect";

const mockSettings = vi.hoisted(() => ({ getExperimental: vi.fn() }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: mockSettings }));
vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompany: null }),
}));

function StatusPage() {
  const { pathname } = useLocation();
  const { cardId } = useParams<{ cardId?: string }>();
  return (
    <div
      data-testid="status-route"
      data-path={pathname}
      data-card-id={cardId ?? ""}
    />
  );
}

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

describe("Status Cards legacy route redirects", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => {
    flushSync(() => root?.unmount());
    root = null;
    container.remove();
    vi.clearAllMocks();
  });

  async function renderAt(path: string) {
    root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => root!.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/:companyPrefix/status-cards" element={<StatusCardsLegacyRedirect />} />
            <Route path="/:companyPrefix/status-cards/:cardId" element={<StatusCardsLegacyRedirect />} />
            <Route
              path="/:companyPrefix/status"
              element={<StatusCardsExperimentalGate><StatusPage /></StatusCardsExperimentalGate>}
            />
            <Route
              path="/:companyPrefix/status/:cardId"
              element={<StatusCardsExperimentalGate><StatusPage /></StatusCardsExperimentalGate>}
            />
            <Route path="/:companyPrefix/dashboard" element={<div data-testid="dashboard-route" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    await flush();
  }

  it("keeps the company prefix and card ID through the legacy redirect and enabled route", async () => {
    mockSettings.getExperimental.mockResolvedValue({ enableStatusCards: true });
    await renderAt("/PAP/status-cards/card-abc123");

    const route = container.querySelector<HTMLElement>('[data-testid="status-route"]');
    expect(route?.getAttribute("data-path")).toBe("/PAP/status/card-abc123");
    expect(route?.getAttribute("data-card-id")).toBe("card-abc123");
  });

  it("redirects the legacy card URL to the dashboard when the feature is off", async () => {
    mockSettings.getExperimental.mockResolvedValue({ enableStatusCards: false });
    await renderAt("/PAP/status-cards/card-abc123");

    expect(container.querySelector('[data-testid="dashboard-route"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="status-route"]')).toBeNull();
  });
});
