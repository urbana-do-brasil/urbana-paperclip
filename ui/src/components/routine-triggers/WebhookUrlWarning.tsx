import { InlineBanner } from "@/components/InlineBanner";
import { webhookUrlWarningReason } from "@/lib/webhook-url-warning";
import { useTranslation } from "@/i18n";

export function WebhookUrlWarning({ url }: { url: string }) {
  const { t } = useTranslation();
  const reason = webhookUrlWarningReason(url);
  if (!reason) return null;
  const key = "routines.detail.triggers.urlWarnings." + reason;
  return <InlineBanner tone="warning" title={t(key + ".title")}>
    <div className="space-y-2">
      <p>{t(key + ".message")}</p>
      <p>{t("routines.detail.triggers.urlWarnings.continueNote")}</p>
      <a className="underline underline-offset-4" href="https://docs.paperclip.ing/reference/deploy/https/" target="_blank" rel="noopener noreferrer">{t("routines.detail.triggers.urlWarnings.learnHttps")}</a>
    </div>
  </InlineBanner>;
}
