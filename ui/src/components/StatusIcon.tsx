import { useState } from "react";
import type { IssueBlockerAttention } from "@paperclipai/shared";
import { cn } from "../lib/utils";
import { StatusGlyph, type StatusGlyphSize } from "./StatusGlyph";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../i18n";

const allStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled", "blocked"];

type StatusTranslator = (key: string, values?: { count?: number; identifier?: string; status?: string }) => string;

function statusLabel(status: string, translate: StatusTranslator): string {
  const labelKeys: Record<string, string> = {
    backlog: "taskCollection.filters.status.backlog",
    todo: "taskCollection.filters.status.todo",
    in_progress: "taskCollection.filters.status.inProgress",
    in_review: "taskCollection.filters.status.inReview",
    done: "taskCollection.filters.status.done",
    cancelled: "taskCollection.filters.status.cancelled",
    blocked: "taskCollection.filters.status.blocked",
    idle: "taskCollection.rows.statusLabels.idle",
    in_queue: "taskCollection.rows.statusLabels.inQueue",
  };
  const key = labelKeys[status];
  return key ? translate(key) : status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusIconProps {
  status: string;
  externalConversationState?: "active" | "waiting" | null;
  blockerAttention?: IssueBlockerAttention | null;
  onChange?: (status: string) => void;
  className?: string;
  /** Optional layout wrapper around the glyph. Does not change glyph dimensions. */
  glyphContainerClassName?: string;
  showLabel?: boolean;
  /** Glyph size (PAP-243a). Default `md` (16px); lists/detail/mentions use `lg` (20px). */
  size?: StatusGlyphSize;
}

function blockedAttentionLabel(
  blockerAttention: IssueBlockerAttention | null | undefined,
  translate: StatusTranslator,
) {
  if (!blockerAttention || blockerAttention.state === "none") {
    return translate("taskCollection.rows.blockedAttention.default");
  }

  if (blockerAttention.reason === "active_child") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return translate("taskCollection.rows.blockedAttention.activeChildNamed", {
        count,
        identifier: blockerAttention.sampleBlockerIdentifier,
      });
    }
    return translate("taskCollection.rows.blockedAttention.activeChild", { count });
  }

  if (blockerAttention.reason === "active_dependency") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return translate("taskCollection.rows.blockedAttention.activeDependencyNamed", {
        count,
        identifier: blockerAttention.sampleBlockerIdentifier,
      });
    }
    return translate("taskCollection.rows.blockedAttention.activeDependency", { count });
  }

  if (blockerAttention.reason === "stalled_review") {
    const count = blockerAttention.stalledBlockerCount;
    const leaf = blockerAttention.sampleStalledBlockerIdentifier ?? blockerAttention.sampleBlockerIdentifier;
    if (count === 1 && leaf) {
      return translate("taskCollection.rows.blockedAttention.stalledReviewNamed", { identifier: leaf });
    }
    if (count === 1) return translate("taskCollection.rows.blockedAttention.stalledReviewNoNextStep");
    return translate("taskCollection.rows.blockedAttention.stalledReviews", { count });
  }

  if (blockerAttention.reason === "attention_required") {
    const count = blockerAttention.attentionBlockerCount || blockerAttention.unresolvedBlockerCount;
    const attentionCopy = translate("taskCollection.rows.blockedAttention.attentionNeeded", { count });
    const coveredCount = blockerAttention.coveredBlockerCount;
    if (coveredCount > 0) {
      return `${translate("taskCollection.rows.blockedAttention.default")} · ${attentionCopy}; ${translate("taskCollection.rows.blockedAttention.attentionCovered", { count: coveredCount })}`;
    }
    return `${translate("taskCollection.rows.blockedAttention.default")} · ${attentionCopy}`;
  }

  return translate("taskCollection.rows.blockedAttention.default");
}

/**
 * Task/issue status indicator — renders the unified, color-blind-safe
 * {@link StatusGlyph} (one distinct shape per status). With `onChange` it also
 * acts as a status picker (popover). This one component drives every standalone
 * status surface: list, kanban, detail header, properties row + picker flyout,
 * sub-task / blocked-by pills, blocked inbox, quicklook, sibling nav, filters,
 * search, columns, dashboard.
 *
 * A "covered" blocked task (waiting on active work) maps to the `in_queue`
 * glyph — the blocked shape recoloured blue — while the full blocked reason
 * still rides on the accessible label.
 */
export function StatusIcon({ status, externalConversationState, blockerAttention, onChange, className, glyphContainerClassName, showLabel, size = "md" }: StatusIconProps) {
  const { t } = useTranslation();
  const translate: StatusTranslator = (key, values) => String(t(key, values as never));
  const [open, setOpen] = useState(false);
  const displayStatus = status === "in_review" && externalConversationState === "waiting" ? "idle" : status;
  const isCoveredBlocked = status === "blocked" && blockerAttention?.state === "covered";
  const ariaLabel = status === "blocked"
    ? blockedAttentionLabel(blockerAttention, translate)
    : statusLabel(displayStatus, translate);
  const glyphStatus = isCoveredBlocked ? "in_queue" : displayStatus;

  const glyphIcon = (
    <StatusGlyph
      status={glyphStatus}
      size={size}
      className={cn(onChange && !showLabel && "cursor-pointer", className)}
      title={ariaLabel}
    />
  );
  const glyph = glyphContainerClassName ? (
    <span className={glyphContainerClassName} data-status-glyph-container="true">
      {glyphIcon}
    </span>
  ) : glyphIcon;

  if (!onChange) {
    return showLabel ? (
      <span className="inline-flex items-center gap-1.5">
        {glyph}
        <span className="text-sm">{statusLabel(displayStatus, translate)}</span>
      </span>
    ) : (
      glyph
    );
  }

  const trigger = showLabel ? (
    <button
      type="button"
      aria-label={t("taskCollection.rows.blockedAttention.changeStatus", { status: ariaLabel })}
      className="inline-flex min-h-5 items-center gap-1.5 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5 transition-colors"
    >
      {glyph}
      <span className="text-sm">{statusLabel(displayStatus, translate)}</span>
    </button>
  ) : (
    <button
      type="button"
      data-slot="icon-button"
      aria-label={t("taskCollection.rows.blockedAttention.changeStatus", { status: ariaLabel })}
      className="inline-flex cursor-pointer items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-(length:--rad-3) focus-visible:ring-ring"
    >
      {glyph}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {allStatuses.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-xs", s === status && "bg-accent")}
            onClick={() => {
              onChange(s);
              setOpen(false);
            }}
          >
            <StatusIcon status={s} size="lg" />
            {statusLabel(s, translate)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
