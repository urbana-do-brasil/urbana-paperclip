// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CostByBiller, CostByProviderModel, CostWindowSpendRow, ProviderQuotaResult, QuotaWindow } from "@paperclipai/shared";
import { BillerSpendCard } from "./BillerSpendCard";
import { AccountQuotaPanels } from "./AccountQuotaPanels";
import { ClaudeSubscriptionPanel } from "./ClaudeSubscriptionPanel";
import { CodexSubscriptionPanel } from "./CodexSubscriptionPanel";
import { ProviderQuotaCard } from "./ProviderQuotaCard";
import { i18n } from "../i18n";

const quotaWindow: QuotaWindow = {
  label: "5h",
  usedPercent: 75.5,
  resetsAt: "2026-10-29T12:00:00.000Z",
  valueLabel: null,
  detail: null,
};

const providerRow: CostByProviderModel = {
  provider: "anthropic",
  biller: "anthropic",
  billingType: "metered_api",
  model: "claude-sonnet-4-5",
  costCents: 250,
  inputTokens: 100,
  cachedInputTokens: 20,
  outputTokens: 30,
  apiRunCount: 2,
  subscriptionRunCount: 1,
  subscriptionCachedInputTokens: 5,
  subscriptionInputTokens: 25,
  subscriptionOutputTokens: 10,
};

const windowSpend: CostWindowSpendRow = {
  provider: "anthropic",
  biller: "anthropic",
  window: "5h",
  windowHours: 5,
  costCents: 50,
  inputTokens: 10,
  cachedInputTokens: 2,
  outputTokens: 4,
};

const providerQuota: ProviderQuotaResult = {
  provider: "anthropic",
  accountKey: "connection-1",
  source: "anthropic-oauth",
  capturedAt: "2026-10-29T11:00:00.000Z",
  ok: true,
  windows: [quotaWindow],
};

const billerRow: CostByBiller = {
  biller: "openai",
  costCents: 1250,
  inputTokens: 100,
  cachedInputTokens: 20,
  outputTokens: 40,
  apiRunCount: 2,
  subscriptionRunCount: 1,
  subscriptionCachedInputTokens: 0,
  subscriptionInputTokens: 0,
  subscriptionOutputTokens: 0,
  providerCount: 1,
  modelCount: 2,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("provider and biller cost localization", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    act(() => root?.unmount());
    host.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes provider spend and quota while preserving provider values and window labels", async () => {
    const account: ProviderQuotaResult = { ...providerQuota };
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
      root.render(
        <ProviderQuotaCard
          provider="anthropic"
          rows={[providerRow]}
          budgetMonthlyCents={10_000}
          totalCompanySpendCents={250}
          weekSpendCents={100}
          windowRows={[windowSpend]}
          showDeficitNotch={false}
          quotaAccounts={[account]}
        />,
      );
    });

    expect(host.textContent).toContain("Anthropic");
    expect(host.textContent).toContain("120 tokens de entrada · 30 tokens de saída");
    expect(host.textContent).toContain("~2 execuções da API / ~1 execução por assinatura");
    expect(host.textContent).toContain("Gasto no período");
    expect(host.textContent).toContain("Janelas móveis");
    expect(host.textContent).toContain("5h");
    expect(host.textContent).toContain("Assinatura");
    expect(host.textContent).toContain("API por uso");
    expect(host.textContent).toContain("Cota da assinatura");
    expect(host.textContent).toContain("Conta de assinatura");
    expect(host.textContent).toContain("Uso: 75,5%");
    expect(host.textContent).toContain("Redefinição em");
    expect(host.textContent).toContain("Última verificação:");
    expect(host.textContent).toContain("claude-sonnet-4-5");

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("Period spend");
    expect(host.textContent).toContain("Rolling windows");
    expect(host.textContent).toContain("Subscription quota");
    expect(host.textContent).toContain("Subscription account");
    expect(host.textContent).toContain("75.5% used");
    expect(host.textContent).toContain("Resets");
    expect(host.textContent).toContain("Last checked");
    expect(host.textContent).toContain("Metered API");
  });

  it("localizes biller counts, billing groups, provider details, and unavailable weekly data", async () => {
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
      root.render(
        <BillerSpendCard
          row={billerRow}
          weekSpendCents={300}
          budgetMonthlyCents={10_000}
          totalCompanySpendCents={1_250}
          providerRows={[{ ...providerRow, provider: "openai", biller: "openai" }]}
          weekSpendError
        />,
      );
    });

    expect(host.textContent).toContain("150 tokens");
    expect(host.textContent).toContain("1 provedor");
    expect(host.textContent).toContain("2 modelos");
    expect(host.textContent).toContain("2 execuções por uso");
    expect(host.textContent).toContain("1 execução por assinatura");
    expect(host.textContent).toContain("Tipos de cobrança");
    expect(host.textContent).toContain("Provedores de origem");
    expect(host.textContent).toContain("O gasto por faturador desta semana está indisponível.");
    expect(host.textContent).toContain("OpenAI");

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("Billing types");
    expect(host.textContent).toContain("Upstream providers");
    expect(host.textContent).toContain("2 metered runs");
    expect(host.textContent).toContain("1 subscription run");
    expect(host.textContent).toContain("This week’s biller spend is unavailable.");
  });

  it("localizes Anthropic and Codex quota panels and preserves provider window labels", async () => {
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
      root.render(
        <div>
          <ClaudeSubscriptionPanel windows={[quotaWindow]} source="anthropic-oauth" />
          <CodexSubscriptionPanel windows={[{ ...quotaWindow, label: "5h limit" }, { ...quotaWindow, label: "GPT-5 weekly limit" }]} source="codex-rpc" />
        </div>,
      );
    });

    expect(host.textContent).toContain("Assinatura da Anthropic");
    expect(host.textContent).toContain("Cota da assinatura Claude conectada a este servidor.");
    expect(host.textContent).toContain("Assinatura do Codex");
    expect(host.textContent).toContain("Limites da conta");
    expect(host.textContent).toContain("Limites por modelo");
    expect(host.textContent).toContain("5h limit");
    expect(host.textContent).toContain("GPT-5 weekly limit");
    expect(host.textContent).toContain("Uso: 75,5%");

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("Anthropic subscription");
    expect(host.textContent).toContain("Codex subscription");
    expect(host.textContent).toContain("Account windows");
    expect(host.textContent).toContain("Model windows");
  });

  it("localizes unavailable quota states without exposing provider errors", async () => {
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
      root.render(
        <div>
          <ClaudeSubscriptionPanel windows={[]} error="private provider diagnostics" />
          <CodexSubscriptionPanel windows={[]} error="private provider diagnostics" />
          <ProviderQuotaCard
            provider="openai"
            rows={[{ ...providerRow, provider: "openai", biller: "openai" }]}
            budgetMonthlyCents={0}
            totalCompanySpendCents={250}
            weekSpendCents={0}
            windowRows={[]}
            windowError
            weekSpendError
            showDeficitNotch={false}
            quotaAccounts={[]}
            quotaError="private provider diagnostics"
            quotaSource="openai-api"
          />
        </div>,
      );
    });

    expect(host.textContent).toContain("A cota da assinatura está indisponível.");
    expect(host.textContent).toContain("Não foi possível carregar o uso das janelas móveis.");
    expect(host.textContent).toContain("O gasto por provedor desta semana está indisponível.");
    expect(host.textContent).not.toContain("private provider diagnostics");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("Subscription quota is currently unavailable.");
    expect(host.textContent).toContain("Rolling-window usage could not be loaded.");
  });

  it("localizes quota empty, reconnect, and last-available states", async () => {
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
      root.render(
        <div>
          <AccountQuotaPanels accounts={[{ ...providerQuota, windows: [] }]} />
          <AccountQuotaPanels accounts={[{
            ...providerQuota,
            ok: false,
            errorFamily: "credentials_unavailable",
            windows: [],
          }]} />
          <ClaudeSubscriptionPanel windows={[quotaWindow]} error="private provider diagnostics" />
        </div>,
      );
    });

    expect(host.textContent).toContain("O provedor não informou janelas de cota.");
    expect(host.textContent).toContain("Conecte ou reconecte uma assinatura em Conexões de IA para ver a cota.");
    expect(host.textContent).toContain("Exibindo a última cota disponível.");
    expect(host.textContent).not.toContain("private provider diagnostics");

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("No quota windows were reported.");
    expect(host.textContent).toContain("Connect or reconnect a subscription in AI connections");
    expect(host.textContent).toContain("Showing the last available quota.");
  });
});
