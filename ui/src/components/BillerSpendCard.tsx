import { useMemo } from "react";
import type { CostByBiller, CostByProviderModel } from "@paperclipai/shared";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuotaBar } from "./QuotaBar";
import { formatCents, formatNumber, formatTokens, providerDisplayName } from "@/lib/utils";

interface BillerSpendCardProps {
  row: CostByBiller;
  weekSpendCents: number;
  budgetMonthlyCents: number;
  /** Only compare a current-month report with the monthly budget. */
  showBudgetUtilization?: boolean;
  totalCompanySpendCents: number;
  providerRows: CostByProviderModel[];
  weekSpendError?: boolean;
  providerBreakdownLoading?: boolean;
  providerBreakdownError?: boolean;
}

export function BillerSpendCard({
  row,
  weekSpendCents,
  budgetMonthlyCents,
  showBudgetUtilization = true,
  totalCompanySpendCents,
  providerRows,
  weekSpendError = false,
  providerBreakdownLoading = false,
  providerBreakdownError = false,
}: BillerSpendCardProps) {
  const { t } = useTranslation();
  const providerBreakdown = useMemo(() => {
    const map = new Map<string, { provider: string; costCents: number; inputTokens: number; outputTokens: number }>();
    for (const entry of providerRows) {
      const current = map.get(entry.provider) ?? {
        provider: entry.provider,
        costCents: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      current.costCents += entry.costCents;
      current.inputTokens += entry.inputTokens + entry.cachedInputTokens;
      current.outputTokens += entry.outputTokens;
      map.set(entry.provider, current);
    }
    return Array.from(map.values()).sort((a, b) => b.costCents - a.costCents);
  }, [providerRows]);

  const billingTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of providerRows) {
      map.set(entry.billingType, (map.get(entry.billingType) ?? 0) + entry.costCents);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [providerRows]);

  const providerBudgetShare = budgetMonthlyCents;
  const budgetPct =
    providerBudgetShare > 0
      ? Math.min(100, (row.costCents / providerBudgetShare) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-0 gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">
              {providerDisplayName(row.biller)}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t("costs.billers.inputOutput", { input: formatTokens(row.inputTokens + row.cachedInputTokens), output: formatTokens(row.outputTokens) })}
              {" · "}
              {t("costs.billers.providerCount", { count: row.providerCount, displayCount: formatNumber(row.providerCount) })}
              {" · "}
              {t("costs.billers.modelCount", { count: row.modelCount, displayCount: formatNumber(row.modelCount) })}
            </CardDescription>
          </div>
          <span className="text-xl font-bold tabular-nums shrink-0">
            {formatCents(row.costCents)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-3 space-y-4">
        {showBudgetUtilization && budgetMonthlyCents > 0 && (
          <QuotaBar
            label={t("costs.providers.periodSpend")}
            percentUsed={budgetPct}
            leftLabel={formatCents(row.costCents)}
            rightLabel={t("costs.providers.companyBudgetPercent", { percent: formatNumber(Math.round(budgetPct)) })}
          />
        )}

        <div className="text-xs text-muted-foreground">
          {t("costs.billers.meteredRuns", { count: row.apiRunCount, displayCount: formatNumber(row.apiRunCount) })}
          {" · "}
          {t("costs.billers.subscriptionRuns", { count: row.subscriptionRunCount, displayCount: formatNumber(row.subscriptionRunCount) })}
          {" · "}
          {t("costs.billers.weekSpend", { amount: formatCents(weekSpendCents) })}
        </div>
        {weekSpendError ? <p role="status" className="text-xs text-muted-foreground">{t("costs.billers.weekSpendUnavailable")}</p> : null}

        {billingTypeBreakdown.length > 0 && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("costs.billers.billingTypes")}
              </p>
              <div className="space-y-1.5">
                {billingTypeBreakdown.map(([billingType, costCents]) => (
                  <div key={billingType} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{t(`costs.details.billingTypes.${billingType}`)}</span>
                    <span className="font-medium tabular-nums">{formatCents(costCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {providerBreakdown.length > 0 ? (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("costs.billers.upstreamProviders")}
              </p>
              <div className="space-y-1.5">
                {providerBreakdown.map((entry) => (
                  <div key={entry.provider} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{providerDisplayName(entry.provider)}</span>
                    <div className="text-right tabular-nums">
                      <div className="font-medium">{formatCents(entry.costCents)}</div>
                      <div className="text-muted-foreground">
                        {t("costs.providers.windowTokens", { count: formatTokens(entry.inputTokens + entry.outputTokens) })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("costs.billers.upstreamProviders")}</p>
            <p role={providerBreakdownError ? "status" : undefined} className="text-xs text-muted-foreground">
              {providerBreakdownLoading
                ? t("costs.billers.providerBreakdownLoading")
                : providerBreakdownError
                  ? t("costs.billers.providerBreakdownUnavailable")
                  : t("costs.billers.noUpstreamProviders")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
