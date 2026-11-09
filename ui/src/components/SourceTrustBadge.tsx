import type { SourceTrustMetadata } from "@paperclipai/shared";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatDateTime } from "../lib/utils";
import { useTranslation } from "@/i18n";

export function SourceTrustBadge({
  sourceTrust,
  artifactLabel = "content",
  className,
}: {
  sourceTrust: SourceTrustMetadata | null | undefined;
  artifactLabel?: "comment" | "document" | "work product" | "content";
  className?: string;
}) {
  const { t } = useTranslation();
  const label = !sourceTrust || sourceTrust.preset !== "low_trust_review"
    ? null
    : sourceTrust.disposition === "promoted"
      ? t("trustPolicy.promotedLabel")
      : t("trustPolicy.lowTrustLabel");
  if (!label) return null;

  const promoted = sourceTrust?.disposition === "promoted";
  const tooltip = promoted
    ? sourceTrust.promotedAt
      ? t("trustPolicy.promotedAt", { date: formatDateTime(sourceTrust.promotedAt) })
      : t("trustPolicy.promoted")
    : t("trustPolicy.rawArtifact", {
      artifact: t(`trustPolicy.artifacts.${artifactLabel === "work product" ? "workProduct" : artifactLabel}`),
    });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          aria-label={label}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-0 text-(length:--text-nano) font-medium tracking-normal",
            promoted
              ? "border-border text-muted-foreground"
              : "border-amber-500/40 text-amber-700 dark:text-amber-100",
            className,
          )}
        >
          {promoted ? <BadgeCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
