import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatchInstanceGeneralSettings, BackupRetentionPolicy } from "@paperclipai/shared";
import {
  DAILY_RETENTION_PRESETS,
  WEEKLY_RETENTION_PRESETS,
  MONTHLY_RETENTION_PRESETS,
  DEFAULT_BACKUP_RETENTION,
} from "@paperclipai/shared";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { healthApi } from "@/api/health";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { ModeBadge } from "@/components/access/ModeBadge";
import { Button } from "../components/ui/button";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "../lib/utils";
import { useSignOut } from "@/hooks/useSignOut";
import { useTranslation } from "@/i18n";

const FEEDBACK_TERMS_URL = import.meta.env.VITE_FEEDBACK_TERMS_URL?.trim() || "https://paperclip.ing/tos";

export function InstanceGeneralSettings({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const signOutMutation = useSignOut();

  useEffect(() => {
    if (embedded) return;
    setBreadcrumbs([
      { label: t("settingsNav.title"), href: "/company/settings" },
      { label: t("settingsNav.general") },
    ]);
  }, [embedded, setBreadcrumbs, t]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });
  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });

  const updateGeneralMutation = useMutation({
    mutationFn: instanceSettingsApi.updateGeneral,
    onMutate: () => {
      setActionError(null);
      signOutMutation.reset();
    },
    onSuccess: async () => {
      setActionError(null);
      signOutMutation.reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceGeneral.errors.updateFailed"));
    },
  });

  if (generalQuery.isLoading || healthQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("instanceGeneral.loading")}</div>;
  }

  if (generalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {generalQuery.error instanceof Error
          ? generalQuery.error.message
          : t("instanceGeneral.errors.loadFailed")}
      </div>
    );
  }

  const censorUsernameInLogs = generalQuery.data?.censorUsernameInLogs === true;
  const feedbackDataSharingPreference = generalQuery.data?.feedbackDataSharingPreference ?? "prompt";
  const backupRetention: BackupRetentionPolicy = generalQuery.data?.backupRetention ?? DEFAULT_BACKUP_RETENTION;
  const hiddenSettings = new Set(healthQuery.data?.hiddenSettings ?? []);
  const showDeploymentStatus = !hiddenSettings.has("instance.general.deploymentStatus");
  const showCensorUsernameInLogs = !hiddenSettings.has("instance.general.censorUsernameInLogs");
  const showBackupRetention = !hiddenSettings.has("instance.general.backupRetention");
  const showFeedbackDataSharing = !hiddenSettings.has("instance.general.feedbackDataSharingPreference");
  const showSignOut = !hiddenSettings.has("instance.general.signOut");
  const visibleTopics = [
    ...(showCensorUsernameInLogs ? [t("instanceGeneral.topics.logDisplay")] : []),
    ...(showBackupRetention ? [t("instanceGeneral.topics.backupRetention")] : []),
    ...(showFeedbackDataSharing ? [t("instanceGeneral.topics.dataSharing")] : []),
  ];
  const topicSummary = new Intl.ListFormat(i18n.resolvedLanguage ?? "en", {
    style: "long",
    type: "conjunction",
  }).format(visibleTopics);
  const visibleActionError = signOutMutation.error instanceof Error
    ? signOutMutation.error.message
    : signOutMutation.error
      ? t("instanceGeneral.errors.signOutFailed")
      : actionError;

  return (
    <div data-testid="instance-general-settings" className={embedded ? "space-y-8" : "max-w-4xl space-y-8"}>
      {!embedded ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">{t("instanceGeneral.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("instanceGeneral.description")}
            {visibleTopics.length > 0 ? <> {t("instanceGeneral.descriptionIncluding", { topics: topicSummary })}</> : "."}
          </p>
        </div>
      ) : null}

      {visibleActionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {visibleActionError}
        </div>
      )}

      {showDeploymentStatus && (
      <section data-testid="instance-general-deployment">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{t("instanceGeneral.deployment.title")}</h2>
            <ModeBadge
              deploymentMode={healthQuery.data?.deploymentMode}
              deploymentExposure={healthQuery.data?.deploymentExposure}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {healthQuery.data?.deploymentMode === "local_trusted"
              ? t("instanceGeneral.deployment.localTrustedDescription")
              : healthQuery.data?.deploymentExposure === "public"
                ? t("instanceGeneral.deployment.publicDescription")
                : t("instanceGeneral.deployment.privateDescription")}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <StatusBox
              label={t("instanceGeneral.deployment.authReadiness")}
              value={healthQuery.data?.authReady ? t("instanceGeneral.status.ready") : t("instanceGeneral.status.notReady")}
            />
            <StatusBox
              label={t("instanceGeneral.deployment.bootstrapStatus")}
              value={healthQuery.data?.bootstrapStatus === "bootstrap_pending" ? t("instanceGeneral.status.setupRequired") : t("instanceGeneral.status.ready")}
            />
            <StatusBox
              label={t("instanceGeneral.deployment.bootstrapInvite")}
              value={healthQuery.data?.bootstrapInviteActive ? t("instanceGeneral.status.active") : t("instanceGeneral.status.none")}
            />
          </div>
        </div>
      </section>
      )}

      {showCensorUsernameInLogs && (
      <section data-testid="instance-general-log-censor">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneral.logCensor.title")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.logCensor.description")}
            </p>
          </div>
          <ToggleSwitch
            checked={censorUsernameInLogs}
            onCheckedChange={() => updateGeneralMutation.mutate({ censorUsernameInLogs: !censorUsernameInLogs })}
            disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
            aria-label={t("instanceGeneral.logCensor.toggle")}
          />
        </div>
      </section>
      )}

      {showBackupRetention && (
      <section data-testid="instance-general-backup-retention">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneral.backupRetention.title")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.backupRetention.description")}
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("instanceGeneral.backupRetention.daily")}</h3>
            <div className="flex flex-wrap gap-2">
              {DAILY_RETENTION_PRESETS.map((days) => {
                const active = backupRetention.dailyDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, dailyDays: days },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{t("instanceGeneral.backupRetention.days", { count: days })}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("instanceGeneral.backupRetention.weekly")}</h3>
            <div className="flex flex-wrap gap-2">
              {WEEKLY_RETENTION_PRESETS.map((weeks) => {
                const active = backupRetention.weeklyWeeks === weeks;
                const label = t("instanceGeneral.backupRetention.weeks", { count: weeks });
                return (
                  <button
                    key={weeks}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, weeklyWeeks: weeks },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("instanceGeneral.backupRetention.monthly")}</h3>
            <div className="flex flex-wrap gap-2">
              {MONTHLY_RETENTION_PRESETS.map((months) => {
                const active = backupRetention.monthlyMonths === months;
                const label = t("instanceGeneral.backupRetention.months", { count: months });
                return (
                  <button
                    key={months}
                    type="button"
                    disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, monthlyMonths: months },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {showFeedbackDataSharing && (
      <section data-testid="instance-general-feedback-sharing">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneral.feedbackSharing.title")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.feedbackSharing.description")}
            </p>
            {FEEDBACK_TERMS_URL ? (
              <a
                href={FEEDBACK_TERMS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("instanceGeneral.feedbackSharing.readTerms")}
              </a>
            ) : null}
          </div>
          {feedbackDataSharingPreference === "prompt" ? (
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm text-muted-foreground">
              {t("instanceGeneral.feedbackSharing.promptNotice")}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: "allowed",
                label: t("instanceGeneral.feedbackSharing.alwaysAllow"),
                description: t("instanceGeneral.feedbackSharing.alwaysAllowDescription"),
              },
              {
                value: "not_allowed",
                label: t("instanceGeneral.feedbackSharing.dontAllow"),
                description: t("instanceGeneral.feedbackSharing.dontAllowDescription"),
              },
            ].map((option) => {
              const active = feedbackDataSharingPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={updateGeneralMutation.isPending || signOutMutation.isPending}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-background hover:bg-accent/50",
                  )}
                  onClick={() =>
                    updateGeneralMutation.mutate({
                      feedbackDataSharingPreference: option.value as
                        | "allowed"
                        | "not_allowed",
                    })
                  }
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("instanceGeneral.feedbackSharing.debugBeforeKey")} <code>feedbackDataSharingPreference</code>{" "}
            {t("instanceGeneral.feedbackSharing.debugAfterKey")} <code>instance_settings.general</code>{" "}
            {t("instanceGeneral.feedbackSharing.debugRowSuffix")} <code>"prompt"</code>.{" "}
            {t("instanceGeneral.feedbackSharing.debugPromptPrefix")} <code>"prompt"</code>{" "}
            {t("instanceGeneral.feedbackSharing.debugPromptSuffix")}
          </p>
        </div>
      </section>

      )}

      {showSignOut && (
      <section data-testid="instance-general-sign-out">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneral.signOut.title")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneral.signOut.description")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={signOutMutation.isPending || updateGeneralMutation.isPending}
            onClick={() => {
              setActionError(null);
              signOutMutation.mutate();
            }}
          >
            <LogOut className="size-4" />
            {signOutMutation.isPending ? t("instanceGeneral.signOut.pending") : t("instanceGeneral.signOut.action")}
          </Button>
        </div>
      </section>
      )}
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
