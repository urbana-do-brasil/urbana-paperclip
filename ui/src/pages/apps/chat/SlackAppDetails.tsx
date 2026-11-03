import type { ReactNode } from "react";
import { ChevronRight, CircleHelp } from "lucide-react";
import { slackAppConfigurationSchema, type SlackAppConfiguration } from "@paperclipai/shared";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n";

export function SlackSetupAdvanced({ children, label }: { children: ReactNode; label?: string }) {
  const { t } = useTranslation();
  const summary = label ?? t("apps.chatEndpointSetup.slack.appDetails.advanced");
  return <details className="group text-sm">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground hover:text-foreground">
      <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />{summary}
    </summary>
    <div className="mt-4 space-y-4">{children}</div>
  </details>;
}

export function SlackAppDetails({ value, readOnly, onChange, onBlur }: {
  value: SlackAppConfiguration;
  readOnly: boolean;
  onChange: (value: SlackAppConfiguration) => void;
  onBlur: () => void;
}) {
  const { t } = useTranslation();
  const validation = slackAppConfigurationSchema.safeParse(value);
  const firstIssue = validation.success ? null : validation.error.issues[0];
  const validationMessage = firstIssue
    ? firstIssue.path[0] === "appName"
      ? firstIssue.code === "too_small"
        ? t("apps.chatEndpointSetup.slack.appDetails.validation.appNameRequired")
        : t("apps.chatEndpointSetup.slack.appDetails.validation.appNameTooLong")
      : firstIssue.path[0] === "botName"
        ? firstIssue.code === "too_small"
          ? t("apps.chatEndpointSetup.slack.appDetails.validation.botNameRequired")
          : firstIssue.code === "too_big"
            ? t("apps.chatEndpointSetup.slack.appDetails.validation.botNameTooLong")
            : t("apps.chatEndpointSetup.slack.appDetails.validation.botNameFormat")
        : firstIssue.code === "too_small"
          ? t("apps.chatEndpointSetup.slack.appDetails.validation.commandRequired")
          : firstIssue.code === "too_big"
            ? t("apps.chatEndpointSetup.slack.appDetails.validation.commandTooLong")
            : t("apps.chatEndpointSetup.slack.appDetails.validation.commandFormat")
    : null;
  return <div className="space-y-3 text-sm">
    {([
      ["appName", t("apps.chatEndpointSetup.slack.appDetails.appName"), 35, t("apps.chatEndpointSetup.slack.appDetails.appNameHelp"), t("apps.chatEndpointSetup.slack.appDetails.appNameHelpAria")],
      ["botName", t("apps.chatEndpointSetup.slack.appDetails.botName"), 80, t("apps.chatEndpointSetup.slack.appDetails.botNameHelp"), t("apps.chatEndpointSetup.slack.appDetails.botNameHelpAria")],
      ["command", t("apps.chatEndpointSetup.slack.appDetails.command"), 32, t("apps.chatEndpointSetup.slack.appDetails.commandHelp"), t("apps.chatEndpointSetup.slack.appDetails.commandHelpAria")],
    ] as const).map(([key, label, maxLength, help, helpAria]) => <div key={key} className="grid items-center gap-2 sm:grid-cols-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={`slack-${key}`}>{label}</label>
        <Tooltip><TooltipTrigger asChild><button type="button" aria-label={helpAria} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button></TooltipTrigger><TooltipContent className="max-w-xs">{help}</TooltipContent></Tooltip>
      </div>
      <Input id={`slack-${key}`} value={value[key]} maxLength={maxLength} readOnly={readOnly}
        aria-invalid={!validation.success && validation.error.issues.some(issue => issue.path[0] === key)}
        onChange={event => onChange({ ...value, [key]: event.target.value })} onBlur={onBlur} />
    </div>)}
    {!validation.success && <p role="alert" className="text-destructive">{validationMessage}</p>}
  </div>;
}
