import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { chatEndpointsApi, type ChatEndpoint } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { useTranslation } from "@/i18n";
import { chatSetupErrorFallback, sanitizedSetupErrorMessage } from "./chat-setup-error";
import { SlackSetupAdvanced } from "./SlackAppDetails";

/** Uses ordinary request-local state: configuration tokens never enter a query/mutation cache. */
export function SlackAutomaticSetup({ endpoint, stage, disabled, saveDetails, onSaved, onBusy,
  onManual, onContinue, onSaveExit }: {
  endpoint: ChatEndpoint;
  stage: "app" | "credentials";
  disabled: boolean;
  saveDetails: () => Promise<void>;
  onSaved: (endpoint: ChatEndpoint) => void;
  onBusy: (busy: boolean) => void;
  onManual: (existing: boolean) => Promise<void>;
  onContinue: () => void;
  onSaveExit: () => void;
}) {
  const { t } = useTranslation();
  const [configurationToken, setConfigurationToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedNoApp, setCheckedNoApp] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const pendingWindow = useRef<Window | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingWindow.current?.close();
      pendingWindow.current = null;
    };
  }, []);
  const registration = endpoint.setup?.slackRegistration;
  const uncertain = registration?.status === "uncertain";
  const creating = registration?.status === "creating";
  const created = Boolean(registration?.appId);
  const configurationPending = registration?.errorCode === "slack_manifest_update_pending";

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError(null);
    try { await action(); }
    catch (failure) {
      const safeError = sanitizedSetupErrorMessage(failure, { configurationToken });
      setError(safeError === chatSetupErrorFallback
        ? t("apps.chatEndpointSetup.slack.automatic.setupErrorFallback")
        : safeError);
    }
    finally {
      setConfigurationToken("");
      setBusy(false);
      onBusy(false);
      inFlight.current = false;
    }
  }

  async function create() {
    // Reserve the window during the click so async app creation cannot trigger a popup blocker.
    const installWindow = window.open("about:blank", "_blank");
    if (installWindow) {
      installWindow.opener = null;
      installWindow.document.title = t("apps.chatEndpointSetup.slack.automatic.preparingWindowTitle");
      installWindow.document.body.textContent = t("apps.chatEndpointSetup.slack.automatic.preparingWindowBody");
      pendingWindow.current = installWindow;
    }
    let token = configurationToken.trim();
    setConfigurationToken("");
    try {
      let next: ChatEndpoint;
      try {
        if (!created) await saveDetails();
        if (registration?.status === "failed" || checkedNoApp) requestId.current = crypto.randomUUID();
        next = await chatEndpointsApi.createSlackApp(endpoint.id, {
          requestId: requestId.current,
          credentials: { configurationToken: token },
          ...(checkedNoApp ? { confirmedNoAppCreated: true } : {}),
        });
      } catch (failure) {
        // A response can be lost after Slack creates the app. Only saved state can advance.
        const current = await chatEndpointsApi.get(endpoint.id).catch(() => null);
        if (current && mounted.current) onSaved(current);
        if (!current?.setup?.slackRegistration?.appId) {
          throw new Error(sanitizedSetupErrorMessage(failure, { configurationToken: token }));
        }
        next = current;
      }
      token = "";
      if (!mounted.current) return;
      setCheckedNoApp(false);
      onSaved(next);
      const saved = next.setup?.slackRegistration;
      if (!saved?.appId) return;
      onContinue();
      // Pending/uncertain configuration and existing installations must not start OAuth.
      if (saved.status !== "install" || saved.errorCode) return;
      if (!installWindow || installWindow.closed) {
        setError(t("apps.chatEndpointSetup.slack.automatic.popupBlockedCreate"));
        return;
      }
      const result = await chatEndpointsApi.installSlackApp(endpoint.id);
      if (!mounted.current) return;
      if (installWindow.closed) {
        setError(t("apps.chatEndpointSetup.slack.automatic.popupBlockedReopen"));
        return;
      }
      installWindow.location.replace(result.authorizationUrl);
      pendingWindow.current = null;
    } finally {
      token = "";
      pendingWindow.current?.close();
      pendingWindow.current = null;
    }
  }

  async function authorize() {
    const result = await chatEndpointsApi.installSlackApp(endpoint.id);
    // Current-tab navigation avoids popup blockers. The callback resumes this saved draft.
    window.location.assign(result.authorizationUrl);
  }

  const registrationError = registration?.errorCode
    ? t(`apps.chatEndpointSetup.slack.automatic.registrationErrors.${registration.errorCode}`, {
        defaultValue: t("apps.chatEndpointSetup.slack.automatic.registrationErrors.generic"),
      })
    : null;

  return <div className="space-y-5">
    {error || registrationError ? <p role="alert" className="text-sm text-destructive">
      {error ?? registrationError}
    </p> : null}
    {(stage === "app" && !created && !creating || configurationPending) && <>
      {uncertain && <div className="space-y-3 text-sm">
        <a href={registration?.managementUrl ?? "https://api.slack.com/apps"} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("apps.chatEndpointSetup.slack.automatic.openAppSettings")} <ExternalLink className="inline size-3" /></a>
        <label className="flex items-center gap-2">
          <Checkbox checked={checkedNoApp} disabled={busy} onCheckedChange={value => setCheckedNoApp(value === true)} />
          {t("apps.chatEndpointSetup.slack.automatic.confirmNoAppCreated")}
        </label>
      </div>}
      {(!uncertain || checkedNoApp) && <div className="space-y-2">
        <Button asChild size="lg" className="mb-4 h-auto w-full whitespace-normal py-4">
          <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">{t("apps.chatEndpointSetup.slack.automatic.getConfigurationToken")} <ExternalLink className="size-4" /></a>
        </Button>
        <div id="slack-configuration-token-help" className="space-y-3 pb-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.findTokenSection")} <strong>{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.slackTokenSection")}</strong> {t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.andChoose")} <strong>{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.slackGenerateToken")}</strong>.</li>
            <li>{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.selectWorkspace")}</li>
            <li>{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.copyToken")} <strong>{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.slackAccessToken")}</strong> {t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.andPaste")}</li>
          </ol>
          <p className="text-muted-foreground">{t("apps.chatEndpointSetup.slack.automatic.tokenInstructions.usage")}</p>
        </div>
        <label htmlFor="slack-configuration-token" className="text-sm font-medium">{t("apps.chatEndpointSetup.slack.automatic.configurationTokenLabel")}</label>
        <Input id="slack-configuration-token" type="password" autoComplete="off" spellCheck={false}
          value={configurationToken} disabled={busy} onChange={event => setConfigurationToken(event.target.value)}
          aria-describedby="slack-configuration-token-help" />
      </div>}
    </>}
    {creating && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("apps.chatEndpointSetup.slack.automatic.creatingStatus")}</p>}
    {created && <p className="text-sm">
      <strong>{endpoint.setup?.slackApp?.appName ?? t("apps.chatEndpointSetup.slack.automatic.yourApp")}</strong> {t("apps.chatEndpointSetup.slack.automatic.createdStatus")}
      {stage === "credentials" && ` ${t("apps.chatEndpointSetup.slack.automatic.approveInstallationDescription")}`}
    </p>}
    {stage === "credentials" && registration?.status === "credentials_saved" && <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("apps.chatEndpointSetup.slack.automatic.credentialsSavedDescription")}</p>
      <Button variant="link" className="h-auto p-0" disabled={busy || disabled} onClick={() => void run(authorize)}>{t("apps.chatEndpointSetup.slack.automatic.authorizeAgain")}</Button>
    </div>}
    {stage === "app" && <SlackSetupAdvanced><div className="flex flex-wrap gap-4 text-sm">
      <Button variant="link" className="h-auto p-0" disabled={busy || creating} onClick={() => void run(() => onManual(false))}>{t("apps.chatEndpointSetup.slack.automatic.createManually")}</Button>
      <Button variant="link" className="h-auto p-0" disabled={busy || creating} onClick={() => void run(() => onManual(true))}>{t("apps.chatEndpointSetup.slack.automatic.useExistingApp")}</Button>
    </div></SlackSetupAdvanced>}
    <SetupWizardFooter onSaveExit={onSaveExit} disabled={busy}>
      {configurationPending ? <Button disabled={busy || disabled || !configurationToken.trim()} onClick={() => void run(create)}>
        {busy && <Loader2 className="size-4 animate-spin" />}{t("apps.chatEndpointSetup.slack.automatic.retryConfiguration")}
      </Button> : stage === "app" ? <Button disabled={busy || disabled || creating || (!created && (!configurationToken.trim() || uncertain && !checkedNoApp))}
        onClick={() => created ? onContinue() : void run(create)}>
        {busy && <Loader2 className="size-4 animate-spin" />}{created ? t("apps.chatEndpointSetup.slack.automatic.continueToInstallation") : t("apps.chatEndpointSetup.slack.automatic.createApp")}
      </Button> : registration?.status === "credentials_saved" ? <Button disabled={busy} onClick={() => void run(async () => onSaved(await chatEndpointsApi.resumeSlackInstallation(endpoint.id)))}>
        {busy && <Loader2 className="size-4 animate-spin" />}{t("apps.chatEndpointSetup.slack.automatic.retryConnecting")}
      </Button> : <Button disabled={busy || !created || disabled} onClick={() => void run(authorize)}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}{t("apps.chatEndpointSetup.slack.automatic.installInSlack")}
      </Button>}
    </SetupWizardFooter>
  </div>;
}
