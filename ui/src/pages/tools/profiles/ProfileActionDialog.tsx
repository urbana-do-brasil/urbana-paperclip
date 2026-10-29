import { AlertTriangle } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProfileActionDialogKind = "archive" | "delete" | "restore";

export function ProfileActionDialog({
  kind,
  profile,
  pending,
  onClose,
  onArchive,
  onRestore,
  onDelete,
}: {
  kind: ProfileActionDialogKind | null;
  profile: ToolProfileWithDetails | null;
  pending: boolean;
  onClose: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  if (!kind || !profile) return null;

  const defaultDeleteBlocked = kind === "delete" && profile.summary.isCompanyDefault;
  const copy = {
    archive: {
      title: t("toolsAdmin.profiles.actions.archiveTitle"),
      body: t("toolsAdmin.profiles.actions.archiveBody", { count: profile.summary.appliesToAgentCount }),
      confirm: t("toolsAdmin.profiles.actions.archiveConfirm"),
      action: onArchive,
    },
    restore: {
      title: t("toolsAdmin.profiles.actions.restoreTitle"),
      body: t("toolsAdmin.profiles.actions.restoreBody"),
      confirm: t("toolsAdmin.profiles.actions.restoreConfirm"),
      action: onRestore,
    },
    delete: {
      title: t("toolsAdmin.profiles.actions.deleteTitle"),
      body: defaultDeleteBlocked
        ? t("toolsAdmin.profiles.actions.deleteDefaultBody")
        : t("toolsAdmin.profiles.actions.deleteAssignments", { count: profile.summary.assignmentCount }),
      confirm: t("toolsAdmin.profiles.actions.deleteConfirm"),
      action: onDelete,
    },
  }[kind];

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        {defaultDeleteBlocked ? (
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("toolsAdmin.profiles.actions.defaultMustMove")}</span>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("toolsAdmin.common.cancel")}</Button>
          <Button
            variant={kind === "delete" ? "destructive" : "default"}
            disabled={pending || defaultDeleteBlocked}
            onClick={copy.action}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
