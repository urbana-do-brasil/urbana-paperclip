import type { ProviderQuotaResult } from "@paperclipai/shared";
import { formatDateTime, formatNumber } from "../lib/utils";
import { useTranslation } from "../i18n";
import { QuotaBar } from "./QuotaBar";
import { quotaUnavailableMessage } from "../lib/quota-refresh";

export function AccountQuotaPanels({
  accounts,
  failed,
}: {
  accounts: ProviderQuotaResult[];
  failed?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <section
          className="space-y-2"
          key={account.accountKey ?? account.provider}
        >
          <p className="text-sm font-medium">
            {account.accountLabel ?? t("costs.quota.subscriptionAccount")}
          </p>
          {(failed || !account.ok) && (
            <p className="text-sm text-muted-foreground">
              {account.errorFamily === "credentials_unavailable"
                ? t("costs.quota.credentialsUnavailable")
                : quotaUnavailableMessage(account.windows.length > 0)}
            </p>
          )}
          {account.windows.length === 0 && account.ok && (
            <p className="text-sm text-muted-foreground">{t("costs.quota.noWindows")}</p>
          )}
          {account.windows.map((window, index) => window.usedPercent == null ? (
            <div key={`${window.label}:${index}`} className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span>{window.label}</span>
                <span className="font-mono text-muted-foreground">{window.valueLabel ?? t("costs.quota.usageNotReported")}</span>
              </div>
              {window.resetsAt && <p className="text-xs font-mono text-muted-foreground">{t("costs.quota.resetsAt", { date: formatDateTime(window.resetsAt, { includeYear: false, timeZoneName: "short" }) })}</p>}
            </div>
          ) : (
            <QuotaBar
              key={`${window.label}:${index}`}
              className="font-mono"
              label={window.label}
              percentUsed={window.usedPercent}
              leftLabel={
                window.valueLabel ??
                (window.usedPercent === null
                  ? t("costs.quota.usageNotReported")
                  : t("costs.quota.percentUsed", { percent: formatNumber(window.usedPercent) }))
              }
              rightLabel={
                window.resetsAt
                  ? t("costs.quota.resetsAt", { date: formatDateTime(window.resetsAt, { includeYear: false, timeZoneName: "short" }) })
                  : undefined
              }
            />
          ))}
          {account.capturedAt && (
            <p className="text-xs font-mono text-muted-foreground">
              {t("costs.quota.lastChecked", { date: formatDateTime(account.capturedAt, { includeYear: false, timeZoneName: "short" }) })}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
