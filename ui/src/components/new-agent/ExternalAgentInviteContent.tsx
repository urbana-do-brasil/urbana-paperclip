import { Link } from "@/lib/router";
import { ArrowLeft, Check, Circle, CircleAlert, Loader2 } from "lucide-react";
import { AdapterMark } from "../AdapterMark";
import { AgentSetupPrompt } from "../AgentSetupPrompt";
import { Button } from "../ui/button";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export type ExternalAgentPreset = "dot" | "hermes" | "other";
export type DotConnectionState = {
  phase: "waiting" | "connected" | "subscribed" | "testing" | "finishing" | "ready";
  problem?: "event_timeout" | "prompt_unavailable" | "offline" | "agent_unavailable";
};

const presets = [
  { id: "dot", nameKey: "externalAgentInvite.presets.dotName", adapter: "openai_dot", descriptionKey: "externalAgentInvite.presets.dotDescription" },
  { id: "hermes", nameKey: "externalAgentInvite.presets.hermesName", adapter: "hermes_gateway", descriptionKey: "externalAgentInvite.presets.hermesDescription" },
  { id: "other", nameKey: "externalAgentInvite.presets.otherName", adapter: "http", descriptionKey: "externalAgentInvite.presets.otherDescription" },
] as const;

export function ExternalAgentPresetPicker({ onSelect, dotDisabledReason }: { onSelect: (preset: ExternalAgentPreset) => void; dotDisabledReason?: string }) {
  const { t } = useTranslation();
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {presets.map(preset => <button
      key={preset.id}
      type="button"
      onClick={() => onSelect(preset.id)}
      disabled={preset.id === "dot" && !!dotDisabledReason}
      title={preset.id === "dot" ? dotDisabledReason : undefined}
      className="flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-3 py-4 text-center transition-colors disabled:opacity-50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <AdapterMark type={preset.adapter} className="size-8" />
      <span className="text-sm font-medium">{t(preset.nameKey)}</span>
      <span className="sr-only">{t(preset.descriptionKey)}</span>
    </button>)}
  </div>;
}

const checks = [
  { titleKey: "externalAgentInvite.checks.connected", descriptionKey: "externalAgentInvite.checks.connectedDescription" },
  { titleKey: "externalAgentInvite.checks.taskUpdates", descriptionKey: "externalAgentInvite.checks.taskUpdatesDescription" },
  { titleKey: "externalAgentInvite.checks.testEvent", descriptionKey: "externalAgentInvite.checks.testEventDescription" },
] as const;

/** Controlled by server evidence in the invite controller, never by copying a prompt. */
export function DotConnectionChecks({ state }: { state: DotConnectionState }) {
  const { t } = useTranslation();
  const completed = { waiting: 0, connected: 1, subscribed: 2, testing: 2, finishing: 3, ready: 3 }[state.phase];
  const message = state.problem === "agent_unavailable" ? t("externalAgentInvite.checks.agentUnavailable")
    : state.problem === "offline" ? t("externalAgentInvite.checks.offline")
    : state.problem === "prompt_unavailable" ? t("externalAgentInvite.checks.promptReplaced")
    : state.problem === "event_timeout" ? t("externalAgentInvite.checks.eventTimeout")
    : state.phase === "finishing" ? t("externalAgentInvite.checks.finishing")
    : state.phase === "ready" ? t("externalAgentInvite.checks.ready")
    : state.phase === "waiting" ? t("externalAgentInvite.checks.watching")
    : state.phase === "connected" ? t("externalAgentInvite.checks.connectedWaiting")
    : t("externalAgentInvite.checks.waitingForTest");
  return <section aria-label={t("externalAgentInvite.checks.ariaLabel")} className="space-y-4">
    <ol className="space-y-4">
      {checks.map((check, index) => {
        const done = index < completed;
        const failed = index === completed && state.problem === "event_timeout";
        const active = index === completed && !state.problem;
        const Icon = done ? Check : failed ? CircleAlert : active ? Loader2 : Circle;
        return <li key={check.titleKey} className="flex items-start gap-3" aria-current={active ? "step" : undefined}>
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", done ? "bg-accent text-foreground" : failed ? "text-destructive" : "text-muted-foreground")}>
            <Icon className={cn("size-4", active && "animate-spin motion-reduce:animate-none")} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm", done || active || failed ? "font-medium" : "text-muted-foreground")}>
              {t(check.titleKey)}<span className="sr-only">{done ? `: ${t("externalAgentInvite.checks.complete")}` : failed ? `: ${t("externalAgentInvite.checks.needsAttention")}` : active ? `: ${t("externalAgentInvite.checks.inProgress")}` : `: ${t("externalAgentInvite.checks.waiting")}`}</span>
            </p>
            {done && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(check.descriptionKey)}</p>}
          </div>
        </li>;
      })}
    </ol>
    <p role={state.problem && state.problem !== "prompt_unavailable" ? "alert" : "status"} aria-live="polite" className={cn("text-sm leading-relaxed", state.problem && state.problem !== "prompt_unavailable" ? "text-destructive" : "text-muted-foreground")}>{message}</p>
  </section>;
}

/** Shared presentation for the invitation flow. The caller owns invitations and watching. */
export function ExternalAgentInviteContent({
  preset, prompt, companyName, connection, onSelect, onBack, onClose, onCopied, onRetry, onNewPrompt,
  dotDisabledReason, busy = false, error, approvalHref,
}: {
  dotDisabledReason?: string;
  busy?: boolean;
  error?: string;
  approvalHref?: string;
  preset: ExternalAgentPreset | null;
  prompt: string;
  companyName: string;
  connection: DotConnectionState;
  onSelect: (preset: ExternalAgentPreset) => void;
  onBack: () => void;
  onClose: () => void;
  onCopied: () => void;
  onRetry: () => void;
  onNewPrompt: () => void;
}) {
  const { t } = useTranslation();
  const provider = presets.find(item => item.id === preset);
  const dot = preset === "dot";
  const ready = dot && connection.phase === "ready" && !connection.problem;
  const connecting = dot && connection.phase !== "waiting";
  const agentLabel = preset === "hermes"
    ? t("externalAgentInvite.agentLabels.hermes")
    : t("externalAgentInvite.agentLabels.generic");
  const progressLabel = connection.problem === "agent_unavailable" ? t("externalAgentInvite.progress.agentUnavailable")
    : connection.problem === "offline" ? t("externalAgentInvite.progress.updatesPaused")
    : connection.problem === "event_timeout" ? t("externalAgentInvite.progress.needsAttention")
    : connection.phase === "finishing" ? t("externalAgentInvite.progress.finishing")
    : connection.phase === "connected" ? t("externalAgentInvite.progress.connecting") : t("externalAgentInvite.progress.confirming");
  const title = !provider ? t("externalAgentInvite.title.inviteExternal")
    : dot ? ready ? t("externalAgentInvite.title.dotConnected") : t("externalAgentInvite.title.connectDot")
    : preset === "hermes" ? t("externalAgentInvite.title.inviteHermes") : t("externalAgentInvite.title.inviteAgent");
  const description = !provider ? t("externalAgentInvite.description.bringAgent", { companyName })
    : ready ? t("externalAgentInvite.description.dotReady", { companyName })
    : connection.problem === "agent_unavailable" ? t("externalAgentInvite.description.dotUnavailable")
    : connection.phase === "finishing" ? t("externalAgentInvite.description.dotFinishing")
    : connecting ? t("externalAgentInvite.description.dotChecking")
    : dot ? t("externalAgentInvite.description.dotPairingPrompt")
    : t("externalAgentInvite.description.sendInvitePrompt", { agentLabel });
  return <>
    <div className="min-h-0 space-y-6 overflow-y-auto px-6 pb-6 pt-8 sm:px-8">
      <div className="space-y-3 pr-5">
        {provider && <AdapterMark type={provider.adapter} className="size-10" />}
        <div className="space-y-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </div>
      </div>
      {error && <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error}</p><Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentInvite.actions.tryAgain")}</Button></div>}
      {!provider ? <><ExternalAgentPresetPicker onSelect={onSelect} dotDisabledReason={dotDisabledReason} />
        {dotDisabledReason && <p className="text-sm text-muted-foreground">{dotDisabledReason}</p>}</>
        : approvalHref ? <p className="text-sm text-muted-foreground">{t("externalAgentInvite.description.approvalRequired")}</p>
        : busy && !prompt && connection.phase === "waiting" ? <p role="status" className="text-sm text-muted-foreground">{t("externalAgentInvite.description.preparingInvitation")}</p> : dot ? <>
        <div className="border-t pt-6"><DotConnectionChecks state={connection} />
          {connection.phase === "waiting" && <p className="mt-4 text-xs text-muted-foreground">{t("externalAgentInvite.description.dotCost")}</p>}</div>
        {connection.problem === "event_timeout" && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentInvite.actions.retryTestEvent")}</Button>}
        {connection.problem === "offline" && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentInvite.actions.reconnectUpdates")}</Button>}
      </> : <p className="text-sm leading-relaxed text-muted-foreground">{t("externalAgentInvite.description.invitationReady", { companyName })}</p>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
      <Button variant="ghost" onClick={provider ? onBack : onClose}>
        {provider && <ArrowLeft className="size-4" />}{provider ? t("externalAgentInvite.actions.back") : t("externalAgentInvite.actions.cancel")}
      </Button>
      {provider && (approvalHref ? <Button asChild><Link to={approvalHref} onClick={onClose}>{t("externalAgentInvite.actions.reviewApproval")}</Link></Button>
        : ready ? <Button onClick={onClose}>{t("externalAgentInvite.actions.done")}</Button>
        : connecting ? <Button disabled aria-live="polite">
          {!connection.problem && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {progressLabel}
        </Button>
        : dot && connection.problem === "prompt_unavailable" ? <Button disabled={busy} onClick={onNewPrompt}>{t("externalAgentInvite.actions.newPrompt")}</Button>
        : !prompt || busy ? <Button disabled>{busy ? t("externalAgentInvite.actions.preparing") : t("externalAgentInvite.actions.waitingForDot")}</Button>
        : <AgentSetupPrompt
          key={preset}
          prompt={prompt}
          label={dot ? t("externalAgentInvite.actions.copySetupPrompt") : t("externalAgentInvite.actions.copyInvitationPrompt")}
          title={dot ? t("externalAgentInvite.actions.connectDot") : t("externalAgentInvite.actions.inviteAgent")}
          description={dot ? t("externalAgentInvite.actions.sendDotPrompt") : t("externalAgentInvite.actions.sendAgentPrompt")}
          agent={dot ? { name: "Dot", src: "/brands/adapters/openai-dot.svg" } : undefined}
          align="end"
          className="min-w-0 shrink"
          onCopied={onCopied}
        />)}
    </div>
  </>;
}
