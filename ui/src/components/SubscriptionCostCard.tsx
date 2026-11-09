import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SUBSCRIPTION_CURRENCIES, centsToUsd, usdToCents, type SubscriptionAccountReport, type SubscriptionCostReport, type SubscriptionUsage } from "@paperclipai/shared";
import { intlLocale, resolveLocale } from "@paperclipai/shared/localization";
import { subscriptionsApi } from "../api/subscriptions";
import { formatCents, formatDateTime, formatNumber, formatTokens, providerDisplayName } from "../lib/utils";
import { i18n, useTranslation } from "../i18n";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function subscriptionMoney(cents: string, currency: string) {
  return currency === "USD" ? formatCents(Number(cents))
    : new Intl.NumberFormat(intlLocale(resolveLocale(i18n.resolvedLanguage ?? i18n.language)), { style: "currency", currency, currencyDisplay: "code" }).format(Number(cents) / 100);
}

export function SubscriptionTokenUsage({ usage }: { usage: SubscriptionUsage }) {
  const { t } = useTranslation();
  return <span className="font-mono text-xs text-muted-foreground">
    {t("costs.subscriptions.inputOutput", {
      input: formatTokens(usage.inputTokens + usage.cachedInputTokens),
      output: formatTokens(usage.outputTokens),
    })}
    {usage.cachedInputTokens > 0 && <span className="block">{t("costs.subscriptions.cachedInput", { displayCount: formatTokens(usage.cachedInputTokens) })}</span>}
  </span>;
}

function SubscriptionEditor({ account, accounts, companyId, onDone }: {
  account: SubscriptionAccountReport; accounts: SubscriptionAccountReport[]; companyId: string; onDone: () => void;
}) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState(account.price.plan);
  const [amount, setAmount] = useState(account.price.amountCents == null ? "" : centsToUsd(account.price.amountCents).replace(/\.?0+$/, ""));
  const [currency, setCurrency] = useState(account.price.currency);
  const [cadence, setCadence] = useState(account.price.cadence);
  const [status, setStatus] = useState(account.price.status);
  const [targetId, setTargetId] = useState("");
  const save = useMutation({ mutationFn: () => subscriptionsApi.update(companyId, account.id, {
    expectedRevision: account.price.revision, plan, amountCents: amount.trim() ? usdToCents(amount.trim()) : null,
    currency: currency as typeof SUBSCRIPTION_CURRENCIES[number], cadence, status,
  }), onSuccess: onDone });
  const link = useMutation({ mutationFn: () => subscriptionsApi.link(companyId, account.id, targetId, account.price.revision,
    accounts.find(row => row.id === targetId)!.price.revision), onSuccess: onDone });
  const targets = accounts.filter(row => row.id !== account.id && row.provider === account.provider && row.canEdit);
  const busy = save.isPending || link.isPending;
  const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return <div className="space-y-5">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="subscription-plan">{t("costs.subscriptions.editor.plan")}</Label><Input id="subscription-plan" value={plan} onChange={event => setPlan(event.target.value)} required maxLength={100} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="subscription-price">{t("costs.subscriptions.editor.pricePerPeriod")}</Label><Input id="subscription-price" type="number" min="0" step="any" value={amount} placeholder={t("costs.subscriptions.editor.unknownPrice")} onChange={event => setAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="subscription-currency">{t("costs.subscriptions.editor.currency")}</Label><select id="subscription-currency" className={selectClass} value={currency} onChange={event => setCurrency(event.target.value)}>{SUBSCRIPTION_CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="subscription-cadence">{t("costs.subscriptions.editor.billed")}</Label><select id="subscription-cadence" className={selectClass} value={cadence} onChange={event => setCadence(event.target.value as typeof cadence)}><option value="month">{t("costs.subscriptions.editor.monthly")}</option><option value="year">{t("costs.subscriptions.editor.annually")}</option></select></div>
        <div className="space-y-2"><Label htmlFor="subscription-status">{t("costs.subscriptions.editor.tracking")}</Label><select id="subscription-status" className={selectClass} value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="active">{t("costs.subscriptions.editor.active")}</option><option value="ended">{t("costs.subscriptions.editor.subscriptionEnded")}</option><option value="excluded">{t("costs.subscriptions.editor.excludeOrganization")}</option></select></div>
      </div>
      <p className="text-xs text-muted-foreground">{t("costs.subscriptions.editor.instructions")}</p>
      {save.error && <p role="alert" className="text-sm text-destructive">{t("costs.subscriptions.editor.saveError")}</p>}
      <div className="flex items-center justify-between"><Button type="button" variant="ghost" disabled={busy} onClick={onDone}>{t("costs.subscriptions.editor.cancel")}</Button><Button type="submit" disabled={busy}>{save.isPending ? t("costs.subscriptions.editor.saving") : t("costs.subscriptions.editor.savePrice")}</Button></div>
    </form>
    {targets.length > 0 && <div className="space-y-2 border-t border-border pt-4">
      <Label htmlFor="subscription-link">{t("costs.subscriptions.editor.linkLabel")}</Label>
      <select id="subscription-link" className={selectClass} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">{t("costs.subscriptions.editor.chooseAccount")}</option>{targets.map(row => <option key={row.id} value={row.id}>{row.name} · {row.price.plan}</option>)}</select>
      <p className="text-xs text-muted-foreground">{t("costs.subscriptions.editor.linkInstructions")}</p>
      {link.error && <p role="alert" className="text-sm text-destructive">{t("costs.subscriptions.editor.linkError")}</p>}
      <Button type="button" variant="outline" disabled={!targetId || busy} onClick={() => link.mutate()}>{t("costs.subscriptions.editor.linkAccounts")}</Button>
    </div>}
  </div>;
}

export function SubscriptionCostCard({ companyId, report, error, onChanged }: {
  companyId: string; report?: SubscriptionCostReport; error?: unknown; onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionAccountReport | null>(null);
  const closeEditor = () => { setEditing(null); onChanged(); };
  const known = report?.monthlyTotals.length;
  const estimatedCount = report?.monthlyTotals.reduce((sum, total) => sum + total.estimatedCount, 0) ?? 0;
  return <>
    <Card className="block p-4">
      <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("costs.subscriptions.title")}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {known ? report!.monthlyTotals.map(total => <div key={total.currency}>{subscriptionMoney(total.amountCents, total.currency)}<span className="text-sm font-normal">{t("costs.subscriptions.perMonth")}</span></div>) : report && report.activeCount === 0 && report.accounts.length > 0 ? <>{subscriptionMoney("0", "USD")}{t("costs.subscriptions.perMonth")}</> : "—"}
      </div>
      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
        {report ? <>
          {estimatedCount > 0 && <div><Badge variant="outline" className="font-normal text-muted-foreground">{t(estimatedCount < report.activeCount - report.unknownPriceCount ? "costs.estimates.partiallyEstimated" : "costs.estimates.estimated")}</Badge></div>}
          {report.unknownPriceCount > 0 && !!known && <div>{t("costs.subscriptions.knownMonthlySubtotal")}</div>}
          <div>{report.accounts.length === 0
            ? t("costs.subscriptions.noVisibleSubscriptions")
            : <>{t("costs.subscriptions.activeCount", { count: report.activeCount, displayCount: formatNumber(report.activeCount) })}{report.unknownPriceCount > 0 && ` · ${t("costs.subscriptions.unknownPriceCount", { count: report.unknownPriceCount, displayCount: formatNumber(report.unknownPriceCount) })}`}</>}</div>
          {report.accounts.length > 0 && <div>{t("costs.subscriptions.visibleAccountFees")}</div>}
          {report.unidentifiedAccountCount > 0 && <div>{t("costs.subscriptions.unconfirmedIdentityCount", { count: report.unidentifiedAccountCount, displayCount: formatNumber(report.unidentifiedAccountCount) })}</div>}
          <SubscriptionTokenUsage usage={report.subscription} />
        </> : error ? <div>{t("costs.subscriptions.unavailable")}</div> : <div>{t("costs.subscriptions.loading")}</div>}
        {report && error ? <div>{t("costs.subscriptions.lastLoaded")}</div> : null}
      </div>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen(true)} disabled={!report}>{t("costs.subscriptions.viewDetails")}</Button>
    </Card>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setEditing(null); }}>
      <DialogContent className="max-h-(--sz-80vh) overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? t("costs.subscriptions.editor.title") : t("costs.subscriptions.title")}</DialogTitle><DialogDescription>{t("costs.subscriptions.dialogDescription")}</DialogDescription></DialogHeader>
        {editing ? <SubscriptionEditor key={editing.id} companyId={companyId} account={editing} accounts={report?.accounts ?? []} onDone={closeEditor} /> : <div className="space-y-4">
          {report?.accounts.length === 0 && <p className="text-sm text-muted-foreground">{t("costs.subscriptions.dialogEmpty")}</p>}
          {report?.accounts.map(account => <div key={account.id} className="space-y-2 border-b border-border pb-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-medium">{account.name}</div><div className="text-xs text-muted-foreground">{account.shared ? t("costs.subscriptions.shared") : account.ownerName ?? (account.ownerUserId ? t("costs.subscriptions.accountOwner") : t("costs.subscriptions.personalAccounts"))} · {providerDisplayName(account.provider)} · {account.price.plan}</div></div>
              <div className="text-right"><div className="font-mono">{account.price.status !== "active" ? account.price.status === "ended" ? t("costs.subscriptions.status.ended") : t("costs.subscriptions.status.excluded") : account.price.monthlyCents == null ? t("costs.subscriptions.status.priceUnknown") : `${subscriptionMoney(account.price.monthlyCents, account.price.currency)}${t("costs.subscriptions.perMonth")}`}</div><div className="text-xs text-muted-foreground">{account.price.source === "catalog" ? t("costs.subscriptions.estimatedBeforeTax") : account.price.source === "user" ? t("costs.subscriptions.userSupplied") : ""}{account.price.cadence === "year" ? ` · ${t("costs.subscriptions.annualPaymentDivided")}` : ""}</div></div>
            </div>
            <SubscriptionTokenUsage usage={account.usage} />
            {Number(account.usage.costCents) > 0 && <div className="text-xs text-muted-foreground">{t("costs.subscriptions.recordedUsage", { amount: formatCents(Number(account.usage.costCents)) })}</div>}
            {account.agents.length > 0 && <div className="text-xs text-muted-foreground">{t("costs.subscriptions.usedBy", { agents: account.agents.map(agent => agent.name).join(", ") })}</div>}
            {!account.identityVerified && <p className="text-xs text-muted-foreground">{t("costs.subscriptions.identityUnconfirmed")}</p>}
            {account.observedAt && <div className="text-xs text-muted-foreground">{t("costs.subscriptions.planChecked", { date: formatDateTime(account.observedAt) })}{account.refreshStatus === "unavailable" ? ` · ${t("costs.subscriptions.latestCheckUnavailable")}` : ""}</div>}
            {account.refreshStatus === "unavailable" && !account.observedAt && <p className="text-xs text-muted-foreground">{t("costs.subscriptions.providerPlanUnavailable")}</p>}
            {account.canEdit && <div><Button variant="outline" size="sm" onClick={() => setEditing(account)}>{t("costs.subscriptions.editPrice")}</Button></div>}
          </div>)}
          {!!report?.unattributedSubscription.eventCount && <p className="text-xs text-muted-foreground">{t("costs.subscriptions.unattributedUsage")}</p>}
          <p className="text-xs text-muted-foreground">{t("costs.subscriptions.monthlyFeesExplanation")}</p>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
