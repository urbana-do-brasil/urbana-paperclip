import type { ReactNode } from "react";
import type {
  ToolRiskLevel,
  ToolConnectionHealthStatus,
  ToolPolicyDecision,
} from "@paperclipai/shared";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError } from "@/api/client";
import { useTranslation } from "@/i18n";

/** Risk classification badge for a catalog tool. */
export function RiskBadge({ risk, labels }: { risk: ToolRiskLevel | null | undefined; labels?: Partial<Record<ToolRiskLevel | "unknown", string>> }) {
  const { t } = useTranslation();
  if (!risk) return <Badge variant="outline">{labels?.unknown ?? t("toolsAdmin.common.riskLevels.unknown")}</Badge>;
  const variant =
    risk === "high" || risk === "critical"
      ? "destructive"
      : risk === "medium"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{labels?.[risk] ?? t(`toolsAdmin.common.riskLevels.${risk}`)}</Badge>;
}

/** Read/Write/Destructive capability chips. */
export function CapabilityBadges({
  isReadOnly,
  isWrite,
  isDestructive,
  labels,
}: {
  isReadOnly?: boolean;
  isWrite?: boolean;
  isDestructive?: boolean;
  labels?: Partial<Record<"readOnly" | "write" | "destructive", string>>;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex flex-wrap gap-1">
      {isReadOnly ? <Badge variant="outline">{labels?.readOnly ?? t("toolsAdmin.common.capabilities.read")}</Badge> : null}
      {isWrite ? <Badge variant="secondary">{labels?.write ?? t("toolsAdmin.common.capabilities.write")}</Badge> : null}
      {isDestructive ? <Badge variant="destructive">{labels?.destructive ?? t("toolsAdmin.common.capabilities.destructive")}</Badge> : null}
    </span>
  );
}

/** Catalog quarantine marker — canonical status key. */
export function QuarantineBadge() {
  const { t } = useTranslation();
  return <StatusBadge status="quarantined" label={t("toolsAdmin.common.quarantined")} />;
}

function healthToStatusKey(status: string): string {
  switch (status) {
    case "healthy":
    case "ok":
    case "":
      return "healthy";
    case "degraded":
    case "warning":
      return "degraded";
    case "error":
    case "unhealthy":
    case "critical":
      return "runtime-error";
    case "unchecked":
    case "unknown":
      return "unchecked";
    default:
      return status;
  }
}

/** Connection / runtime health badge, mapped onto canonical status colors. */
export function HealthBadge({
  status,
  label,
}: {
  status: ToolConnectionHealthStatus | string | null | undefined;
  label?: string;
}) {
  const { t } = useTranslation();
  const raw = (status ?? "unknown").toString();
  const key = healthToStatusKey(raw);
  const labelKey = key === "healthy" ? "healthy" : key === "degraded" ? "degraded" : key === "runtime-error" ? "error" : key === "unchecked" ? "unchecked" : null;
  return <StatusBadge status={key} label={label ?? (labelKey ? t(`toolsAdmin.common.health.${labelKey}`) : raw)} />;
}

function decisionToStatusKey(decision: string): { key: string; labelKey: string | null } {
  switch (decision) {
    case "allow":
    case "allowed":
      return { key: "allowed", labelKey: "allowed" };
    case "deny":
    case "denied":
      return { key: "denied", labelKey: "denied" };
    case "block":
      return { key: "block", labelKey: "block" };
    case "require_approval":
    case "requires_approval":
      return { key: "require-approval", labelKey: "requireApproval" };
    case "redact":
    case "redacted":
      return { key: "redacted", labelKey: "redacted" };
    case "rate_limited":
      return { key: "rate-limit", labelKey: "rateLimited" };
    case "defer":
    case "deferred":
      return { key: "deferred", labelKey: "deferred" };
    case "hidden":
      return { key: "hidden", labelKey: "hidden" };
    default:
      return { key: decision, labelKey: null };
  }
}

/** Policy/gateway decision badge — canonical status colors. */
export function DecisionBadge({ decision }: { decision: ToolPolicyDecision | string | null | undefined }) {
  const { t } = useTranslation();
  if (!decision) return <Badge variant="outline">—</Badge>;
  const { key, labelKey } = decisionToStatusKey(decision.toString());
  const label = labelKey ? t(`toolsAdmin.common.decisions.${labelKey}`) : decision.toString();
  return <StatusBadge status={key} label={label} />;
}

/** Compact relative time, falling back to absolute. */
export function RelativeTime({ value }: { value: Date | string | null | undefined }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  if (!value) return <span className="text-muted-foreground">{t("toolsAdmin.common.relativeTime.never")}</span>;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return <span className="text-muted-foreground">—</span>;
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const text = mins < 1
    ? t("toolsAdmin.common.relativeTime.justNow")
    : mins < 60
      ? rtf.format(Math.round(diffMs / 60000), "minute")
      : mins < 1440
        ? rtf.format(Math.round(diffMs / 3600000), "hour")
        : rtf.format(Math.round(diffMs / 86400000), "day");
  return (
    <span title={date.toLocaleString(locale)} className="text-muted-foreground">
      {text}
    </span>
  );
}

export function ToolsPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      {label}
    </div>
  );
}

/** Actionable error surface — surfaces the server message and HTTP status. */
export function ErrorState({ error, onRetry, labels }: { error: unknown; onRetry?: () => void; labels?: Partial<Record<"forbidden" | "routeUnavailable" | "generic" | "couldNotLoad" | "retry", string>> }) {
  const { t } = useTranslation();
  let message: string;
  if (error instanceof ApiError) {
    if (error.status === 403) {
      message = labels?.forbidden ?? t("toolsAdmin.common.errors.forbidden");
    } else if (error.status === 404 || /route not found/i.test(error.message)) {
      // Snapshot-skew window: the route exists in this build but not on the live server snapshot yet.
      message = labels?.routeUnavailable ?? t("toolsAdmin.common.errors.routeUnavailable");
    } else {
      message = error.message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = labels?.generic ?? t("toolsAdmin.common.errors.generic");
  }
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col gap-3 py-6">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{labels?.couldNotLoad ?? t("toolsAdmin.common.errors.couldNotLoad")}</p>
            <p className="text-destructive/80">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            {labels?.retry ?? t("toolsAdmin.common.errors.retry")}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Honest notice for surfaces whose backend contract has not shipped yet.
 * This must NOT pretend to enforce anything client-side — it links the
 * follow-up issue that owns the missing contract.
 */
export function PendingBackendNotice({
  title,
  body,
  issue,
}: {
  title: string;
  body: ReactNode;
  issue?: { identifier: string; href: string };
}) {
  const { t } = useTranslation();
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-2 py-8">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {title}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{body}</p>
        {issue ? (
          <a href={issue.href} className="text-sm font-medium text-primary hover:underline">
            {t("toolsAdmin.common.trackedIn")} {issue.identifier} →
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
