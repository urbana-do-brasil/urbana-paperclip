// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { decisionModelsApi } from "@/api/decision-models";
import type { DecisionResult } from "@paperclipai/shared";
import { DecisionModelSettingsSection, DecisionModelSettingsView } from "./DecisionModelSettings";
import { choices, configured, result } from "../../../storybook/stories/decision-models/fixtures";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { i18n } from "@/i18n";

vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-storybook" }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

it("consumes an added connection once and preserves a later choice across refetches", async () => {
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container), onSave = vi.fn();
  const settings = { ...configured, allowBackground: false };
  const render = (refreshed = false) => <MemoryRouter><DecisionModelSettingsView settings={{ ...settings }}
    choices={choices.map(row => ({ ...row, name: refreshed ? `${row.name} refreshed` : row.name }))}
    newlyConnectedId={choices[0]!.id} onSave={onSave} onTest={vi.fn()} onAdd={vi.fn()} /></MemoryRouter>;
  try {
    await act(async () => root.render(render()));
    await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent?.includes("Company OpenRouter"))!.click());
    await act(async () => root.render(render(true)));
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toContain("Company OpenRouter refreshed");
    await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "Save decision model")!.click());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ connectionId: choices[1]!.id, grantId: choices[1]!.grantId, allowBackground: false }));
  } finally { act(() => root.unmount()); container.remove(); }
});

it("clears test feedback when another manager changes the saved configuration", async () => {
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const key = ["decision-model", configured.companyId];
  client.setQueryData(key, { canManage: true, settings: configured, choices });
  const test = vi.spyOn(decisionModelsApi, "test").mockResolvedValue(result);
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter>
      <DecisionModelSettingsSection companyId={configured.companyId} />
    </MemoryRouter></QueryClientProvider>));
    await act(async () => {
      [...container.querySelectorAll("button")].find(button => button.textContent === "Run test")!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(container.textContent).toContain("Decision model is working");
    await act(async () => {
      client.setQueryData(key, { canManage: true, settings: { ...configured, enabled: false }, choices });
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(container.textContent).not.toContain("Decision model is working");
    await act(async () => {
      client.setQueryData(key, { canManage: true, settings: configured, choices });
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(container.textContent).not.toContain("Decision model is working");
  } finally { act(() => root.unmount()); client.clear(); test.mockRestore(); container.remove(); }
});

it("localizes decision settings while retaining provider, model and connection names", async () => {
  await i18n.changeLanguage("pt-BR");
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter><DecisionModelSettingsView
      settings={configured} choices={choices} onSave={vi.fn()} onTest={vi.fn()} onAdd={vi.fn()}
    /></MemoryRouter>));
    expect(container.textContent).toContain("Modelo de decisão");
    expect(container.textContent).toContain("Ver uso");
    expect(container.textContent).toContain("Company OpenAI");
    expect(container.textContent).toContain("gpt-6-luna · Conectada");
    expect(container.textContent).toContain("Ativar decisões");
    expect(container.textContent).toContain("Executar teste");
  } finally { act(() => root.unmount()); container.remove(); }
});

it("translates owned decision failure codes and preserves provider error details", async () => {
  await i18n.changeLanguage("pt-BR");
  const container = document.createElement("div"); document.body.appendChild(container);
  const root = createRoot(container);
  const failure: DecisionResult = {
    status: "failed", invocationId: "failure-fixture", errorCode: "provider_auth_failed",
    usage: { inputTokens: 1, outputTokens: 0, costCents: "0", costStatus: "estimated" },
  };
  try {
    await act(async () => root.render(<MemoryRouter><DecisionModelSettingsView
      settings={configured} choices={choices} result={failure} error="Detalhe original do provedor"
      onSave={vi.fn()} onTest={vi.fn()} onAdd={vi.fn()}
    /></MemoryRouter>));
    expect(container.textContent).toContain("O provedor rejeitou a conexão. Reconecte-a e tente novamente.");
    expect(container.textContent).toContain("Detalhe original do provedor");
  } finally { act(() => root.unmount()); container.remove(); }
});
