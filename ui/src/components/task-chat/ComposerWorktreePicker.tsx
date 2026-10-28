import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Folder, GitBranch, GitBranchPlus, Monitor } from "lucide-react";
import type { ExecutionWorkspaceSummary } from "@paperclipai/shared";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { orderReusableExecutionWorkspaces } from "@/lib/reusable-execution-workspaces";

interface WorktreeOption extends SearchableSelectOption {
  mode: string;
  workspaceId?: string;
  description: string;
}

interface ComposerWorktreePickerProps {
  mode: string;
  workspaceId: string;
  workspaces: readonly ExecutionWorkspaceSummary[];
  onChange: (mode: string, workspaceId: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled?: boolean;
  mobile?: boolean;
  contentStyle?: CSSProperties;
  selectedWorkspaceLabel?: string;
}

const MODE_OPTION_DEFINITIONS = [
  { key: "isolated_workspace", value: "isolated_workspace", mode: "isolated_workspace", labelKey: "taskCreation.worktree.new", descriptionKey: "taskCreation.worktree.newDescription" },
  { key: "shared_workspace", value: "shared_workspace", mode: "shared_workspace", labelKey: "taskCreation.worktree.project", descriptionKey: "taskCreation.worktree.projectDescription" },
  { key: "operator_branch", value: "operator_branch", mode: "operator_branch", labelKey: "taskCreation.worktree.branch", descriptionKey: "taskCreation.worktree.branchDescription" },
  { key: "agent_default", value: "agent_default", mode: "agent_default", labelKey: "taskCreation.worktree.agentDefault", descriptionKey: "taskCreation.worktree.agentDefaultDescription" },
  { key: "inherit", value: "inherit", mode: "inherit", labelKey: "taskCreation.worktree.projectDefault", descriptionKey: "taskCreation.worktree.projectDefaultDescription" },
] as const;

/** Reuses the searchable selector and the existing workspace recency ordering. */
export function ComposerWorktreePicker({
  mode, workspaceId, workspaces, onChange, loading, error, onRetry,
  disabled, mobile, contentStyle, selectedWorkspaceLabel,
}: ComposerWorktreePickerProps) {
  const { t } = useTranslation();
  const modeOptions = useMemo(() => MODE_OPTION_DEFINITIONS.map(({
    labelKey,
    descriptionKey,
    ...option
  }): WorktreeOption => ({
    ...option,
    label: String(t(labelKey)),
    description: String(t(descriptionKey)),
  })), [t]);
  const groups = useMemo(() => [
    { id: "new", options: [modeOptions[0]!] },
    {
      id: "reuse", label: String(t("taskCreation.worktree.reuseGroup")),
      options: orderReusableExecutionWorkspaces(workspaces).map((workspace): WorktreeOption => ({
        key: `reuse:${workspace.id}`, value: `reuse:${workspace.id}`,
        workspaceId: workspace.id, mode: "reuse_existing", label: workspace.name,
        description: workspace.branchName ?? String(t("taskCreation.worktree.existing")),
        searchText: `${workspace.branchName ?? ""} ${workspace.id}`,
      })),
    },
    {
      id: "other", label: String(t("taskCreation.worktree.otherGroup")),
      options: modeOptions.filter((option) => option.mode === "shared_workspace"
        || (option.mode !== "isolated_workspace" && option.mode === mode)),
    },
  ], [mode, modeOptions, t, workspaces]);

  const value = mode === "reuse_existing" ? `reuse:${workspaceId}` : mode;
  return (
    <SearchableSelect<string, WorktreeOption>
      value={value}
      groups={groups}
      onValueChange={(_, option) => onChange(option.mode, option.workspaceId ?? "")}
      placeholder={String(t("taskCreation.worktree.label"))}
      triggerAriaLabel={String(t("taskCreation.worktree.label"))}
      mobileTitle={String(t("taskCreation.worktree.label"))}
      searchPlaceholder={String(t("taskCreation.worktree.search"))}
      emptyMessage={String(t("taskCreation.worktree.empty"))}
      disabled={disabled}
      modal={mobile}
      contentStyle={contentStyle}
      contentWidth="auto"
      className="min-w-0 flex-1 sm:flex-none sm:max-w-72"
      triggerClassName="h-8 gap-1.5 border-0 bg-transparent px-2 text-xs font-medium shadow-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-0"
      renderValue={(option) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <GitBranch className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            <span className="hidden text-muted-foreground sm:inline">{t("taskCreation.worktree.label")} · </span>
            {option?.label ?? selectedWorkspaceLabel ?? t("taskCreation.worktree.select")}
          </span>
        </span>
      )}
      renderOption={(option) => {
        const Icon = option.workspaceId ? GitBranch : option.mode === "isolated_workspace" ? GitBranchPlus
          : option.mode === "agent_default" ? Monitor : option.mode === "operator_branch" ? GitBranch : Folder;
        return (
          <>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{option.label}</span>
              <span className="truncate text-xs text-muted-foreground">{option.description}</span>
            </span>
          </>
        );
      }}
      listFooter={loading || error || workspaces.length === 0 ? (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground" role="status">
          {loading ? t("taskCreation.worktree.loading") : error ? (
            <span className="flex items-center justify-between gap-2">
              {t("taskCreation.worktree.loadError")}
              <button type="button" className="rounded px-2 py-1 text-foreground hover:bg-accent" onClick={onRetry}>{t("taskCreation.worktree.retry")}</button>
            </span>
          ) : t("taskCreation.worktree.none")}
        </div>
      ) : undefined}
    />
  );
}
