import { safeWorkspaceRestorePath } from "@paperclipai/shared";

export function workspaceRestoreMarkerDetail(input: {
  result: Record<string, unknown> | null | undefined;
  savedPlan: boolean;
  hasResponse: boolean;
  copy?: {
    restoreFailedAfterPlan: string;
    restoreFailed: string;
    filesNeedRecovery: string;
    noFinalResponse: string;
    affectedPath: (path: string) => string;
  };
}): string {
  const copy = input.copy ?? {
    restoreFailedAfterPlan: "Workspace restore failed after the plan was saved. The saved plan is available.",
    restoreFailed: "Workspace restore failed.",
    filesNeedRecovery: "Workspace files need recovery.",
    noFinalResponse: "No final response was recorded.",
    affectedPath: (path: string) => `Affected path: ${path}.`,
  };
  const parts = [input.savedPlan
    ? copy.restoreFailedAfterPlan
    : copy.restoreFailed];
  parts.push(copy.filesNeedRecovery);
  if (!input.hasResponse && input.result?.finalResponseRecorded === false) {
    parts.push(copy.noFinalResponse);
  }
  const relativePath = safeWorkspaceRestorePath(input.result?.workspaceRestorePath);
  if (relativePath) parts.push(copy.affectedPath(relativePath));
  return parts.join(" ");
}
