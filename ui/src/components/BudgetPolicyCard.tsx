import { centsToUsd, usdToCents } from "@paperclipai/shared";
import { useEffect, useId, useState } from "react";
import type { BudgetPolicySummary } from "@paperclipai/shared";
import { AlertTriangle, PauseCircle, ShieldAlert, Wallet } from "lucide-react";
import { cn, formatCents, formatNumber } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";

function centsInputValue(value: number) {
  return formatNumber(value / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

function normalizeDecimalInput(value: string) {
  const normalized = value.trim();
  if (normalized.includes(",") && normalized.includes(".")) return null;
  return normalized.replace(",", ".");
}

function parseDollarInput(value: string) {
  const normalized = normalizeDecimalInput(value);
  if (normalized === null) return null;
  if (normalized.length === 0) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function statusTone(status: BudgetPolicySummary["status"]) {
  if (status === "hard_stop") return "text-red-700 dark:text-red-300 border-red-500/30 bg-red-500/10";
  if (status === "warning") return "text-amber-700 dark:text-amber-200 border-amber-500/30 bg-amber-500/10";
  return "text-emerald-700 dark:text-emerald-200 border-emerald-500/30 bg-emerald-500/10";
}

export function BudgetPolicyCard({
  summary,
  onSave,
  onUnpricedUsagePolicyChange,
  onReservationChange,
  isSaving,
  compact = false,
  variant = "card",
}: {
  summary: BudgetPolicySummary;
  onSave?: (amountCents: number) => void;
  onReservationChange?: (cents: string) => void;
  onUnpricedUsagePolicyChange?: (policy: "block" | "allow") => void;
  isSaving?: boolean;
  compact?: boolean;
  variant?: "card" | "plain";
}) {
  const { t, i18n } = useTranslation();
  const [draftBudget, setDraftBudget] = useState(centsInputValue(summary.amount));

  useEffect(() => {
    setDraftBudget(centsInputValue(summary.amount));
  }, [summary.amount]);

  const decimalSeparator = i18n.language === "pt-BR" ? "," : ".";
  const editableReservationValue = (value: string | number) => centsToUsd(value).replace(".", decimalSeparator);
  const [reservation, setReservation] = useState(editableReservationValue(summary.reservationCents ?? 0));
  const reservationErrorId = useId();
  useEffect(() => setReservation(editableReservationValue(summary.reservationCents ?? 0)), [summary.reservationCents]);
  let reservationCents: string | null = null;
  try {
    const normalizedReservation = normalizeDecimalInput(reservation);
    if (normalizedReservation !== null && !normalizedReservation.startsWith("-")) reservationCents = usdToCents(normalizedReservation);
  } catch { /* Shown as invalid input below. */ }
  const scopeTypeLabel = summary.scopeType === "company"
    ? t("budgetPolicy.scopeTypes.company")
    : summary.scopeType === "agent"
      ? t("budgetPolicy.scopeTypes.agent")
      : summary.scopeType === "project"
        ? t("budgetPolicy.scopeTypes.project")
        : summary.scopeType;
  const pauseReasonLabel = summary.pauseReason === "manual"
    ? t("budgetPolicy.pauseReasons.manual")
    : summary.pauseReason === "budget"
      ? t("budgetPolicy.pauseReasons.budget")
      : summary.pauseReason === "system"
        ? t("budgetPolicy.pauseReasons.system")
        : summary.pauseReason === "company_archived"
          ? t("budgetPolicy.pauseReasons.companyArchived")
          : summary.pauseReason === "import"
            ? t("budgetPolicy.pauseReasons.import")
            : summary.pauseReason;
  const windowLabel = summary.windowKind === "lifetime"
    ? t("budgetPolicy.windows.lifetime")
    : t("budgetPolicy.windows.calendarMonthUtc");
  const statusLabel = summary.paused
    ? t("budgetPolicy.status.paused")
    : summary.status === "warning"
      ? t("budgetPolicy.status.warning")
      : summary.status === "hard_stop"
        ? t("budgetPolicy.status.hardStop")
        : t("budgetPolicy.status.healthy");
  const reservationSection = onReservationChange ? <div className="space-y-2">
    <label className="text-sm">{t("budgetPolicy.reservation.label")}
      <Input aria-label={t("budgetPolicy.reservation.label")} aria-invalid={reservationCents === null} aria-describedby={reservationCents === null ? reservationErrorId : undefined}
        value={reservation} onChange={event => setReservation(event.target.value)} inputMode="decimal" />
    </label>
    {reservationCents === null && <p id={reservationErrorId} role="alert" className="text-xs text-destructive">{t("budgetPolicy.reservation.invalid")}</p>}
    <p className="text-xs text-muted-foreground">{t("budgetPolicy.reservation.help")}</p>
    <Button variant="outline" disabled={isSaving || reservationCents === null || reservationCents === (summary.reservationCents ?? "0.0000000")}
      onClick={() => { if (reservationCents !== null) onReservationChange(reservationCents); }}>{t("budgetPolicy.reservation.update")}</Button>
  </div> : null;

  const advancedSettings = onReservationChange || onUnpricedUsagePolicyChange ? (
    <details className="space-y-3">
      <summary className="cursor-pointer text-sm font-medium">{t("budgetPolicy.advancedSettings")}</summary>
      <div className="space-y-4">
        {onUnpricedUsagePolicyChange && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={summary.unpricedUsagePolicy !== "allow"} disabled={isSaving}
              onChange={(event) => onUnpricedUsagePolicyChange(event.target.checked ? "block" : "allow")} />
            {t("budgetPolicy.blockUnpricedUsage")}
          </label>
        )}
        {reservationSection}
      </div>
    </details>
  ) : null;

  const parsedDraft = parseDollarInput(draftBudget);
  const canSave = typeof parsedDraft === "number" && parsedDraft !== summary.amount && Boolean(onSave);
  const progress = summary.amount > 0 ? Math.min(100, summary.utilizationPercent) : 0;
  const StatusIcon = summary.status === "hard_stop" ? ShieldAlert : summary.status === "warning" ? AlertTriangle : Wallet;
  const isPlain = variant === "plain";

  const observedBudgetGrid = isPlain ? (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">{t("budgetPolicy.observed")}</div>
        <div className="mt-2 text-xl font-semibold tabular-nums">{formatCents(summary.observedAmount)}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {summary.amount > 0 ? t("budgetPolicy.percentOfLimit", { percent: summary.utilizationPercent }) : t("budgetPolicy.noCapConfigured")}
        </div>
      </div>
      <div>
        <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">{t("budgetPolicy.budget")}</div>
        <div className="mt-2 text-xl font-semibold tabular-nums">
          {summary.amount > 0 ? formatCents(summary.amount) : t("budgetPolicy.disabled")}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("budgetPolicy.softAlertAt", { percent: summary.warnPercent })}{summary.paused && pauseReasonLabel ? ` · ${t("budgetPolicy.pausedFor", { reason: pauseReasonLabel })}` : ""}
        </div>
      </div>
    </div>
  ) : (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border/70 bg-black/[0.18] px-4 py-3">
        <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">{t("budgetPolicy.observed")}</div>
        <div className="mt-2 text-xl font-semibold tabular-nums">{formatCents(summary.observedAmount)}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {summary.amount > 0 ? t("budgetPolicy.percentOfLimit", { percent: summary.utilizationPercent }) : t("budgetPolicy.noCapConfigured")}
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-black/[0.18] px-4 py-3">
        <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">{t("budgetPolicy.budget")}</div>
        <div className="mt-2 text-xl font-semibold tabular-nums">
          {summary.amount > 0 ? formatCents(summary.amount) : t("budgetPolicy.disabled")}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("budgetPolicy.softAlertAt", { percent: summary.warnPercent })}{summary.paused && pauseReasonLabel ? ` · ${t("budgetPolicy.pausedFor", { reason: pauseReasonLabel })}` : ""}
        </div>
      </div>
    </div>
  );

  const progressSection = (
    <div className="space-y-2">
      {summary.pendingRunCount > 0 && <p className="text-sm text-destructive">{t("budgetPolicy.pendingRuns", { count: summary.pendingRunCount })}</p>}
      {summary.unpricedEventCount > 0 && (
        <p className="text-sm text-destructive">{t("budgetPolicy.unpricedEvents", { count: summary.unpricedEventCount })}</p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("budgetPolicy.remaining")}</span>
        <span>{summary.amount > 0 ? formatCents(summary.remainingAmount) : t("budgetPolicy.unlimited")}</span>
      </div>
      <div className={cn("h-2 overflow-hidden rounded-full", isPlain ? "bg-border/70" : "bg-muted/70")}>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("budgetPolicy.utilizationAria", { percent: Math.round(progress) })}
          className={cn(
            "h-full rounded-full transition-(--tp-width-background-color) duration-200",
            summary.status === "hard_stop"
              ? "bg-(--status-task-blocked)"
              : summary.status === "warning"
                ? "bg-(--status-task-todo)"
                : "bg-(--status-task-done)",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  const pausedPane = summary.paused ? (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-900 dark:text-red-100">
      <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {summary.scopeType === "project"
          ? t("budgetPolicy.projectPausedDescription")
          : t("budgetPolicy.scopePausedDescription")}
      </div>
    </div>
  ) : null;

  const saveSection = onSave ? (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", isPlain ? "" : "rounded-xl border border-border/70 bg-background/50 p-3")}>
      <div className="min-w-0 flex-1">
        <label className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">
          {t("budgetPolicy.amountLabel")}
        </label>
        <Input
          aria-label={t("budgetPolicy.amountLabel")}
          value={draftBudget}
          onChange={(event) => setDraftBudget(event.target.value)}
          className="mt-2"
          inputMode="decimal"
          placeholder={t("budgetPolicy.amountPlaceholder")}
        />
      </div>
      <Button
        onClick={() => {
          if (typeof parsedDraft === "number" && onSave) onSave(parsedDraft);
        }}
        disabled={!canSave || isSaving || parsedDraft === null}
      >
        {isSaving ? t("budgetPolicy.saving") : summary.amount > 0 ? t("budgetPolicy.updateBudget") : t("budgetPolicy.setBudget")}
      </Button>
    </div>
  ) : null;

  if (isPlain) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">
              {scopeTypeLabel}
            </div>
            <div className="mt-2 text-xl font-semibold">{summary.scopeName}</div>
            <div className="mt-2 text-sm text-muted-foreground">{windowLabel}</div>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 text-(length:--text-micro) uppercase tracking-(--tracking-caps)",
              summary.status === "hard_stop"
                ? "text-red-700 dark:text-red-300"
                : summary.status === "warning"
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-muted-foreground",
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusLabel}
          </div>
        </div>

        {observedBudgetGrid}
        {progressSection}
        {pausedPane}
        {saveSection}
        {advancedSettings}
        {parsedDraft === null ? (
          <p className="text-xs text-destructive">{t("budgetPolicy.invalidAmount")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-border/70 bg-card/80", compact ? "" : "shadow-(--shadow-extract-2)")}>
      <CardHeader className={cn("gap-3", compact ? "px-4 pt-4 pb-2" : "px-5 pt-5 pb-3")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">
              {scopeTypeLabel}
            </div>
            <CardTitle className="mt-1 text-base">{summary.scopeName}</CardTitle>
            <CardDescription className="mt-1">{windowLabel}</CardDescription>
          </div>
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-(length:--text-micro) uppercase tracking-(--tracking-caps)", statusTone(summary.status))}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusLabel}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact ? "px-4 pb-4 pt-0" : "px-5 pb-5 pt-0")}>
        {observedBudgetGrid}
        {progressSection}
        {pausedPane}
        {saveSection}
        {advancedSettings}
        {parsedDraft === null ? (
          <p className="text-xs text-destructive">{t("budgetPolicy.invalidAmount")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
