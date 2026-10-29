import type { TFunction } from "i18next";

export type InboxTranslator = TFunction;

export function localizeInboxApprovalLabel(
  type: string,
  subject: string | null,
  fallbackTypeLabel: string,
  t: InboxTranslator,
): string {
  const typeLabel = t(`inbox.approvalTypes.${type}`, { defaultValue: fallbackTypeLabel });
  return subject ? t("inbox.approvalLabelWithSubject", { type: typeLabel, subject }) : typeLabel;
}

export function localizeInboxApprovalStatus(status: string, t: InboxTranslator): string {
  return t(`inbox.approvalStatuses.${status}`, { defaultValue: status.replaceAll("_", " ") });
}

/** Localizes static Inbox group labels while leaving project, workspace, and user names intact. */
export function localizeInboxGroupLabel(
  groupKey: string,
  label: string | null,
  currentUserId: string | null,
  t: TFunction,
): string | null {
  if (!label) return label;

  const normalizedKey = groupKey.replace(/^(archived-search|other-search):/, "");
  switch (normalizedKey) {
    case "issue":
      return t("inbox.groups.tasks");
    case "approval":
      return t("taskCollection.filters.inboxCategory.approvals");
    case "failed_run":
      return t("taskCollection.filters.inboxCategory.failedRuns");
    case "join_request":
      return t("taskCollection.filters.inboxCategory.joinRequests");
    case "project:none":
      return t("taskCollection.hierarchy.noProjectGroup");
    case "workspace:none":
      return t("taskCollection.hierarchy.noWorkspaceGroup");
    case "assignee:none":
      return t("taskCollection.hierarchy.unassignedGroup");
  }

  if (normalizedKey.startsWith("assignee:user:")) {
    const userId = normalizedKey.slice("assignee:user:".length);
    if (userId === currentUserId) return t("inbox.groups.me");
    if (userId === "local-board") return t("inbox.groups.board");
  }

  if (normalizedKey.startsWith("workspace:project:")) {
    if (label === "Default workspace") return t("inbox.groups.defaultWorkspace");
    if (label.endsWith(" (default)")) {
      return t("inbox.groups.defaultWorkspaceNamed", { workspace: label.slice(0, -10) });
    }
  }

  return label;
}
