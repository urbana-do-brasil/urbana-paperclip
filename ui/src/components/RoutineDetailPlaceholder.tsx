import { AlertCircle, Repeat } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTranslation } from "@/i18n";

export function RoutineDetailPlaceholder({
  reason,
  error,
}: {
  reason: "no-organization" | "load-error";
  error?: unknown;
}) {
  const { t } = useTranslation();
  const isLoadError = reason === "load-error";
  const message = isLoadError
    ? error instanceof Error ? error.message : t("routines.detail.loadFailed")
    : t("routines.detail.selectOrganization");

  return <EmptyState icon={isLoadError ? AlertCircle : Repeat} message={message} />;
}
