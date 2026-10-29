// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, useTranslation } from "@/i18n";
import { CasesExperimentalGate } from "./CasesExperimentalGate";

const mockSettings = vi.hoisted(() => ({ getExperimental: vi.fn() }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: mockSettings }));
vi.mock("@/lib/router", () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-testid="navigate" data-to={to} data-replace={String(replace ?? false)} />
  ),
}));

function Content() {
  const { t } = useTranslation();
  return <div data-testid="case-content">{t("navigation.cases")}</div>;
}

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

describe("CasesExperimentalGate", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let previousLanguage = "pt-BR";
  beforeAll(() => { previousLanguage = i18n.language; });
  afterAll(async () => { await i18n.changeLanguage(previousLanguage); });
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

  async function renderGate() {
    root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => root!.render(<QueryClientProvider client={client}><CasesExperimentalGate><Content /></CasesExperimentalGate></QueryClientProvider>));
    await flush();
  }

  it.each([["pt-BR", "Casos"], ["en", "Cases"]])("renders enabled routes in %s", async (locale, expected) => {
    await i18n.changeLanguage(locale);
    mockSettings.getExperimental.mockResolvedValue({ enableCases: true });
    await renderGate();
    expect(container.querySelector('[data-testid="case-content"]')?.textContent).toBe(expected);
    expect(container.querySelector('[data-testid="navigate"]')).toBeNull();
  });

  it.each(["pt-BR", "en"])("redirects disabled or unavailable settings in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    mockSettings.getExperimental.mockResolvedValue({ enableCases: false });
    await renderGate();
    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-to")).toBe("/dashboard");
    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-replace")).toBe("true");
    expect(container.querySelector('[data-testid="case-content"]')).toBeNull();
  });

  it("redirects when experimental settings cannot be read", async () => {
    mockSettings.getExperimental.mockRejectedValue(new Error("forbidden"));
    await renderGate();
    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-to")).toBe("/dashboard");
    expect(container.querySelector('[data-testid="case-content"]')).toBeNull();
  });

  it("hides content and redirect while settings are loading", async () => {
    mockSettings.getExperimental.mockImplementation(() => new Promise(() => {}));
    await renderGate();
    expect(container.querySelector('[data-testid="navigate"]')).toBeNull();
    expect(container.querySelector('[data-testid="case-content"]')).toBeNull();
  });
});
