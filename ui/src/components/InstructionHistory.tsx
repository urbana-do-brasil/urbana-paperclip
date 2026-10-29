import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import type { AgentInstructionSource, AgentInstructionsFileDetail } from "@paperclipai/shared";
import { useTranslation } from "@/i18n";
import { formatDateTime } from "@/lib/utils";
import { agentsApi } from "../api/agents";
import { Button } from "./ui/button";

export function InstructionHistory({
  agentId,
  companyId,
  path,
  currentRevisionId,
  disabled,
  onRestored,
}: {
  agentId: string;
  companyId?: string;
  path: string;
  currentRevisionId: string;
  disabled: boolean;
  onRestored: (file: AgentInstructionsFileDetail) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const sourceLabels: Record<AgentInstructionSource, string> = {
    seed: t("agentInstructions.history.source.seed"),
    board: t("agentInstructions.history.source.board"),
    api: t("agentInstructions.history.source.api"),
    tool: t("agentInstructions.history.source.tool"),
    cleanup: t("agentInstructions.history.source.cleanup"),
    restore: t("agentInstructions.history.source.restore"),
  };
  const history = useInfiniteQuery({
    queryKey: ["instruction-history", agentId, path, currentRevisionId],
    queryFn: ({ pageParam }) =>
      agentsApi.instructionHistory(agentId, path, companyId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: open,
  });
  const diff = useQuery({
    queryKey: ["instruction-diff", agentId, path, selected, currentRevisionId],
    queryFn: () =>
      agentsApi.instructionDiff(
        agentId,
        path,
        selected!,
        currentRevisionId,
        companyId,
      ),
    enabled: open && Boolean(selected),
  });
  const restore = useMutation({
    mutationFn: () =>
      agentsApi.restoreInstructions(
        agentId,
        { path, revisionId: selected!, baseRevisionId: currentRevisionId },
        companyId,
      ),
    onSuccess: (file) => {
      setSelected(null);
      onRestored(file);
    },
  });
  const error = history.error ?? diff.error ?? restore.error;
  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t("agentInstructions.history.open")}
      </Button>
      {open && (
        <div className="space-y-3">
          {history.isLoading && (
            <p className="text-sm text-muted-foreground">{t("agentInstructions.history.loading")}</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}
          {history.data?.pages
            .flatMap((page) => page.revisions)
            .map((revision) => (
              <div key={revision.id} className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant={selected === revision.id ? "secondary" : "ghost"}
                  onClick={() => setSelected(revision.id)}
                >
                  <span className="font-mono">{revision.id.slice(0, 8)}</span>
                </Button>
                <span className="text-sm text-muted-foreground">
                  {sourceLabels[revision.source]} · {formatDateTime(revision.createdAt)}
                  {revision.id === currentRevisionId ? ` · ${t("agentInstructions.history.current")}` : ""}
                </span>
              </div>
            ))}
          {history.hasNextPage && (
            <Button
              type="button"
              variant="ghost"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {history.isFetchingNextPage
                ? t("agentInstructions.history.loadingOlder")
                : t("agentInstructions.history.olderRevisions")}
            </Button>
          )}
          {diff.data && (
            <>
              <p className="text-sm text-muted-foreground">{t("agentInstructions.history.selectedRevision")}</p>
              <pre className="whitespace-pre-wrap break-words rounded-md border border-border p-3 font-mono text-sm">
                {diff.data.from.content}
              </pre>
              <p className="text-sm text-muted-foreground">
                {t("agentInstructions.history.diffHeading")}
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-md border border-border p-3 font-mono text-sm">
                {diff.data.removed && `${t("agentInstructions.history.removed")}:\n${diff.data.removed}\n`}
                {diff.data.added && `${t("agentInstructions.history.added")}:\n${diff.data.added}`}
                {!diff.data.removed &&
                  !diff.data.added &&
                  t("agentInstructions.history.noChanges")}
              </pre>
              <Button
                type="button"
                disabled={
                  disabled ||
                  restore.isPending ||
                  selected === currentRevisionId
                }
                onClick={() => restore.mutate()}
              >
                {restore.isPending
                  ? t("agentInstructions.history.restoring")
                  : t("agentInstructions.history.restore")}
              </Button>
              {disabled && (
                <p className="text-sm text-muted-foreground">
                  {t("agentInstructions.history.saveOrCancelBeforeRestore")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
