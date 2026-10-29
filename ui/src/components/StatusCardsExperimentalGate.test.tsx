// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, useTranslation } from "@/i18n";
import { StatusCardsExperimentalGate } from "./StatusCardsExperimentalGate";

const mockSettings = vi.hoisted(() => ({ getExperimental: vi.fn() }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: mockSettings }));
vi.mock("@/lib/router", () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-testid="navigate" data-to={to} data-replace={String(replace ?? false)} />
  ),
}));

function StatusRouteContent({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  return <div data-testid="status-route-content">{t("navigation.status")} · {cardId}</div>;
}

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

describe("StatusCardsExperimentalGate", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  afterAll(async () => { await i18n.changeLanguage("en"); });
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

  async function renderGate(cardId = "card-123") {
    root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => root!.render(
      <QueryClientProvider client={client}>
        <StatusCardsExperimentalGate>
          <StatusRouteContent cardId={cardId} />
        </StatusCardsExperimentalGate>
      </QueryClientProvider>,
    ));
    await flush();
  }

  it.each([["pt-BR", "Status · card-123"], ["en", "Status · card-123"]])(
    "renders an enabled status-card route in %s and keeps the card ID",
    async (locale, expected) => {
      await i18n.changeLanguage(locale);
      mockSettings.getExperimental.mockResolvedValue({ enableStatusCards: true, enableSummaries: true });
      await renderGate();

      expect(container.querySelector('[data-testid="status-route-content"]')?.textContent).toBe(expected);
      expect(container.querySelector('[data-testid="navigate"]')).toBeNull();
    },
  );

  it.each(["pt-BR", "en"])("redirects a disabled status-card route in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    mockSettings.getExperimental.mockResolvedValue({ enableStatusCards: false, enableSummaries: true });
    await renderGate();

    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-to")).toBe("/dashboard");
    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-replace")).toBe("true");
    expect(container.querySelector('[data-testid="status-route-content"]')).toBeNull();
  });

  it("waits without exposing the route while experimental settings load", async () => {
    mockSettings.getExperimental.mockImplementation(() => new Promise(() => {}));
    await renderGate();

    expect(container.querySelector('[data-testid="navigate"]')).toBeNull();
    expect(container.querySelector('[data-testid="status-route-content"]')).toBeNull();
  });

  it.each(["pt-BR", "en"])("fails closed to the dashboard if settings fail to load in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    mockSettings.getExperimental.mockRejectedValue(new Error("settings unavailable"));
    await renderGate();

    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-to")).toBe("/dashboard");
    expect(container.querySelector('[data-testid="status-route-content"]')).toBeNull();
  });
});
