import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  AlertCircle,
  Globe,
  GitBranch,
  Radio,
  Webhook,
} from "lucide-react";
import {
  SetupWizardNavigation,
  SetupWizardFooter,
} from "@/components/SetupWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { cn } from "@/lib/utils";
import { t as translate, useTranslation } from "@/i18n";
import { AgentInstructions, CopyField } from "./WebhookFields";
import { WebhookUrlWarning } from "./WebhookUrlWarning";

export type TriggerDraft = {
  kind: "choose" | "schedule" | "webhook";
  step: number;
  availableStep: number;
  sender: "custom" | "github";
  /** Retained when resuming webhooks created before generic signed-app support. */
  signingMode?: "bearer" | "app_webhook" | "fireflies_hmac";
  frequency: string;
  time: string;
  weekday: string;
  timezone: string;
  created: boolean;
};
export const defaultTriggerDraft: TriggerDraft = {
  kind: "choose",
  step: 0,
  availableStep: 0,
  sender: "custom",
  frequency: "weekdays",
  time: "09:00",
  weekday: "Monday",
  timezone: "America/Chicago",
  created: false,
};
export function webhookAgentInstructions(
  sender: TriggerDraft["sender"],
  routineTitle: string,
  webhookUrl: string,
  webhookSecret: string,
  setupPending = true,
  signingMode: TriggerDraft["signingMode"] = "app_webhook",
) {
  const common = [
    translate("routines.detail.triggers.instructions.connect", {
      routineTitle: JSON.stringify(routineTitle),
    }),
    translate("routines.detail.triggers.instructions.webhookUrl", { url: webhookUrl }),
    translate("routines.detail.triggers.instructions.postJson"),
    "Content-Type: application/json",
  ];
  const auth =
    sender === "github"
      ? [
          translate("routines.detail.triggers.instructions.github.addWebhook"),
          translate("routines.detail.triggers.instructions.github.payloadUrl"),
          translate("routines.detail.triggers.instructions.github.secret", { secret: webhookSecret }),
          translate("routines.detail.triggers.instructions.github.signature"),
          translate("routines.detail.triggers.instructions.github.selectEvents"),
          translate("routines.detail.triggers.instructions.github.checkDelivery"),
        ]
      : [
          translate("routines.detail.triggers.instructions.custom.secretKey", { secret: webhookSecret }),
          ...(signingMode === "bearer" ? [] : [
            translate("routines.detail.triggers.instructions.custom.signingSecret", {
              headers: signingMode === "fireflies_hmac"
                ? "X-Hub-Signature"
                : "X-Hub-Signature or X-Hub-Signature-256",
            }),
          ]),
          ...(signingMode === "fireflies_hmac" ? [] : [
            translate("routines.detail.triggers.instructions.custom.bearerHeader", { secret: webhookSecret }),
          ]),
          translate("routines.detail.triggers.instructions.custom.subscribeHttps"),
          translate("routines.detail.triggers.instructions.custom.addWebhook"),
          translate("routines.detail.triggers.instructions.custom.idempotency"),
          translate("routines.detail.triggers.instructions.custom.examplePayload"),
          translate("routines.detail.triggers.instructions.custom.checkDelivery"),
        ];
  return [
    ...common,
    ...auth,
    translate("routines.detail.triggers.instructions.checkConnection"),
    ...(setupPending
      ? [
          translate("routines.detail.triggers.instructions.setupOnly"),
          translate("routines.detail.triggers.instructions.finishSetup"),
        ]
      : [
          translate("routines.detail.triggers.instructions.enabled"),
        ]),
    translate("routines.detail.triggers.instructions.storeKey"),
  ].join("\n");
}
export function describeSchedule(draft: TriggerDraft) {
  const time = draft.time;
  if (draft.frequency === "daily") {
    return translate("routines.detail.triggers.wizard.scheduleSummary.daily", { time });
  }
  if (draft.frequency === "weekly") {
    const day = translate(
      "routines.detail.triggers.schedule.daysFull." + draft.weekday.toLowerCase(),
      { defaultValue: draft.weekday },
    );
    return translate("routines.detail.triggers.wizard.scheduleSummary.weekly", { day, time });
  }
  return translate("routines.detail.triggers.wizard.scheduleSummary.weekdays", { time });
}
export function RoutineTriggerWizard({
  initialDraft,
  onSaveExit,
  onFinish,
  onCreateWebhook,
  onRotateKey,
  routineTitle,
  routineId,
  routineActive = true,
  webhookUrl = "",
  webhookSecret = "",
  checkResult = "waiting",
}: {
  initialDraft: TriggerDraft;
  routineTitle: string;
  routineId: string;
  routineActive?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  onCreateWebhook?: (draft: TriggerDraft) => Promise<void>;
  onRotateKey?: () => Promise<void>;
  onSaveExit: (draft: TriggerDraft) => void | Promise<void>;
  onFinish: (draft: TriggerDraft) => void | Promise<void>;
  checkResult?: "waiting" | "received" | "rejected" | "no_event";
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { setBreadcrumbs } = useBreadcrumbs();
  const perform = useCallback(
    async (action: () => void | Promise<void>) => {
      if (busy) return;
      setBusy(true);
      setSaveError("");
      try {
        await action();
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : t("routines.detail.triggers.errors.saveWizard"),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, t],
  );
  const saveAndExit = useCallback(() => {
    void perform(() => onSaveExit(draft));
  }, [draft, onSaveExit, perform]);
  useEffect(() => {
    setBreadcrumbs([
      {
        label: routineTitle,
        href: `/routines/${routineId}/triggers`,
        onClick: (event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          saveAndExit();
        },
      },
      { label: t("routines.detail.triggers.addTrigger") },
    ]);
  }, [saveAndExit, setBreadcrumbs, routineTitle, routineId, t]);
  const schedule = draft.kind === "schedule";
  const github = draft.sender === "github";
  const labels = schedule
    ? [
        t("routines.detail.triggers.wizard.steps.choose"),
        t("routines.detail.triggers.wizard.steps.schedule"),
        t("routines.detail.triggers.wizard.steps.reviewSchedule"),
      ]
    : [
        t("routines.detail.triggers.wizard.steps.choose"),
        t("routines.detail.triggers.wizard.steps.connectApp"),
        t("routines.detail.triggers.wizard.steps.checkConnection"),
      ];
  function patch(values: Partial<TriggerDraft>) {
    setDraft((current) => ({ ...current, ...values }));
  }
  function advance() {
    void perform(async () => {
      if (draft.kind === "webhook" && draft.step === 0 && !draft.created)
        await onCreateWebhook?.(draft);
      const step = draft.step + 1;
      patch({
        step,
        availableStep: Math.max(draft.availableStep, step),
        created:
          draft.created || (draft.kind === "webhook" && draft.step === 0),
      });
    });
  }
  const title =
    draft.step === 0
      ? t("routines.detail.triggers.wizard.title.choose")
      : schedule
        ? draft.step === 1
          ? t("routines.detail.triggers.wizard.title.setSchedule")
          : t("routines.detail.triggers.wizard.title.reviewSchedule")
        : draft.step === 1
          ? t(github
              ? "routines.detail.triggers.wizard.title.connectGithub"
              : "routines.detail.triggers.wizard.title.connectApp")
          : t("routines.detail.triggers.wizard.title.checkConnection");
  const subtitle =
    draft.step === 0
      ? t("routines.detail.triggers.wizard.subtitle.choose", { routineTitle })
      : schedule
        ? draft.step === 1
          ? t("routines.detail.triggers.wizard.subtitle.schedule")
          : t("routines.detail.triggers.wizard.subtitle.reviewSchedule")
        : draft.step === 1
          ? t("routines.detail.triggers.wizard.subtitle.connectApp")
          : t("routines.detail.triggers.wizard.subtitle.checkConnection");
  const selectClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const goBack = (
    <Button variant="outline" onClick={() => patch({ step: draft.step - 1 })}>
      {t("routines.detail.triggers.wizard.back")}
    </Button>
  );
  return (
    <div className="min-w-0 w-full max-w-2xl space-y-6">
      <SetupWizardNavigation
        takeover
        disabled={busy}
        ariaLabel={t("routines.detail.triggers.wizard.progressAria")}
        labels={labels}
        step={draft.step}
        availableStep={draft.availableStep}
        onSelect={(step) => patch({ step })}
      />
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!schedule && draft.step > 0 && <WebhookUrlWarning url={webhookUrl} />}
        {draft.step === 0 && (
          <fieldset className="space-y-3">
            <legend className="sr-only">{t("routines.detail.triggers.wizard.triggerType")}</legend>
            {(
              [
                {
                  kind: "schedule",
                  labelKey: "scheduleOption",
                  detailKey: "scheduleOptionDescription",
                  Icon: CalendarClock,
                },
                {
                  kind: "webhook",
                  labelKey: "webhookOption",
                  detailKey: "webhookOptionDescription",
                  Icon: Webhook,
                },
              ] as const
            ).map(({ kind, labelKey, detailKey, Icon }) => (
              <label
                key={kind}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-4 focus-within:ring-2 focus-within:ring-ring",
                  draft.kind === kind
                    ? "border-primary bg-accent/30"
                    : "border-border hover:bg-accent/20",
                )}
              >
                <input
                  type="radio"
                  name="trigger-kind"
                  checked={draft.kind === kind}
                  disabled={draft.created && kind !== draft.kind}
                  onChange={() =>
                    patch({
                      kind,
                      availableStep:
                        kind === draft.kind ? draft.availableStep : 0,
                    })
                  }
                  className="sr-only"
                />
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{t(`routines.detail.triggers.wizard.${labelKey}`)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`routines.detail.triggers.wizard.${detailKey}`)}
                  </span>
                </span>
                {draft.kind === kind && <Check className="h-4 w-4" />}
              </label>
            ))}
          </fieldset>
        )}
        {schedule && draft.step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repeat">{t("routines.detail.triggers.wizard.repeat")}</Label>
                <select
                  id="repeat"
                  className={selectClass}
                  value={draft.frequency}
                  onChange={(event) => patch({ frequency: event.target.value })}
                >
                  <option value="daily">{t("routines.detail.triggers.wizard.frequency.daily")}</option>
                  <option value="weekdays">{t("routines.detail.triggers.wizard.frequency.weekdays")}</option>
                  <option value="weekly">{t("routines.detail.triggers.wizard.frequency.weekly")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="run-time">{t("routines.detail.triggers.wizard.time")}</Label>
                <Input
                  id="run-time"
                  type="time"
                  value={draft.time}
                  onChange={(event) => patch({ time: event.target.value })}
                />
              </div>
            </div>
            {draft.frequency === "weekly" && (
              <div className="space-y-2">
                <Label htmlFor="run-day">{t("routines.detail.triggers.wizard.day")}</Label>
                <select
                  id="run-day"
                  className={selectClass}
                  value={draft.weekday}
                  onChange={(event) => patch({ weekday: event.target.value })}
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <option key={day} value={day}>
                      {t(`routines.detail.triggers.schedule.daysFull.${day.toLowerCase()}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="timezone">{t("routines.detail.triggers.schedule.timeZone")}</Label>
              <select
                id="timezone"
                className={selectClass}
                value={draft.timezone}
                onChange={(event) => patch({ timezone: event.target.value })}
              >
                {Array.from(
                  new Set([
                    draft.timezone,
                    "America/Chicago",
                    "America/New_York",
                    "America/Los_Angeles",
                    "Europe/London",
                    "UTC",
                  ]),
                ).map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("routines.detail.triggers.wizard.timeZoneHelp")}
              </p>
            </div>
          </div>
        )}
        {schedule && draft.step === 2 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-md bg-muted/40 p-4">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{describeSchedule(draft)}</p>
                <p className="text-xs text-muted-foreground">
                  {draft.timezone}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("routines.detail.triggers.wizard.scheduleReviewDescription")}
            </p>
          </div>
        )}
        {draft.step === 0 && draft.kind === "webhook" && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              {t("routines.detail.triggers.wizard.senderQuestion")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    sender: "custom",
                    labelKey: "customSender",
                    Icon: Globe,
                  },
                  { sender: "github", labelKey: "githubSender", Icon: GitBranch },
                ] as const
              ).map(({ sender, labelKey, Icon }) => (
                <label
                  key={sender}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 focus-within:ring-2 focus-within:ring-ring",
                    draft.sender === sender
                      ? "border-primary bg-accent/30"
                      : "border-border",
                    draft.created && "cursor-default",
                  )}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="sender"
                    checked={draft.sender === sender}
                    disabled={draft.created}
                    onChange={() => patch({ sender })}
                  />
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{t(`routines.detail.triggers.wizard.${labelKey}`)}</span>
                  {draft.sender === sender && <Check className="h-4 w-4" />}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {draft.kind === "webhook" && draft.step === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("routines.detail.triggers.wizard.publicHttpsRequirement")}
          </p>
        )}
        {!schedule && draft.step === 1 && (
          <div className="space-y-5">
            {webhookSecret && (
              <AgentInstructions
                value={webhookAgentInstructions(
                  draft.sender,
                  routineTitle,
                  webhookUrl,
                  webhookSecret,
                  true,
                  draft.signingMode,
                )}
              />
            )}
            <CopyField
              label={github
                ? t("routines.detail.triggers.wizard.payloadUrl")
                : t("routines.detail.triggers.webhookUrl")}
              value={webhookUrl}
            />
            {!github && draft.signingMode !== "bearer" && (
              <p className="text-sm text-muted-foreground">
                {t("routines.detail.triggers.wizard.signingSecretHelp")}
                {draft.signingMode !== "fireflies_hmac" && <>
                  {" "}{t("routines.detail.triggers.wizard.bearerHeaderHelp")}
                </>}
              </p>
            )}
            {webhookSecret ? (
              <CopyField
                label={github
                  ? t("routines.detail.triggers.wizard.secret")
                  : draft.signingMode === "bearer"
                    ? t("routines.detail.triggers.authorizationHeaderValue")
                    : t("routines.detail.triggers.secretKey")}
                value={!github && draft.signingMode === "bearer" ? `Bearer ${webhookSecret}` : webhookSecret}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("routines.detail.triggers.wizard.keyHiddenAfterExit")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void perform(() => onRotateKey?.())}
                >
                  {t("routines.detail.triggers.wizard.generateNewKey")}
                </Button>
              </div>
            )}
          </div>
        )}
        {!schedule && draft.step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1 rounded-md border border-border p-4">
              <p className="text-sm font-medium">{t("routines.detail.triggers.wizard.connectionTestOnly")}</p>
              <p className="text-sm text-muted-foreground">
                {t("routines.detail.triggers.wizard.connectionTestOnlyDescription")}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("routines.detail.triggers.wizard.sendEventFrom", {
                  sender: github
                    ? t("routines.detail.triggers.wizard.githubSender")
                    : t("routines.detail.triggers.wizard.yourApp"),
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {github
                  ? t("routines.detail.triggers.wizard.githubTestInstructions")
                  : t("routines.detail.triggers.wizard.customTestInstructions")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("routines.detail.triggers.wizard.keepPageOpen")}
              </p>
            </div>
            <div
              role="status"
              className="flex items-start gap-3 rounded-md bg-muted/40 p-4"
            >
              {checkResult === "received" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-(--status-task-done)" />
              ) : checkResult === "rejected" ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              ) : (
                <Radio className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {checkResult === "received"
                    ? t("routines.detail.triggers.wizard.results.received")
                    : checkResult === "rejected"
                      ? t("routines.detail.triggers.wizard.results.rejected")
                      : checkResult === "no_event"
                        ? t("routines.detail.triggers.wizard.results.noEvent")
                        : t("routines.detail.triggers.wizard.results.waiting")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {checkResult === "received"
                    ? t("routines.detail.triggers.wizard.results.receivedDescription")
                    : checkResult === "rejected"
                      ? t("routines.detail.triggers.wizard.results.rejectedDescription")
                      : t("routines.detail.triggers.wizard.results.waitingDescription")}
                </p>
              </div>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {t("routines.detail.triggers.wizard.troubleshoot")}
              </summary>
              <div className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  {t("routines.detail.triggers.wizard.troubleshootDescription")}
                </p>
                <CopyField label={t("routines.detail.triggers.webhookUrl")} value={webhookUrl} />
              </div>
            </details>
          </div>
        )}
        {!schedule && draft.step === 2 && (
          <p className="text-xs text-muted-foreground">
            {routineActive
              ? t("routines.detail.triggers.wizard.finishWebhookActive")
              : t("routines.detail.triggers.wizard.finishWebhookPaused")}
          </p>
        )}
        {schedule && draft.step === 2 && !routineActive && (
          <p className="text-sm text-muted-foreground">
            {t("routines.detail.triggers.wizard.schedulePaused")}
          </p>
        )}
        {saveError && (
          <p role="alert" className="text-sm text-destructive">
            {saveError}
          </p>
        )}
        <SetupWizardFooter onSaveExit={saveAndExit}>
          {draft.step > 0 && goBack}
          {draft.step === 0 ? (
            <Button disabled={draft.kind === "choose"} onClick={advance}>
              {t("routines.detail.triggers.wizard.continue")}
            </Button>
          ) : schedule ? (
            draft.step === 1 ? (
              <Button disabled={!draft.time} onClick={advance}>
                {t("routines.detail.triggers.wizard.reviewSchedule")}
              </Button>
            ) : (
              <Button onClick={() => void perform(() => onFinish(draft))}>
                {t("routines.detail.triggers.wizard.addSchedule")}
              </Button>
            )
          ) : draft.step === 1 ? (
            <Button onClick={advance}>{t("routines.detail.triggers.checkConnection")}</Button>
          ) : (
            <Button onClick={() => void perform(() => onFinish(draft))}>
              {checkResult === "received"
                ? t("routines.detail.triggers.wizard.finishSetup")
                : t("routines.detail.triggers.wizard.finishWithoutChecking")}
            </Button>
          )}
        </SetupWizardFooter>
      </fieldset>
    </div>
  );
}
