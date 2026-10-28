import { AgentIdentity } from "@/components/AgentIdentity";
import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "react-i18next";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { SHOW_TASK_PRIORITY_UI } from "../lib/ui-flags";
import { Identity } from "./Identity";
import type { Issue, IssueStatus } from "@paperclipai/shared";
import { AlertTriangle } from "lucide-react";
import { isSuccessfulRunHandoffRequired } from "../lib/successful-run-handoff";
import { collectSubtreeLiveCounts } from "../lib/liveIssueIds";
import { cn } from "../lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const KANBAN_BOARD_HIGH_VOLUME_THRESHOLD = 100;
export const KANBAN_COLUMN_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type KanbanColumnPageSize = (typeof KANBAN_COLUMN_PAGE_SIZE_OPTIONS)[number];
export const KANBAN_COLUMN_DEFAULT_PAGE_SIZE: KanbanColumnPageSize = 10;
export const KANBAN_COLUMN_INITIAL_VISIBLE_LIMIT = KANBAN_COLUMN_DEFAULT_PAGE_SIZE;
export const KANBAN_COLUMN_REVEAL_INCREMENT = KANBAN_COLUMN_DEFAULT_PAGE_SIZE;
export const KANBAN_COLD_STATUSES = ["backlog", "done", "cancelled"] as const;

export const boardStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
] as const satisfies readonly IssueStatus[];

const KANBAN_STATUS_LABEL_KEYS = {
  backlog: "taskCollection.filters.status.backlog",
  todo: "taskCollection.filters.status.todo",
  in_progress: "taskCollection.filters.status.inProgress",
  in_review: "taskCollection.filters.status.inReview",
  blocked: "taskCollection.filters.status.blocked",
  done: "taskCollection.filters.status.done",
  cancelled: "taskCollection.filters.status.cancelled",
} as const satisfies Record<IssueStatus, string>;

const defaultKanbanColumnTone = {
  rail: "border-border bg-muted/20",
  railOver: "bg-accent/50 ring-1 ring-primary/20",
  header: "text-muted-foreground",
  count: "text-muted-foreground/60",
  body: "bg-muted/20",
  bodyOver: "bg-accent/40",
  card: "",
};

// Every column carries a status-hued tint (matching the app-wide status
// vocabulary: gray backlog, amber todo, blue in-progress, violet review,
// red blocked, green done) so no column reads as accidentally unstyled.
export const kanbanColumnTones: Partial<Record<IssueStatus, typeof defaultKanbanColumnTone>> = {
  backlog: {
    rail: "border-border bg-muted/30",
    railOver: "bg-muted/50 ring-1 ring-neutral-400/25",
    header: "text-muted-foreground",
    count: "text-muted-foreground/60",
    body: "bg-muted/30 ring-1 ring-inset ring-border/50",
    bodyOver: "bg-muted/50 ring-1 ring-inset ring-neutral-400/25",
    card: "",
  },
  todo: {
    rail: "border-amber-500/25 bg-amber-50/60 dark:bg-amber-950/20",
    railOver: "bg-amber-100/70 ring-1 ring-amber-500/25 dark:bg-amber-950/35",
    header: "text-amber-700 dark:text-amber-300",
    count: "text-amber-700/65 dark:text-amber-300/65",
    body: "bg-amber-50/45 ring-1 ring-inset ring-amber-500/15 dark:bg-amber-950/15",
    bodyOver: "bg-amber-100/70 ring-1 ring-inset ring-amber-500/25 dark:bg-amber-950/30",
    card: "",
  },
  in_progress: {
    rail: "border-blue-500/25 bg-blue-50/60 dark:bg-blue-950/20",
    railOver: "bg-blue-100/70 ring-1 ring-blue-500/25 dark:bg-blue-950/35",
    header: "text-blue-700 dark:text-blue-300",
    count: "text-blue-700/65 dark:text-blue-300/65",
    body: "bg-blue-50/45 ring-1 ring-inset ring-blue-500/15 dark:bg-blue-950/15",
    bodyOver: "bg-blue-100/70 ring-1 ring-inset ring-blue-500/25 dark:bg-blue-950/30",
    card: "",
  },
  blocked: {
    rail: "border-red-500/25 bg-red-50/60 dark:bg-red-950/20",
    railOver: "bg-red-100/70 ring-1 ring-red-500/25 dark:bg-red-950/35",
    header: "text-red-700 dark:text-red-300",
    count: "text-red-700/65 dark:text-red-300/65",
    body: "bg-red-50/45 ring-1 ring-inset ring-red-500/15 dark:bg-red-950/15",
    bodyOver: "bg-red-100/70 ring-1 ring-inset ring-red-500/25 dark:bg-red-950/30",
    card: "",
  },
  in_review: {
    rail: "border-violet-500/25 bg-violet-50/60 dark:bg-violet-950/20",
    railOver: "bg-violet-100/70 ring-1 ring-violet-500/25 dark:bg-violet-950/35",
    header: "text-violet-700 dark:text-violet-300",
    count: "text-violet-700/65 dark:text-violet-300/65",
    body: "bg-violet-50/45 ring-1 ring-inset ring-violet-500/15 dark:bg-violet-950/15",
    bodyOver: "bg-violet-100/70 ring-1 ring-inset ring-violet-500/25 dark:bg-violet-950/30",
    card: "",
  },
  done: {
    rail: "border-green-500/25 bg-green-50/60 dark:bg-green-950/20",
    railOver: "bg-green-100/70 ring-1 ring-green-500/25 dark:bg-green-950/35",
    header: "text-green-700 dark:text-green-300",
    count: "text-green-700/65 dark:text-green-300/65",
    body: "bg-green-50/45 ring-1 ring-inset ring-green-500/15 dark:bg-green-950/15",
    bodyOver: "bg-green-100/70 ring-1 ring-inset ring-green-500/25 dark:bg-green-950/30",
    card: "",
  },
  cancelled: {
    rail: "border-neutral-300/70 bg-muted/25 opacity-80 dark:border-neutral-700/70 dark:bg-neutral-900/20",
    railOver: "bg-muted/45 opacity-90 ring-1 ring-neutral-400/25 dark:bg-neutral-900/35",
    header: "text-muted-foreground/80",
    count: "text-muted-foreground/50",
    body: "bg-muted/25 ring-1 ring-inset ring-border/50",
    bodyOver: "bg-muted/45 ring-1 ring-inset ring-neutral-400/25",
    card: "bg-muted/35 text-muted-foreground opacity-80 hover:shadow-none",
  },
};

export function getKanbanColumnTone(status: IssueStatus) {
  return kanbanColumnTones[status] ?? defaultKanbanColumnTone;
}

export function resolveKanbanTargetStatus(overId: string, issues: Issue[]): IssueStatus | null {
  if ((boardStatuses as readonly string[]).includes(overId)) {
    return overId as IssueStatus;
  }
  return issues.find((issue) => issue.id === overId)?.status ?? null;
}

interface Agent {
  id: string;
  name: string;
}

interface KanbanCardText {
  needsNextStepLabel: string;
  needsNextStepTitle: string;
  liveLabel: string;
  liveDescendants: (count: number) => string;
}

interface KanbanBoardProps {
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  compactCards?: boolean;
  collapsedStatuses?: string[];
  initialVisibleCount?: number;
  revealIncrement?: number;
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
}

/* ── Droppable Column ── */

function KanbanColumn({
  status,
  statusName,
  issues,
  agents,
  liveIssueIds,
  subtreeLiveCounts,
  compactCards = false,
  collapsed = false,
  visibleCount,
  revealIncrement,
  showMoreLabel,
  showingLabel,
  cardText,
  onShowMore,
}: {
  status: IssueStatus;
  statusName: string;
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  subtreeLiveCounts?: ReadonlyMap<string, number>;
  compactCards?: boolean;
  collapsed?: boolean;
  visibleCount: number;
  revealIncrement: number;
  showMoreLabel: string;
  showingLabel: string;
  cardText: KanbanCardText;
  onShowMore: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const visibleIssues = collapsed ? [] : issues.slice(0, visibleCount);
  const hiddenCount = Math.max(issues.length - visibleIssues.length, 0);
  const nextRevealCount = Math.min(revealIncrement, hiddenCount);
  const tone = getKanbanColumnTone(status);

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-(--sz-220px) w-(--sz-52px) shrink-0 flex-col items-center rounded-md border px-1.5 py-2 transition-colors",
          tone.rail,
          isOver && tone.railOver,
        )}
        title={`${statusName}: ${issues.length}`}
      >
        <StatusIcon status={status} />
        <span className={cn("mt-2 [writing-mode:vertical-rl] rotate-180 text-(length:--text-nano) font-semibold uppercase tracking-wide", tone.header)}>
          {statusName}
        </span>
        <Badge variant="ghost" className={cn("mt-auto bg-background px-1.5 text-(length:--text-nano) tabular-nums", tone.header)}>
          {issues.length}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col shrink-0 min-w-(--sz-260px) w-(--sz-260px)">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <StatusIcon status={status} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", tone.header)}>
          {statusName}
        </span>
        <span className={cn("ml-auto text-xs tabular-nums", tone.count)}>
          {issues.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-(--sz-120px) rounded-md p-2 space-y-1 transition-colors",
          isOver ? tone.bodyOver : tone.body,
        )}
      >
        {/* Hidden cards are intentionally excluded from sort targets until revealed. */}
        <SortableContext
          items={visibleIssues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleIssues.map((issue) => (
            <KanbanCard
              key={issue.id}
              issue={issue}
              agents={agents}
              isLive={liveIssueIds?.has(issue.id)}
              subtreeLiveCount={subtreeLiveCounts?.get(issue.id) ?? 0}
              compact={compactCards}
              className={tone.card}
              cardText={cardText}
            />
          ))}
        </SortableContext>
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-center rounded-md border border-dashed border-border bg-background/70 px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            onClick={onShowMore}
          >
            {showMoreLabel}
          </button>
        ) : null}
        {issues.length > 0 && (hiddenCount > 0 || issues.length >= visibleCount) ? (
          <p className="px-1 pt-1 text-(length:--text-micro) text-muted-foreground">
            {showingLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Draggable Card ── */

function KanbanCard({
  issue,
  agents,
  isLive,
  subtreeLiveCount = 0,
  isOverlay,
  compact = false,
  className,
  cardText,
}: {
  issue: Issue;
  agents?: Agent[];
  isLive?: boolean;
  subtreeLiveCount?: number;
  isOverlay?: boolean;
  compact?: boolean;
  className?: string;
  cardText: KanbanCardText;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { issue } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "block cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && !isOverlay ? "opacity-30" : "",
        isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-sm",
        compact ? "p-2" : "p-2.5",
        className,
      )}
    >
      <Link
        to={`/issues/${issue.identifier ?? issue.id}`}
        disableIssueQuicklook
        className="block no-underline text-inherit"
        onClick={(e) => {
          // Prevent navigation during drag
          if (isDragging) e.preventDefault();
        }}
      >
        <div className={`flex items-start gap-1.5 ${compact ? "mb-1" : "mb-1.5"}`}>
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {issue.identifier ?? issue.id.slice(0, 8)}
          </span>
          {isSuccessfulRunHandoffRequired(issue) ? (
            <Badge variant="outline"
              className="border-amber-400/45 bg-amber-50/60 px-1.5 text-(length:--text-nano) text-amber-700 dark:border-amber-300/35 dark:bg-amber-400/10 dark:text-amber-300"
              title={cardText.needsNextStepTitle}
              aria-label={cardText.needsNextStepLabel}
            >
              <AlertTriangle className="h-3 w-3" />
              {cardText.needsNextStepLabel}
            </Badge>
          ) : null}
          {isLive && (
            <span aria-label={cardText.liveLabel} title={cardText.liveLabel} className="inline-flex shrink-0 items-center gap-1 text-(length:--text-nano) font-medium text-blue-600 dark:text-blue-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              {compact ? cardText.liveLabel : null}
            </span>
          )}
          {!isLive && subtreeLiveCount > 0 && (
            <Badge variant="outline"
              className="border-border px-1.5 text-(length:--text-nano) text-muted-foreground"
              title={cardText.liveDescendants(subtreeLiveCount)}
              aria-label={cardText.liveDescendants(subtreeLiveCount)}
            >
              <span className="h-2 w-2 shrink-0 rounded-full border border-muted-foreground/60" aria-hidden="true" />
              {cardText.liveDescendants(subtreeLiveCount)}
            </Badge>
          )}
        </div>
        <p className={`${compact ? "mb-1.5 text-xs" : "mb-2 text-sm"} leading-snug line-clamp-2`}>{issue.title}</p>
        <div className="flex items-center gap-2 min-w-0">
          {/* PAP-411: priority UI hidden behind SHOW_TASK_PRIORITY_UI. */}
          {SHOW_TASK_PRIORITY_UI && <PriorityIcon priority={issue.priority} />}
          {issue.assigneeAgentId && (() => {
            const name = agentName(issue.assigneeAgentId);
            return name ? (
              <AgentIdentity agent={agents?.find((agent) => agent.id === issue.assigneeAgentId) ?? { id: issue.assigneeAgentId, name }} size="xs" />
            ) : (
              <span className="text-xs text-muted-foreground font-mono">
                {issue.assigneeAgentId.slice(0, 8)}
              </span>
            );
          })()}
        </div>
      </Link>
    </Card>
  );
}

/* ── Main Board ── */

export function KanbanBoard({
  issues,
  agents,
  liveIssueIds,
  compactCards = false,
  collapsedStatuses = [],
  initialVisibleCount = KANBAN_COLUMN_INITIAL_VISIBLE_LIMIT,
  revealIncrement = KANBAN_COLUMN_REVEAL_INCREMENT,
  onUpdateIssue,
}: KanbanBoardProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const paginationKey = `${initialVisibleCount}:${revealIncrement}`;
  const [visibleState, setVisibleState] = useState<{
    paginationKey: string;
    counts: Record<string, number>;
  }>({ paginationKey, counts: {} });
  const visibleCountByStatus = visibleState.paginationKey === paginationKey ? visibleState.counts : {};
  const collapsedStatusSet = useMemo(() => new Set(collapsedStatuses), [collapsedStatuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columnIssues = useMemo(() => {
    const grouped: Record<IssueStatus, Issue[]> = {} as Record<IssueStatus, Issue[]>;
    for (const status of boardStatuses) {
      grouped[status] = [];
    }
    for (const issue of issues) {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue);
      }
    }
    return grouped;
  }, [issues]);

  const activeIssue = useMemo(
    () => (activeId ? issues.find((i) => i.id === activeId) : null),
    [activeId, issues]
  );

  const subtreeLiveCounts = useMemo(
    () => collectSubtreeLiveCounts(issues, liveIssueIds ?? new Set<string>()),
    [issues, liveIssueIds],
  );

  const getStatusName = (status: IssueStatus) => String(t(KANBAN_STATUS_LABEL_KEYS[status]));
  const getTaskLabel = (id: string) => {
    const issue = issues.find((candidate) => candidate.id === id);
    if (!issue) return id;
    return issue.identifier ? `${issue.identifier} — ${issue.title}` : issue.title || id;
  };
  const cardText: KanbanCardText = {
    needsNextStepLabel: String(t("taskCollection.hierarchy.needsNextStep")),
    needsNextStepTitle: String(t("taskCollection.hierarchy.needsNextStepTitle")),
    liveLabel: String(t("taskCollection.rows.live")),
    liveDescendants: (count) => String(t("taskCollection.rows.liveDescendants", { count })),
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => String(t("taskCollection.kanban.dragStart", { task: getTaskLabel(String(active.id)) })),
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      const status = resolveKanbanTargetStatus(String(over.id), issues);
      return status
        ? String(t("taskCollection.kanban.dragOver", {
          task: getTaskLabel(String(active.id)),
          status: getStatusName(status),
        }))
        : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const issue = issues.find((candidate) => candidate.id === String(active.id));
      const status = over ? resolveKanbanTargetStatus(String(over.id), issues) : null;
      if (!issue || !status) return String(t("taskCollection.kanban.dragNotDropped", { task: getTaskLabel(String(active.id)) }));
      const task = getTaskLabel(String(active.id));
      return status === issue.status
        ? String(t("taskCollection.kanban.dragUnchanged", { task, status: getStatusName(status) }))
        : String(t("taskCollection.kanban.dragDropped", { task, status: getStatusName(status) }));
    },
    onDragCancel: ({ active }) => String(t("taskCollection.kanban.dragCancelled", { task: getTaskLabel(String(active.id)) })),
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;

    // Determine target status: the "over" could be a column id (status string)
    // or another card's id. Find which column the "over" belongs to.
    const targetStatus = resolveKanbanTargetStatus(over.id as string, issues);

    if (targetStatus && targetStatus !== issue.status) {
      onUpdateIssue(issueId, { status: targetStatus });
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // Could be used for visual feedback; keeping simple for now
  }

  return (
    <>
    {issues.length === 0 && (
      <p role="status" className="mb-2 text-sm text-muted-foreground">
        {t("taskCollection.kanban.empty")}
      </p>
    )}
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: String(t("taskCollection.kanban.dragInstructions")) },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
        {boardStatuses.map((status) => {
          const statusIssues = columnIssues[status] ?? [];
          const visibleCount = visibleCountByStatus[status] ?? initialVisibleCount;
          const remainingCount = Math.max(statusIssues.length - visibleCount, 0);
          const showMoreCount = Math.min(revealIncrement, remainingCount);
          return (
            <KanbanColumn
              key={status}
              status={status}
              statusName={getStatusName(status)}
              issues={statusIssues}
              agents={agents}
              liveIssueIds={liveIssueIds}
              subtreeLiveCounts={subtreeLiveCounts}
              compactCards={compactCards}
              cardText={cardText}
              // Compact mode (any lane explicitly collapsed) also collapses
              // empty lanes to the same labeled rail, so an empty In Progress
              // reads like the other rails instead of a lone expanded column.
              collapsed={collapsedStatusSet.has(status) || (collapsedStatusSet.size > 0 && statusIssues.length === 0)}
              visibleCount={visibleCount}
              revealIncrement={revealIncrement}
              showMoreLabel={String(t("taskCollection.kanban.showMore", { count: showMoreCount }))}
              showingLabel={String(t("taskCollection.kanban.showingCount", {
                shown: Math.min(visibleCount, statusIssues.length),
                total: statusIssues.length,
              }))}
              onShowMore={() => {
                setVisibleState((current) => {
                  const counts = current.paginationKey === paginationKey ? current.counts : {};
                  return {
                    paginationKey,
                    counts: {
                      ...counts,
                      [status]: (counts[status] ?? initialVisibleCount) + revealIncrement,
                    },
                  };
                });
              }}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeIssue ? (
          <KanbanCard
            issue={activeIssue}
            agents={agents}
            isOverlay
            compact={compactCards}
            cardText={cardText}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
    </>
  );
}
