import { useId, useState } from "react";
import type { BudgetIncident } from "@paperclipai/shared";
import { AlertOctagon, ArrowUpRight, PauseCircle } from "lucide-react";
import { formatCents, formatNumber } from "../lib/utils";
import { useTranslation } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function centsInputValue(value: number) {
  return formatNumber(value / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

function parseDollarInput(value: string) {
  const normalized = value.trim();
  if (normalized.includes(",") && normalized.includes(".")) return null;
  const parsed = Number(normalized.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function BudgetIncidentCard({
  incident,
  onRaiseAndResume,
  onKeepPaused,
  isMutating,
}: {
  incident: BudgetIncident;
  onRaiseAndResume: (amountCents: number) => void;
  onKeepPaused: () => void;
  isMutating?: boolean;
}) {
  const { t } = useTranslation();
  const [draftAmount, setDraftAmount] = useState(
    centsInputValue(Math.max(incident.amountObserved + 1000, incident.amountLimit)),
  );
  const budgetInputId = useId();
  const parsed = parseDollarInput(draftAmount);
  const stateLabel = incident.status === "resolved"
    ? t("budgetPolicy.incidents.status.resolved")
    : incident.status === "dismissed"
      ? t("budgetPolicy.incidents.status.dismissed")
      : incident.approvalStatus === "revision_requested"
        ? t("budgetPolicy.incidents.status.escalated")
        : incident.approvalStatus === "pending"
          ? t("budgetPolicy.incidents.status.pendingApproval")
          : t("budgetPolicy.incidents.status.open");

  return (
    <Card className="overflow-hidden border-red-500/20 bg-(image:--gradient-extract-4)">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-red-700/90 dark:text-red-200/80">
                {t("budgetPolicy.incidents.hardStopTitle", { scope: t(`budgetPolicy.scopeTypes.${incident.scopeType}`) })}
              </div>
              <Badge variant={incident.status === "resolved" ? "outline" : "secondary"}>
                {stateLabel}
              </Badge>
            </div>
            <CardTitle className="mt-1 text-base text-red-950 dark:text-red-50">{incident.scopeName}</CardTitle>
            <CardDescription className="mt-1 text-red-900/75 dark:text-red-100/70">
              {incident.thresholdType === "hard" && incident.amountObserved < incident.amountLimit
                ? t("budgetPolicy.incidents.accountingIncomplete", { amount: formatCents(incident.amountObserved) })
                : t("budgetPolicy.incidents.spendLimitReached", {
                  observed: formatCents(incident.amountObserved),
                  limit: formatCents(incident.amountLimit),
                })}
            </CardDescription>
          </div>
          <div className="rounded-full border border-red-400/30 bg-red-500/10 p-2 text-red-600 dark:text-red-200">
            <AlertOctagon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-950/90 dark:text-red-50/90">
          <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {incident.scopeType === "project"
              ? t("budgetPolicy.incidents.projectPaused")
              : t("budgetPolicy.incidents.scopePaused")}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <label htmlFor={budgetInputId} className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">
            {t("budgetPolicy.incidents.newBudget")}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Input
              id={budgetInputId}
              aria-label={t("budgetPolicy.incidents.newBudget")}
              value={draftAmount}
              onChange={(event) => setDraftAmount(event.target.value)}
              inputMode="decimal"
              placeholder={t("budgetPolicy.amountPlaceholder")}
            />
            <Button
              className="gap-2"
              disabled={isMutating || parsed === null || parsed <= incident.amountObserved}
              onClick={() => {
                if (typeof parsed === "number") onRaiseAndResume(parsed);
              }}
            >
              <ArrowUpRight className="h-4 w-4" />
              {isMutating ? t("budgetPolicy.incidents.applying") : t("budgetPolicy.incidents.raiseBudgetAndResume")}
            </Button>
          </div>
          {parsed !== null && parsed <= incident.amountObserved ? (
            <p className="mt-2 text-xs text-red-700 dark:text-red-200/80">
              {t("budgetPolicy.incidents.mustExceedSpend")}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" className="text-muted-foreground" disabled={isMutating} onClick={onKeepPaused}>
            {t("budgetPolicy.incidents.keepPaused")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
