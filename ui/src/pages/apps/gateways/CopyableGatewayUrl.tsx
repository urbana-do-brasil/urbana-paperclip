import { Copy } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export function gatewayEndpointUrl(endpointPath: string): string {
  if (typeof window === "undefined") return endpointPath;
  try {
    return new URL(endpointPath, window.location.origin).toString();
  } catch {
    return endpointPath;
  }
}

export function CopyableGatewayUrl({
  endpointPath,
  className,
}: {
  endpointPath: string;
  className?: string;
}) {
  const { pushToast } = useToast();
  const { t } = useTranslation();
  const url = gatewayEndpointUrl(endpointPath);

  async function copy() {
    try {
      await copyTextToClipboard(url);
      pushToast({ title: t("apps.gateways.copyable.copied"), tone: "success" });
    } catch {
      pushToast({
        title: t("apps.gateways.copyable.copyFailed"),
        body: t("apps.gateways.copyable.clipboardUnavailable"),
        tone: "error",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void copy();
      }}
      className={cn(
        "flex min-w-0 max-w-full items-center gap-1 text-left font-mono text-xs text-muted-foreground hover:text-foreground",
        className,
      )}
      title={t("apps.gateways.copyable.title", { url })}
      aria-label={t("apps.gateways.copyable.aria")}
    >
      <span className="min-w-0 truncate">{url}</span>
      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </button>
  );
}
