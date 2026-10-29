import { useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { Link } from "@/lib/router";
import { Bot, User, Cog, ChevronDown, ListFilter } from "lucide-react";
import type { CaseEvent, CaseEventKind } from "@/api/cases";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/StatusIcon";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

const EVENT_LABEL_KEYS: Record<CaseEventKind, string> = {
  created: "caseManagement.activity.events.created",
  updated: "caseManagement.activity.events.updated",
  fields_changed: "caseManagement.activity.events.fieldsChanged",
  status_changed: "caseManagement.activity.events.statusChanged",
  issue_linked: "caseManagement.activity.events.issueLinked",
  issue_unlinked: "caseManagement.activity.events.issueUnlinked",
  document_revised: "caseManagement.activity.events.documentRevised",
  child_linked: "caseManagement.activity.events.childLinked",
  attachment_added: "caseManagement.activity.events.attachmentAdded",
  label_added: "caseManagement.activity.events.labelAdded",
  label_removed: "caseManagement.activity.events.labelRemoved",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "caseManagement.collection.statuses.draft",
  in_progress: "caseManagement.collection.statuses.inProgress",
  in_review: "caseManagement.collection.statuses.inReview",
  approved: "caseManagement.collection.statuses.approved",
  done: "caseManagement.collection.statuses.done",
  cancelled: "caseManagement.collection.statuses.cancelled",
};

function eventLabel(kind: string, t: TFunction): string {
  const key = EVENT_LABEL_KEYS[kind as CaseEventKind];
  return key ? t(key) : kind;
}

function statusLabel(value: unknown, t: TFunction): string {
  if (value == null) return "?";
  const status = String(value);
  return STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status;
}

/** Human label for the actor, preferring the resolved agent name. */
function actorLabel(event: CaseEvent, t: TFunction): string {
  if (event.actorType === "agent") return event.actorAgentName ?? t("caseManagement.activity.actor.agent");
  if (event.actorType === "user") return t("caseManagement.activity.actor.user");
  return t("caseManagement.activity.actor.system");
}

function ActorIcon({ event }: { event: CaseEvent }) {
  const Icon = event.actorType === "agent" ? Bot : event.actorType === "user" ? User : Cog;
  return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}

/** One event with actor + run→issue attribution (P4 §1). */
export function CaseEventRow({ event, compact = false }: { event: CaseEvent; compact?: boolean }) {
  const { t } = useTranslation();
  const detail =
    event.kind === "status_changed" && event.payload
      ? `${statusLabel(event.payload.previousStatus, t)} → ${statusLabel(event.payload.status, t)}`
      : "";
  return (
    <div className={cn("flex items-start gap-2 text-xs", compact ? "py-1.5" : "py-2")}>
      <span className="mt-1"><ActorIcon event={event} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-medium">{eventLabel(event.kind, t)}</span>
          {detail && <span className="text-muted-foreground">· {detail}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
          <span>{actorLabel(event, t)}</span>
          {event.issue && (
            <>
              <span aria-hidden>·</span>
              <span>{t(event.kind === "issue_linked" || event.kind === "issue_unlinked" ? "caseManagement.activity.issue" : "caseManagement.activity.via")}</span>
              <Link
                to={`/issues/${event.issue.identifier}`}
                className="inline-flex min-w-0 items-center gap-1 text-foreground/80 hover:underline"
                title={event.issue.title}
              >
                <StatusIcon status={event.issue.status} size="sm" />
                <span className="shrink-0 font-mono">{event.issue.identifier}</span>
                <span className="min-w-0 truncate">{event.issue.title}</span>
              </Link>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{relativeTime(event.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

/** The full activity feed with kind filters (detail-page Activity tab). */
export function CaseActivityFeed({ events, loading = false, error = false, onRetry }: { events: CaseEvent[]; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<Set<CaseEventKind>>(new Set());

  // Only offer filters for kinds actually present, in first-seen order.
  const presentKinds = useMemo(() => {
    const seen: CaseEventKind[] = [];
    for (const e of events) if (!seen.includes(e.kind)) seen.push(e.kind);
    return seen;
  }, [events]);

  const filtered = useMemo(
    () => (active.size === 0 ? events : events.filter((e) => active.has(e.kind))),
    [events, active],
  );

  function toggle(kind: CaseEventKind) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  const filterLabel = active.size === 0
    ? t("caseManagement.activity.all")
    : active.size === 1
      ? eventLabel([...active][0]!, t)
      : t("caseManagement.activity.filterCount", { count: active.size, formattedCount: formatNumber(active.size) });

  if (loading) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("caseManagement.activity.loading")}</p>;
  if (error) return <div className="space-y-2 py-6 text-center"><p className="text-sm text-destructive">{t("caseManagement.activity.error")}</p>{onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>{t("caseManagement.collection.retry")}</Button> : null}</div>;

  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("caseManagement.activity.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("caseManagement.activity.eventCount", { count: events.length, shown: formatNumber(filtered.length), total: formatNumber(events.length) })}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ListFilter className="h-3.5 w-3.5" />
              {filterLabel}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("caseManagement.activity.filterLabel")}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setActive(new Set())}>
              {t("caseManagement.activity.all")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {presentKinds.map((kind) => (
              <DropdownMenuCheckboxItem
                key={kind}
                checked={active.has(kind)}
                onCheckedChange={() => toggle(kind)}
              >
                {eventLabel(kind, t)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("caseManagement.activity.noMatches")}</p>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((event) => (
            <CaseEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
