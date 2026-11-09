import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { brandChipBadge } from "@/lib/status-colors";
import type { BuiltInAgentStatus } from "@/api/builtInAgents";
import { useTranslation } from "@/i18n";

/**
 * Derived lifecycle chip. Rendered for the amber attention states
 * (`needs_setup`, `pending_approval`). Kept separate from the real agent status
 * (`idle/active/…`) per ux-spec D1.
 */
export function BuiltInLifecycleChip({
  status,
  compact = false,
  className,
}: {
  status: BuiltInAgentStatus;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  if (status !== "needs_setup" && status !== "pending_approval") return null;
  const isPendingApproval = status === "pending_approval";
  const statusKey = isPendingApproval ? "pendingApproval" : "needsSetup";
  return (
    <Badge
      variant="outline"
      className={cn(
        brandChipBadge.amber,
        compact && "px-1.5 py-0 text-(length:--text-nano)",
        className,
      )}
      title={
        t(`agentDirectory.builtInLifecycle.${statusKey}.title` as never)
      }
    >
      {isPendingApproval
        ? t(compact ? "agentDirectory.builtInLifecycle.pendingApproval.compact" : "agentDirectory.builtInLifecycle.pendingApproval.label")
        : t(compact ? "agentDirectory.builtInLifecycle.needsSetup.compact" : "agentDirectory.builtInLifecycle.needsSetup.label")}
    </Badge>
  );
}
