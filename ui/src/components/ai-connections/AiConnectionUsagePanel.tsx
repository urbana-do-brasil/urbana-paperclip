import { useMutation } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import type { AiConnectionUsage, AiConnectionUsageLimit, AiManagedConnectionSummary } from "@paperclipai/shared";
import { supportsAiConnectionUsage } from "@paperclipai/shared";
import { aiConnectionsApi } from "@/api/ai-connections";
import { formatUiError } from "@/api/error-presentation";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { QuotaBar } from "@/components/QuotaBar";
import { formatDateTime, formatNumber } from "@/lib/utils";

const usageNumber = (value: number) => formatNumber(value, { maximumFractionDigits: 20 });
const amount = (value: number, unit: string | null) => unit === "USD"
  ? formatNumber(value, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 20 })
  : `${usageNumber(value)}${unit ? ` ${unit}` : ""}`;

function limitLabel(window: AiConnectionUsageLimit, t: TFunction) {
  const label = window.label;
  if (window.windowDurationSeconds == null) return label;
  const hours = window.windowDurationSeconds / 3600;
  const period = hours === 168 ? t("apps.aiConnectionPool.usage.values.weekly") : `${usageNumber(hours)}h`;
  if (hours === 168 && /\bweekly\b/i.test(label)) return label;
  if (label.split(/[\s·()]+/).includes(period)) return label;
  return `${label} · ${period}`;
}

function limitValue(window: AiConnectionUsageLimit, t: TFunction) {
  const values = "apps.aiConnectionPool.usage.values";
  if (window.used === 0 && window.limit === 0) return t(`${values}.cap`, { amount: amount(window.limit, window.unit) });
  if (window.used != null && window.limit != null) return t(`${values}.usedOf`, { used: amount(window.used, window.unit), limit: amount(window.limit, window.unit) });
  if (window.usedPercent != null) return t(`${values}.percentUsed`, { percent: usageNumber(window.usedPercent) });
  if (window.used != null) return t(`${values}.used`, { amount: amount(window.used, window.unit) });
  if (window.remainingPercent != null) return t(`${values}.percentLeft`, { percent: usageNumber(window.remainingPercent) });
  return t(`${values}.notReported`);
}

function limitDetails(window: AiConnectionUsageLimit, t: TFunction) {
  const values = "apps.aiConnectionPool.usage.values";
  const details: string[] = [];
  if (window.allowed === false) details.push(t(`${values}.blocked`));
  else if (window.limitReached === true) details.push(t(`${values}.limitReached`));
  if (window.allowed === true && (window.limitReached === true || window.usedPercent == null)) details.push(t(`${values}.usageAllowed`));
  if (window.used == null || window.limit == null) {
    if (window.remaining != null) details.push(t(`${values}.left`, { amount: amount(window.remaining, window.unit) }));
    if (window.limit != null) details.push(t(`${values}.cap`, { amount: amount(window.limit, window.unit) }));
  }
  if (window.resetsAt) details.push(t(`${values}.resets`, { when: formatDateTime(window.resetsAt, { includeYear: false }) }));
  else if (window.resetInterval) details.push(t(`${values}.resets`, { when: window.resetInterval }));
  return details.join(" · ");
}

function overageSummary(usage: AiConnectionUsage, t: TFunction) {
  const values = "apps.aiConnectionPool.usage.values";
  const overage = usage.overage!;
  const details = [overage.available === true ? t(`${values}.available`)
    : overage.enabled === false ? t(`${values}.off`)
    : overage.available === false ? (overage.enabled === true ? t(`${values}.onUnavailable`) : t(`${values}.unavailable`))
    : overage.enabled === true ? t(`${values}.onUnknown`) : t(`${values}.notReported`)];
  if (overage.unlimited === true) details.push(t(`${values}.unlimited`));
  else if (overage.balance != null && (overage.balance !== 0 || overage.enabled !== false)) details.push(amount(overage.balance, overage.unit));
  if (overage.remaining != null && (overage.remaining !== 0 || overage.enabled !== false)
    && !usage.limits.some((window) => window.scope === "overage" && window.remaining === overage.remaining && window.unit === overage.unit)) {
    details.push(t(`${values}.left`, { amount: amount(overage.remaining, overage.unit) }));
  }
  return details.join(" · ");
}

function usageError(usage: AiConnectionUsage, t: TFunction) {
  const errors = "apps.aiConnectionPool.usage.errors";
  switch (usage.errorCode) {
    case "authentication_required": return t(`${errors}.authenticationRequired`);
    case "permission_denied": return t(`${errors}.permissionDenied`);
    case "rate_limited": return t(`${errors}.rateLimited`);
    case "provider_unavailable": return t(`${errors}.providerUnavailable`);
    case "invalid_response": return t(`${errors}.invalidResponse`);
    case "connection_unavailable": return t(`${errors}.connectionUnavailable`);
    case "unsupported": return t(`${errors}.unsupported`);
    default: return usage.message ? t(`${errors}.unknown`, { detail: usage.message }) : t(`${errors}.unsupported`);
  }
}

export function AiConnectionUsagePanel({ account, observation, cachedOnly = false }: { account: AiManagedConnectionSummary; observation?: AiConnectionUsage; cachedOnly?: boolean }) {
  const { t } = useTranslation();
  const probe = useMutation({
    mutationFn: () => aiConnectionsApi.probeUsage(account.companyId, account.id, account.grantId),
  });
  const supported = supportsAiConnectionUsage(account.provider, account.method);
  const usage = cachedOnly ? observation : probe.isSuccess ? probe.data : undefined;
  return (
    <section aria-label={t("apps.aiConnectionPool.usage.section")} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t("apps.aiConnectionPool.usage.title")}</h3>
        {supported && !cachedOnly && <Button variant="outline" size="sm" disabled={probe.isPending || account.status !== "connected"} onClick={() => probe.mutate()}>
          {probe.isPending ? t("apps.aiConnectionPool.usage.checking") : usage?.status === "ok" ? t("apps.aiConnectionPool.usage.refresh") : t("apps.aiConnectionPool.usage.check")}
        </Button>}
      </div>
      {cachedOnly && !usage && <p className="text-xs text-muted-foreground">{t("apps.aiConnectionPool.usage.notObserved")}</p>}
      {!supported && <p className="text-xs text-muted-foreground">{t("apps.aiConnectionPool.usage.unavailableForMethod")}</p>}
      {probe.error && <p role="alert" className="text-sm text-destructive">{formatUiError(probe.error)}</p>}
      {usage && usage.status !== "ok" && <p role={usage.status === "unsupported" ? "status" : "alert"} className="text-sm text-muted-foreground">{usageError(usage, t)}</p>}
      {usage?.status === "ok" && (
        <div className="space-y-3" aria-live="polite">
          {usage.limits.length === 0 && <p className="text-xs text-muted-foreground">{t("apps.aiConnectionPool.usage.notReported")}</p>}
          {usage.limits.map((window) => {
            const details = limitDetails(window, t);
            return <div key={window.id} className="space-y-1.5">
              {window.usedPercent != null ? <QuotaBar label={limitLabel(window, t)} percentUsed={window.usedPercent} leftLabel={limitValue(window, t)} />
                : <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{limitLabel(window, t)}</span>
                  <span className="font-mono">{limitValue(window, t)}</span>
                </div>}
              {details && <p className="text-xs text-muted-foreground">{details}</p>}
            </div>;
          })}
          {usage.overage && <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{t("apps.aiConnectionPool.usage.values.overage")}</span>
            <span className="font-mono">{overageSummary(usage, t)}</span>
          </div>}
          <p className="text-xs text-muted-foreground">{t("apps.aiConnectionPool.usage.updated")} <time className="font-mono" dateTime={usage.checkedAt} title={formatDateTime(usage.checkedAt)}>{formatDateTime(usage.checkedAt, { includeYear: false })}</time>{usage.planType ? ` · ${usage.planType}` : ""}</p>
        </div>
      )}
    </section>
  );
}
