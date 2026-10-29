import type { TFunction } from "i18next";

export function translateCloseReadinessMessage(message: string, t: TFunction) {
  const exactMessages: Record<string, string> = {
    "Paperclip could not verify the workspace git status. Retry before destructive cleanup.": "taskDetail.workspace.close.message.cannotVerifyGit",
    "Workspace has no local path, so Paperclip cannot inspect git status before close.": "taskDetail.workspace.close.message.noLocalPath",
    "This shared workspace session points at project workspace infrastructure. Archiving it only removes the session record.": "taskDetail.workspace.close.message.sharedInfrastructure",
  };
  const exactKey = exactMessages[message];
  if (exactKey) return t(exactKey);

  let match = message.match(/^Workspace path \"([^\"]+)\" does not exist, so Paperclip cannot inspect git status before close\.$/);
  if (match) return t("taskDetail.workspace.close.message.pathMissing", { path: match[1] });
  match = message.match(/^Could not inspect git status for \"([^\"]+)\": (.*)$/);
  if (match) return t("taskDetail.workspace.close.message.inspectGitError", { path: match[1], error: match[2] });
  match = message.match(/^Could not read git working tree status for \"([^\"]+)\": (.*)$/);
  if (match) return t("taskDetail.workspace.close.message.readGitError", { path: match[1], error: match[2] });
  match = message.match(/^Could not compare this workspace against (.+): (.*)$/);
  if (match) return t("taskDetail.workspace.close.message.compareGitError", { baseRef: match[1], error: match[2] });
  match = message.match(/^Could not determine whether this workspace is merged into (.+): (.*)$/);
  if (match) return t("taskDetail.workspace.close.message.mergedGitError", { baseRef: match[1], error: match[2] });
  match = message.match(/^This workspace is still linked to (?:an open issue|(\d+) open issues)\.(?: (Archiving it will detach this shared workspace session from those issues, but keep the underlying project workspace available\.)\s*)?$/);
  if (match) {
    const count = match[1] ? Number(match[1]) : 1;
    const linkedTasks = t("taskDetail.workspace.close.message.linkedOpenTasks", { count });
    return match[2]
      ? `${linkedTasks} ${t("taskDetail.workspace.close.message.sharedDetach")}`
      : linkedTasks;
  }
  match = message.match(/^Closing this workspace will stop (\d+) attached runtime services?\.$/);
  if (match) return t("taskDetail.workspace.close.message.stopRuntimeServices", { count: Number(match[1]) });
  match = message.match(/^The workspace has (\d+) modified tracked files?\.$/);
  if (match) return t("taskDetail.workspace.close.message.modifiedTrackedFiles", { count: Number(match[1]) });
  match = message.match(/^The workspace has (\d+) untracked files?\.$/);
  if (match) return t("taskDetail.workspace.close.message.untrackedFiles", { count: Number(match[1]) });
  match = message.match(/^This workspace is (\d+) commits? ahead of (.+) and is not merged\.$/);
  if (match) return t("taskDetail.workspace.close.message.aheadCommits", { count: Number(match[1]), baseRef: match[2] });
  match = message.match(/^This workspace is (\d+) commits? behind (.+)\.$/);
  if (match) return t("taskDetail.workspace.close.message.behindCommits", { count: Number(match[1]), baseRef: match[2] });
  match = message.match(/^Paperclip will archive this workspace but keep \"([^\"]+)\" because it contains the project workspace\.$/);
  if (match) return t("taskDetail.workspace.close.message.keepProjectWorkspacePath", { path: match[1] });
  return message;
}

export function translateCloseActionLabel(label: string, kind: string, serviceCount: number, t: TFunction) {
  if (kind === "archive_record") return t("taskDetail.workspace.close.action.archiveRecordLabel");
  if (kind === "stop_runtime_services") {
    return t("taskDetail.workspace.close.action.stopRuntimeServiceLabel", { count: serviceCount });
  }
  if (kind === "teardown_command") return t("taskDetail.workspace.close.action.teardownLabel");
  if (kind === "git_worktree_remove") return t("taskDetail.workspace.close.action.removeWorktreeLabel");
  if (kind === "git_branch_delete") return t("taskDetail.workspace.close.action.deleteBranchLabel");
  if (kind === "remove_local_directory") return t("taskDetail.workspace.close.action.removeDirectoryLabel");
  if (label === "Run workspace cleanup command") return t("taskDetail.workspace.close.action.workspaceCleanupLabel");
  if (label === "Run project workspace cleanup command") return t("taskDetail.workspace.close.action.projectCleanupLabel");
  return label;
}

export function translateCloseActionDescription(
  description: string,
  kind: string,
  serviceName: string,
  serviceCount: number,
  t: TFunction,
) {
  const exactDescriptions: Record<string, string> = {
    "Keep the execution workspace history and issue linkage, but remove it from active workspace lists.": "taskDetail.workspace.close.action.archiveRecordDescription",
    "Workspace-specific cleanup runs before teardown.": "taskDetail.workspace.close.action.workspaceCleanupDescription",
    "Project workspace cleanup runs before execution workspace teardown.": "taskDetail.workspace.close.action.projectCleanupDescription",
    "Teardown runs after cleanup commands during workspace close.": "taskDetail.workspace.close.action.teardownDescription",
    "Paperclip will try to delete the runtime-created branch after removing the worktree.": "taskDetail.workspace.close.action.deleteBranchDescription",
  };
  const exactKey = exactDescriptions[description];
  if (exactKey) return t(exactKey);
  if (kind === "stop_runtime_services") {
    return t("taskDetail.workspace.close.action.stopRuntimeServiceDescription", {
      count: serviceCount,
      serviceName,
    });
  }
  let match = description.match(/^Paperclip will run git worktree cleanup for (.+)\.$/);
  if (match) return t("taskDetail.workspace.close.action.removeWorktreeDescription", { path: match[1] });
  match = description.match(/^Paperclip will remove the runtime-created directory at (.+)\.$/);
  if (match) return t("taskDetail.workspace.close.action.removeDirectoryDescription", { path: match[1] });
  return description;
}

export const ISSUE_STATUS_TRANSLATION_KEYS: Record<string, string> = {
  backlog: "backlog",
  todo: "todo",
  in_progress: "inProgress",
  in_review: "inReview",
  blocked: "blocked",
  done: "done",
  cancelled: "cancelled",
};
