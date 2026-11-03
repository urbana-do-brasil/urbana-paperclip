import { useId, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export interface SlackAvatarProps {
  agentName: string;
  appName: string;
  avatarUrl: string;
}

/** Manual fallback shared by Slack onboarding and its Settings page. */
export function SlackAvatarContent({
  agentName,
  appName,
  avatarUrl,
  compact = false,
}: SlackAvatarProps & { compact?: boolean }) {
  const { t } = useTranslation();
  const id = useId();
  const filename = `${appName.replace(/[^a-zA-Z0-9_-]+/g, "-") || "agent"}-avatar.png`;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await fetch(avatarUrl);
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/png")
      )
        throw new Error("Avatar unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="space-y-8">
      <section
        aria-labelledby={`${id}-download`}
        className="flex flex-col items-start gap-6 sm:flex-row sm:items-center"
      >
        <img
          src={avatarUrl}
          width={512}
          height={512}
          alt={t("apps.chatEndpointDetail.settings.avatar.imageAlt", { agent: agentName })}
          className="size-40 shrink-0 rounded-lg bg-muted object-contain"
        />
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 id={`${id}-download`} className="text-sm font-semibold">
              {compact
                ? t("apps.chatEndpointDetail.settings.avatar.downloadHeading")
                : t("apps.chatEndpointDetail.settings.avatar.downloadHeadingNumbered")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("apps.chatEndpointDetail.settings.avatar.downloadSpec")}
            </p>
          </div>
          <Button variant="outline" asChild>
            <a
              href={avatarUrl}
              download={filename}
              aria-disabled={downloading}
              onClick={(event) => {
                event.preventDefault();
                void download();
              }}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("apps.chatEndpointDetail.settings.avatar.downloadButton")}
            </a>
          </Button>
          {downloadError && (
            <p role="alert" className="text-sm text-destructive">
              {t("apps.chatEndpointDetail.settings.avatar.downloadFailed")}
            </p>
          )}
        </div>
      </section>

      <details open={compact ? undefined : true} className="space-y-4">
        <summary
          className={
            compact
              ? "cursor-pointer text-sm underline underline-offset-4"
              : "hidden"
          }
        >
          {t("apps.chatEndpointDetail.settings.avatar.howToUpload")}
        </summary>
        <section aria-labelledby={`${id}-upload`} className="space-y-4">
          <div className="space-y-1">
            <h2 id={`${id}-upload`} className="text-sm font-semibold">
              {compact
                ? t("apps.chatEndpointDetail.settings.avatar.uploadHeading")
                : t("apps.chatEndpointDetail.settings.avatar.uploadHeadingNumbered")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("apps.chatEndpointDetail.settings.avatar.uploadDescription")}
            </p>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li>
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {t("apps.chatEndpointDetail.settings.avatar.openSlackSettings")}{" "}
                <ExternalLink className="inline size-3" />
              </a>{" "}
              {t("apps.chatEndpointDetail.settings.avatar.chooseApp", { app: appName })}
            </li>
            <li>
              {t("apps.chatEndpointDetail.settings.avatar.chooseBasicInformationBefore")} <strong>{t("apps.chatEndpointDetail.settings.avatar.slackUiBasicInformation")}</strong>, {t("apps.chatEndpointDetail.settings.avatar.chooseBasicInformationAfter")} <strong>{t("apps.chatEndpointDetail.settings.avatar.slackUiDisplayInformation")}</strong>.
            </li>
            <li>
              {t("apps.chatEndpointDetail.settings.avatar.uploadAppIconBeforeLabel")}{" "}<strong>{t("apps.chatEndpointDetail.settings.avatar.slackUiAppIconPreview")}</strong>{" "}{t("apps.chatEndpointDetail.settings.avatar.uploadAppIconAfterLabel")}{" "}
              <span className="break-all font-mono text-xs">{filename}</span>.
            </li>
            <li>
              {t("apps.chatEndpointDetail.settings.avatar.confirmCropBeforeSave")} <strong>{t("apps.chatEndpointDetail.settings.avatar.slackUiSaveChanges")}</strong> {t("apps.chatEndpointDetail.settings.avatar.confirmCropAfterSave")}
            </li>
          </ol>
        </section>
      </details>
    </div>
  );
}


export function SlackAvatarSettings(props: SlackAvatarProps) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4" aria-label={t("apps.chatEndpointDetail.settings.avatar.sectionAria")}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("apps.chatEndpointDetail.settings.avatar.sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("apps.chatEndpointDetail.settings.avatar.sectionDescription", { agent: props.agentName })}
        </p>
      </div>
      <SlackAvatarContent {...props} compact />
    </section>
  );
}
