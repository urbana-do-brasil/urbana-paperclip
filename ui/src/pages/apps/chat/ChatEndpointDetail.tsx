import { Identity } from "@/components/Identity";
import { SlackSetupAdvanced } from "./SlackAppDetails";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SlackToolsSettings, SlackSearchAccess } from "./SlackToolSettings";
import { defaultSlackAppName } from "./slack-app-name";
import { ChatCommunicationInstructions } from "./ChatCommunicationInstructions";
import { SlackAvatarSettings } from "./SlackAvatarStep";
import { agentsApi } from "@/api/agents";
import { agentAvatarUrl } from "@/lib/agent-avatar-url";
import { resolveAgentAppearance } from "@paperclipai/shared";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ChatConversationList } from "./ChatConversationList";
import { GitHubBotManagement, GitHubReviews } from "./GitHubBotManagement";
import { GitHubBotMention, GitHubAppIdentityActions } from "./GitHubAppIdentity";
import { GitHubConnectionComplete, type GitHubConnectionCompleteLocationState } from "./GitHubConnectionComplete";
import { EmailEndpointSettings } from "./EmailEndpointSetup";
import { EmailConnectionAccess } from "@/components/EmailConnectionAccess";
import { emailApi } from "@/api/email";
import { toolsApi } from "@/api/tools";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Check,
  Activity as ActivityIcon,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Unlink,
} from "lucide-react";
import {
  chatEndpointsApi,
  type ChatActivityItem,
  type ChatEndpoint,
  type ChatEndpointResource,
  type ChatProvider,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AppLogo } from "../AppLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useToast } from "@/context/ToastContext";
import { t as translate, useTranslation } from "@/i18n";
import { formatDateTime } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { copyTextToClipboard } from "@/lib/clipboard";
import { Link, Navigate, useLocation, useNavigate, useParams } from "@/lib/router";

const tabs = ["settings", "access", "reviews", "conversations", "activity"] as const;
type ChatTab = (typeof tabs)[number];
const tabLabelKeys: Record<ChatTab, string> = {
  settings: "apps.chatEndpointDetail.tabs.settings",
  access: "apps.chatEndpointDetail.tabs.access",
  reviews: "apps.chatEndpointDetail.tabs.reviews",
  conversations: "apps.chatEndpointDetail.tabs.conversations",
  activity: "apps.chatEndpointDetail.tabs.activity",
};
const providerNames: Record<ChatProvider, string> = {
  speko: "Speko",
  agentmail: "AgentMail",
  slack: "Slack",
  github: "GitHub",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
  "imessage-photon": "iMessage Photon",
};

const activityKindKeys: Record<ChatActivityItem["kind"], string> = {
  delivery: "apps.chatEndpointDetail.activity.kinds.delivery",
  publication: "apps.chatEndpointDetail.activity.kinds.publication",
  action: "apps.chatEndpointDetail.activity.kinds.action",
  health: "apps.chatEndpointDetail.activity.kinds.health",
  repair: "apps.chatEndpointDetail.activity.kinds.repair",
};

const providerLifecycleGuidanceKeys: Record<ChatProvider, { reconnect: string; remove: string }> = {
  speko: {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.speko",
    remove: "apps.chatEndpointDetail.lifecycle.remove.speko",
  },
  agentmail: {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.agentmail",
    remove: "apps.chatEndpointDetail.lifecycle.remove.agentmail",
  },
  slack: {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.slack",
    remove: "apps.chatEndpointDetail.lifecycle.remove.slack",
  },
  github: {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.github",
    remove: "apps.chatEndpointDetail.lifecycle.remove.github",
  },
  discord: {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.discord",
    remove: "apps.chatEndpointDetail.lifecycle.remove.discord",
  },
  "microsoft-teams": {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.microsoftTeams",
    remove: "apps.chatEndpointDetail.lifecycle.remove.microsoftTeams",
  },
  "imessage-photon": {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.imessagePhoton",
    remove: "apps.chatEndpointDetail.lifecycle.remove.imessagePhoton",
  },
  telegram: {
    reconnect: "apps.chatEndpointDetail.lifecycle.reconnect.telegram",
    remove: "apps.chatEndpointDetail.lifecycle.remove.telegram",
  },
};

const replayableFailureStates = new Set(["failed"]);
// Provider callbacks do not necessarily emit a Board activity event. Refresh
// only mounted operational views, and stop polling when the browser is hidden.
const liveChatQueryOptions = {
  staleTime: 0,
  refetchInterval: 5_000,
  refetchIntervalInBackground: false,
} as const;

export function isReplayEligible(item: ChatActivityItem): boolean {
  if (
    item.fileTransfer ||
    !item.replayable ||
    !replayableFailureStates.has(item.status)
  ) {
    return false;
  }
  if (item.kind === "delivery") return item.status === "failed";
  return item.kind === "publication";
}

export function activityResolutionActions(item: ChatActivityItem) {
  const offered = item.resolutionActions ?? [];
  if (!item.fileTransfer) return offered;
  if (
    item.kind !== "publication" ||
    !Number.isSafeInteger(item.fileTransfer.version) ||
    item.fileTransfer.version < 1
  )
    return [];
  if (
    ![
      "consent_unknown",
      "upload_unknown",
      "file_info_unknown",
      "conflict",
    ].includes(item.fileTransfer.phase)
  )
    return [];
  // Only the file-info stage can use ordinary visible-delivery resolution.
  // Earlier consent/upload evidence must not be fabricated by these buttons.
  return item.fileTransfer.phase === "file_info_unknown"
    ? offered
    : offered.filter((action) => action === "cancel");
}

export function activityResolutionDescription(item: ChatActivityItem, t: typeof translate = translate): string {
  const phase = item.fileTransfer?.phase;
  if (phase === "file_info_unknown")
    return t("apps.chatEndpointDetail.activity.resolution.fileInfoUnknown");
  if (phase === "consent_unknown")
    return t("apps.chatEndpointDetail.activity.resolution.consentUnknown");
  if (phase)
    return t("apps.chatEndpointDetail.activity.resolution.fileTransferUnknown");
  return t("apps.chatEndpointDetail.activity.resolution.deliveryUnknown");
}

export function isResolutionEligible(item: ChatActivityItem): boolean {
  return (
    (item.kind === "publication" || item.kind === "action") &&
    item.status === "delivery_unknown" &&
    activityResolutionActions(item).length > 0
  );
}

export function isIndividuallyToggleableResource(
  provider: ChatProvider,
  resourceType: string,
): boolean {
  return !(
    provider === "microsoft-teams" &&
    (resourceType === "direct_message" || resourceType === "group_chat")
  );
}

function activityDetailLabel(item: ChatActivityItem, t: typeof translate = translate): string {
  return replayableFailureStates.has(item.status)
    ? t("apps.chatEndpointDetail.activity.reason")
    : t("apps.chatEndpointDetail.activity.details");
}

export function connectionHealthPresentation(
  endpoint: Pick<ChatEndpoint, "status" | "healthMessage" | "lastError">,
  t: typeof translate = translate,
) {
  // Health events outlive pause/removal. They are history, not lifecycle state.
  const lifecycleMessages = {
    draft: t("apps.chatEndpointDetail.activity.connectionSetupIncomplete"),
    verifying: t("apps.chatEndpointDetail.activity.connectionVerificationInProgress"),
    paused: t("apps.chatEndpointDetail.activity.connectionPaused"),
    attention: t("apps.chatEndpointDetail.activity.connectionNeedsAttention"),
    revoked: t("apps.chatEndpointDetail.activity.connectionAccessRevoked"),
    archived: t("apps.chatEndpointDetail.activity.connectionRemoved"),
  };
  const lifecycleMessage =
    endpoint.status === "active" ? null : lifecycleMessages[endpoint.status];
  return {
    message: lifecycleMessage ?? endpoint.healthMessage ?? null,
    previousHealth: lifecycleMessage ? (endpoint.healthMessage ?? null) : null,
    error: endpoint.lastError ?? null,
    errorLabel: ["active", "attention", "revoked"].includes(endpoint.status)
      ? t("apps.chatEndpointDetail.activity.reason")
      : t("apps.chatEndpointDetail.activity.lastReportedError"),
  };
}

export function ChatEndpointDetail() {
  const { t } = useTranslation();
  const { endpointId = "", tab: routeTab, reviewId } = useParams<{
    endpointId: string;
    tab?: string;
    reviewId?: string;
  }>();
  const tab = reviewId ? "reviews" : (routeTab ?? "settings");
  const activeTab = tabs.includes(tab as ChatTab) ? (tab as ChatTab) : null;
  const navigate = useNavigate();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const completion = (location.state as GitHubConnectionCompleteLocationState | null)?.githubConnectionComplete;
  const { setBreadcrumbs } = useBreadcrumbs();
  const endpointQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.detail(endpointId),
    queryFn: () => chatEndpointsApi.get(endpointId),
    enabled: Boolean(endpointId && activeTab),
    ...liveChatQueryOptions,
    refetchInterval:
      activeTab === "activity" || activeTab === "conversations"
        ? liveChatQueryOptions.refetchInterval
        : false,
  });
  const endpoint = endpointQuery.data;
  const avatarAgent = useQuery({
    queryKey: queryKeys.agents.detail(endpoint?.assignedAgentId ?? ""),
    queryFn: () => agentsApi.get(endpoint!.assignedAgentId),
    enabled: endpoint?.provider === "github",
  });
  const [copyStatus, setCopyStatus] = useState<"numberCopied" | "copyNumberFailed" | null>(null);
  const agentQuery = useQuery({
    queryKey: queryKeys.agents.detail(endpoint?.assignedAgentId ?? ""),
    queryFn: () => agentsApi.get(endpoint!.assignedAgentId, endpoint!.companyId),
    enabled: Boolean(endpoint?.assignedAgentId),
  });

  useEffect(() => {
    if (!endpoint || !activeTab) return;
    setBreadcrumbs([
      { label: t("navigation.connectors"), href: "/apps" },
      {
        label: `${endpoint.assignedAgentName} · ${providerNames[endpoint.provider]}`,
        href: `/apps/chat/${endpoint.id}/settings`,
      },
      ...(reviewId ? [{ label: t(tabLabelKeys.reviews), href: `/apps/chat/${endpoint.id}/reviews` }, { label: t("apps.chatEndpointDetail.review") }] : [{
        label: t(tabLabelKeys[activeTab]),
      }]),
    ]);
    return () => setBreadcrumbs([]);
  }, [activeTab, endpoint, reviewId, setBreadcrumbs, t]);

  if (!activeTab)
    return <Navigate replace to={`/apps/chat/${endpointId}/settings`} />;
  if (endpointQuery.isLoading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("apps.chatEndpointDetail.loadingConnection")}
      </div>
    );
  if (endpointQuery.isError || !endpoint)
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {t("apps.chatEndpointDetail.loadFailed")}
        </p>
        <Button variant="outline" onClick={() => endpointQuery.refetch()}>
          {t("apps.chatEndpointDetail.tryAgain")}
        </Button>
      </div>
    );
  if (endpoint.provider === "agentmail" && activeTab === "settings")
    return <EmailEndpointSettings key={endpoint.id} endpointId={endpoint.id} companyId={endpoint.companyId} assignedAgentName={endpoint.assignedAgentName} />;
  const setupIncomplete =
    endpoint.setup?.step !== "complete" &&
    !(endpoint.provider === "slack" && endpoint.setup?.step === "test") &&
    ["draft", "verifying", "attention", "revoked"].includes(endpoint.status);
  const slackUrl = endpoint.provider === "slack" && endpoint.providerAccountId && endpoint.botExternalId
    ? `https://app.slack.com/client/${encodeURIComponent(endpoint.providerAccountId)}/user/${encodeURIComponent(endpoint.botExternalId)}`
    : null;

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <AgentAvatar agent={agentQuery.data ?? { id: endpoint.assignedAgentId, name: endpoint.assignedAgentName }} size={endpoint.provider === "github" ? 64 : 48} />
          <div className="min-w-0">
          <h1 ref={heading} tabIndex={-1} className="text-xl font-bold">
            {endpoint.provider === "github" ? (endpoint.botLabel ?? endpoint.assignedAgentName) : endpoint.assignedAgentName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {endpoint.provider === "github" ? <><AppLogo name="GitHub" brandKey="github" compact className="size-4! rounded-sm bg-transparent" /><Link to={`/agents/${endpoint.assignedAgentId}`} className="hover:underline">{endpoint.assignedAgentName}</Link>{endpoint.providerAccountLabel && <span>· {endpoint.providerAccountLabel}</span>}</> : endpoint.providerAccountLabel ?? (endpoint.provider === "agentmail" ? endpoint.botExternalId ?? t("apps.chatEndpointDetail.emailConnection") : t("apps.chatEndpointDetail.chatConnection"))}
          </p>
          {endpoint.provider === "github" && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <GitHubBotMention endpoint={endpoint} />
            <GitHubAppIdentityActions endpoint={endpoint} avatarUrl={avatarAgent.data ? agentAvatarUrl(resolveAgentAppearance(avatarAgent.data.appearance, endpoint.assignedAgentId), 512, 1, "rest") : undefined} />
          </div>}
          {endpoint.provider === "imessage-photon" && endpoint.botExternalId && endpoint.photonAllocation !== "shared" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span>{endpoint.botExternalId}</span>
              <Button variant="ghost" size="sm" aria-label={t("apps.chatEndpointDetail.copyDedicatedNumber")} onClick={async () => {
                try { await copyTextToClipboard(endpoint.botExternalId!); setCopyStatus("numberCopied"); }
                catch { setCopyStatus("copyNumberFailed"); }
              }}><Copy className="size-4" />{t("apps.chatEndpointDetail.copyNumber")}</Button>
              <span role="status" className="text-muted-foreground">{copyStatus ? t(`apps.chatEndpointDetail.${copyStatus}`) : ""}</span>
            </div>
          )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slackUrl && <Button asChild variant="outline"><a href={slackUrl} target="_blank" rel="noopener noreferrer">{t("apps.chatEndpointDetail.openProvider", { provider: "Slack" })} <ExternalLink className="size-4" /></a></Button>}
          {setupIncomplete ? (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/apps/chat/connect?provider=${endpoint.provider}&purpose=chat&resume=${endpoint.id}`,
                )
              }
            >
              {t("apps.chatEndpointDetail.continueSetup")}
            </Button>
          ) : null}
          {["paused", "attention", "revoked"].includes(endpoint.status) && <StatusBadge status={endpoint.status} />}
        </div>
      </header>
      {endpoint.provider === "github" && <div hidden={activeTab !== "settings" && activeTab !== "access"}>
        <GitHubBotManagement key={endpoint.id} endpoint={endpoint} view={activeTab === "access" ? "access" : "settings"} />
      </div>}
      {activeTab === "settings" && endpoint.provider !== "github" && <Settings endpointId={endpoint.id} endpoint={endpoint} />}
      {activeTab === "reviews" && endpoint.provider === "github" && <GitHubReviews endpointId={endpoint.id} reviewId={reviewId} />}
{activeTab === "access" && endpoint.provider === "agentmail" && <EmailAccess endpoint={endpoint} />}
{activeTab === "access" && endpoint.provider !== "github" && endpoint.provider !== "agentmail" && (
        <Access
          endpointId={endpoint.id}
          allowUnlinked={endpoint.allowUnlinkedPeople}
          endpoint={endpoint}
        />
      )}
      {activeTab === "conversations" && (
        <Conversations endpointId={endpoint.id} provider={endpoint.provider} />
      )}
      {activeTab === "activity" && (
        <Activity endpointId={endpoint.id} endpoint={endpoint} />
      )}
      {endpoint.provider === "github" && activeTab === "settings" && endpoint.status === "active" &&
        endpoint.setup?.step === "complete" && completion?.endpointId === endpoint.id && (
        <GitHubConnectionComplete
          endpoint={endpoint}
          agent={avatarAgent.data}
          runtimeChecks={completion.runtimeChecks}
          onClose={() => {
            const { githubConnectionComplete: _complete, ...rest } = location.state as GitHubConnectionCompleteLocationState;
            navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: rest });
          }}
          onCloseAutoFocus={() => heading.current?.focus()}
        />
      )}
    </div>
  );
}

function EmailAccess({ endpoint }: { endpoint: ChatEndpoint }) {
  const { t } = useTranslation();
  const connection = useQuery({
    queryKey: queryKeys.tools.connection(endpoint.connectionId ?? ""),
    queryFn: () => toolsApi.getConnection(endpoint.connectionId!),
    enabled: Boolean(endpoint.connectionId),
  });
  const agents = useQuery({
    queryKey: queryKeys.agents.list(endpoint.companyId),
    queryFn: () => agentsApi.list(endpoint.companyId),
  });
  if (!endpoint.connectionId || agents.isError || connection.isError) return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">{t("apps.chatEndpointDetail.access.connectionLoadFailed")}</p>
      <Button variant="outline" onClick={() => { void agents.refetch(); void connection.refetch(); }}>{t("apps.chatEndpointDetail.access.tryAgain")}</Button>
    </div>
  );
  if (agents.isPending || connection.isPending) return <p role="status" className="text-sm text-muted-foreground">{t("apps.chatEndpointDetail.access.loading")}</p>;
  const sourceId = connection.data.config?.credentialConnectionId;
  const credentialId = typeof sourceId === "string" ? sourceId : endpoint.connectionId;
  return <section className="max-w-3xl space-y-4">
    <h2 className="text-lg font-semibold">{t("apps.chatEndpointDetail.access.title")}</h2>
    {credentialId !== endpoint.connectionId && <p className="text-sm text-muted-foreground">{t("apps.chatEndpointDetail.access.agentMailSharedAccountNote")}</p>}
    <EmailConnectionAccess key={credentialId} companyId={endpoint.companyId} connectionId={credentialId} agents={agents.data} />
  </section>;
}

function Settings({
  endpointId,
  endpoint,
}: {
  endpointId: string;
  endpoint: Awaited<ReturnType<typeof chatEndpointsApi.get>>;
}) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [messageCopied, setMessageCopied] = useState(false);
  const avatarAgent = useQuery({
    queryKey: queryKeys.agents.detail(endpoint.assignedAgentId),
    queryFn: () => agentsApi.get(endpoint.assignedAgentId, endpoint.companyId),
    enabled: endpoint.provider === "slack",
  });
  const mentionMessage = `@${(endpoint.botUsername ?? endpoint.botLabel ?? endpoint.assignedAgentName).replace(/^@/, "")} you there?`;
  const resourcesQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.resources(endpointId),
    queryFn: () => chatEndpointsApi.listResources(endpointId),
    ...(endpoint.provider === "slack" ? liveChatQueryOptions : {}),
  });
  const saveResources = useMutation({
    mutationFn: (resource: Pick<ChatEndpointResource, "id" | "enabled">) =>
      chatEndpointsApi.updateResources(endpointId, [resource]),
    onSuccess: (resources) =>
      queryClient.setQueryData(
        queryKeys.chatEndpoints.resources(endpointId),
        resources,
      ),
    onError: (error) =>
      pushToast({
        title: "Couldn't update destination",
        body: error instanceof Error ? error.message : "Try again.",
        tone: "error",
      }),
  });
  const updateEndpoint = useMutation({
    mutationFn: chatEndpointsApi.update.bind(null, endpointId),
    onSuccess: (next) =>
      queryClient.setQueryData(
        queryKeys.chatEndpoints.detail(endpointId),
        next,
      ),
    onError: (error) =>
      pushToast({
        title: "Couldn't update settings",
        body: error instanceof Error ? error.message : "Try again.",
        tone: "error",
      }),
  });
  const resources = resourcesQuery.data ?? [];
  const destinationResources = resources.filter((resource) =>
    isIndividuallyToggleableResource(endpoint.provider, resource.type),
  );
  const toggleResource = (resource: ChatEndpointResource, enabled: boolean) =>
    // A cached inventory must not overwrite another operator's unrelated edits.
    saveResources.mutate({ id: resource.id, enabled });
  return (
    <section className="max-w-3xl space-y-7">
      {endpoint.provider === "imessage-photon" && <p className="text-sm text-muted-foreground">{endpoint.photonAllocation === "shared" ? "Shared Photon project · direct messages only. Enroll senders in Photon and link their Messages identities in Access. Groups cannot be enabled." : "Enable each group individually. Agent replies are visible to everyone in that group; only authorized senders can start work."}</p>}
      {endpoint.provider === "telegram" && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Telegram group command</h2>
          <div className="rounded-lg border border-border p-3 text-sm">
            <code>
              /task@
              {endpoint.botUsername?.replace(/^@/, "") ?? "bot_username"}{" "}
              &lt;request&gt;
            </code>
            <p className="mt-2 text-muted-foreground">
              Telegram&apos;s default privacy mode does not deliver ordinary
              mentions to bots. Use this command to start or continue group
              work, or reply directly to a message from the bot.
            </p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{endpoint.provider === "slack" ? "Allowed Channels" : "Destinations"}</h3>
        {resourcesQuery.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load channels. <button className="underline" onClick={() => void resourcesQuery.refetch()}>Try again</button></p> : resourcesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading destinations…</p>
        ) : destinationResources.length === 0 && endpoint.provider !== "slack" ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No destinations yet.
          </p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {destinationResources.map((resource) => (
              <div key={resource.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {resource.label}
                  </p>
                  {(resource.availability !== "available" || resource.detail) && <p className="text-xs text-muted-foreground">
                    {resource.availability === "available"
                      ? resource.detail
                      : "Unavailable at the provider"}
                  </p>}
                  {resource.participants?.length ? <p className="mt-1 break-words text-xs text-muted-foreground">Participants: {resource.participants.join(", ")}</p> : null}
                </div>
                <ToggleSwitch
                  aria-label={`Enable ${resource.label}`}
                  checked={resource.enabled}
                  disabled={
                    endpoint.photonAllocation === "shared" ||
                    resource.availability !== "available" ||
                    saveResources.isPending
                  }
                  onCheckedChange={(enabled) =>
                    toggleResource(resource, enabled)
                  }
                />
              </div>
            ))}
            {endpoint.provider === "slack" && (
              <p className="py-3 text-sm text-muted-foreground">
                Invite {endpoint.assignedAgentName} to a channel to add it
              </p>
            )}
          </div>
        )}
      </div>
      {endpoint.provider !== "github" && (
        <div className="space-y-3">
          <SettingToggle
            label="Allow direct messages"
            detail={
              endpoint.provider === "discord"
                ? "People must also enable Direct Messages in their shared Discord server’s Privacy Settings."
                : undefined
            }
            checked={endpoint.allowDirectMessages ?? false}
            pending={updateEndpoint.isPending}
            onChange={(allowDirectMessages) =>
              updateEndpoint.mutate({ allowDirectMessages })
            }
          />
          {endpoint.provider === "slack" && (
            <SettingToggle
              label="Require at-mention"
              detail="Only respond to messages that @mention this bot, including thread replies and direct messages. Direct messages must also be allowed above."
              checked={endpoint.requireAtMention ?? false}
              pending={updateEndpoint.isPending}
              onChange={(requireAtMention) =>
                updateEndpoint.mutate({ requireAtMention })
              }
            />
          )}
          {endpoint.provider === "microsoft-teams" && (
            <SettingToggle
              label="Allow group chats"
              detail="The bot may participate in group chats where it is installed."
              checked={endpoint.allowGroupChats ?? false}
              pending={updateEndpoint.isPending}
              onChange={(allowGroupChats) =>
                updateEndpoint.mutate({ allowGroupChats })
              }
            />
          )}
        </div>
      )}
      {endpoint.provider === "slack" && <ChatCommunicationInstructions
        key={endpoint.id}
        value={endpoint.communicationInstructions ?? ""}
        onSave={async (communicationInstructions) => {
          const next = await chatEndpointsApi.update(endpointId, { communicationInstructions });
          queryClient.setQueryData(queryKeys.chatEndpoints.detail(endpointId), next);
        }}
      />}
      {endpoint.provider === "slack" && (
        <SlackSetupAdvanced label="Message in a channel"><div className="space-y-2 text-sm">
          <p>Invite the bot to a channel, then mention it to start a conversation.</p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <code>{mentionMessage}</code>
            <Button size="icon" variant="ghost" aria-label={messageCopied ? "Message copied" : "Copy message"} onClick={() => {
              void copyTextToClipboard(mentionMessage).then(() => setMessageCopied(true), () => pushToast({ title: "Couldn’t copy the message", body: "Select and copy it manually.", tone: "error" }));
            }}>{messageCopied ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
          </div>
        </div></SlackSetupAdvanced>
      )}
      {endpoint.provider === "slack" && <SlackSetupAdvanced label="Agent avatar">
        {avatarAgent.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading agent avatar…</p>
          : avatarAgent.isError ? <p role="alert" className="text-sm text-destructive">Couldn’t load the agent’s avatar. <button className="underline" onClick={() => void avatarAgent.refetch()}>Try again</button></p>
          : <SlackAvatarSettings
              agentName={avatarAgent.data?.name ?? endpoint.assignedAgentName}
              appName={endpoint.setup?.slackApp?.appName ?? defaultSlackAppName(avatarAgent.data?.name ?? endpoint.assignedAgentName)}
              avatarUrl={agentAvatarUrl(resolveAgentAppearance(avatarAgent.data?.appearance, endpoint.assignedAgentId), 512, 1, "rest", false, "paperclip-dark")}
            />}
      </SlackSetupAdvanced>}
      {endpoint.provider === "slack" && <SlackSetupAdvanced label="Slack tools"><SlackToolsSettings companyId={endpoint.companyId} endpointId={endpointId} connectionId={endpoint.connectionId} /></SlackSetupAdvanced>}
    </section>
  );
}

function SettingToggle({
  label,
  detail,
  checked,
  pending,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  pending: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-y border-border py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <ToggleSwitch
        aria-label={label}
        checked={checked}
        disabled={pending}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function Access({
  endpointId,
  allowUnlinked,
  endpoint,
}: {
  endpointId: string;
  allowUnlinked: boolean;
  endpoint: ChatEndpoint;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [joinCommandCopied, setJoinCommandCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [confirmationFor, setConfirmationFor] = useState<string | null>(null);
  const joinCommand = `${endpoint.setup?.slackApp?.command ?? endpoint.setup?.command ?? "/paperclip"} connect`;
  const linksQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.principals(endpointId),
    queryFn: () => chatEndpointsApi.listPrincipals(endpointId),
    refetchInterval: 5000,
  });
  const updatePolicy = useMutation({
    mutationFn: (value: boolean) =>
      chatEndpointsApi.update(endpointId, { allowUnlinkedPeople: value }),
    onSuccess: (next) =>
      queryClient.setQueryData(
        queryKeys.chatEndpoints.detail(endpointId),
        next,
      ),
    onError: (error) => pushToast({ title: t("apps.chatEndpointDetail.access.updateFailed"), body: error instanceof Error ? error.message : t("apps.chatEndpointDetail.access.tryAgainFallback"), tone: "error" }),
  });
  const createIntent = useMutation({
    mutationFn: (principalId: string) =>
      chatEndpointsApi.createLinkIntent(endpointId, principalId),
    onSuccess: ({ confirmationUrl }) => {
      setConfirmationUrl(
        new URL(confirmationUrl, window.location.origin).toString(),
      );

    },
    onError: (error) =>
      pushToast({
        title: t("apps.chatEndpointDetail.access.createIdentityLinkFailed"),
        body: error instanceof Error ? error.message : t("apps.chatEndpointDetail.access.tryAgainFallback"),
        tone: "error",
      }),
  });
  const revoke = useMutation({
    mutationFn: (principalId: string) =>
      chatEndpointsApi.revokeLink(endpointId, principalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.principals(endpointId) }),
    onError: (error) => pushToast({ title: t("apps.chatEndpointDetail.access.disconnectAccountFailed"), body: error instanceof Error ? error.message : t("apps.chatEndpointDetail.access.tryAgainFallback"), tone: "error" }),
  });
  const links = linksQuery.data ?? [];
  return (
    <section className="max-w-3xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("apps.chatEndpointDetail.access.people")}</h2>
        {endpoint.provider === "slack" && <Dialog>
          <DialogTrigger asChild><Button>{t("apps.chatEndpointDetail.access.invitePeople")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("apps.chatEndpointDetail.access.inviteTitle", { agent: endpoint.assignedAgentName })}</DialogTitle>
              <DialogDescription>{t("apps.chatEndpointDetail.access.inviteDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <ol className="list-decimal space-y-3 pl-5">
                <li>{t("apps.chatEndpointDetail.access.sendCommand", { command: joinCommand })}</li>
                <li>{t("apps.chatEndpointDetail.access.openPrivateLink")}</li>
                <li>{t("apps.chatEndpointDetail.access.requestOrganizationAccess")}</li>
              </ol>
              <p className="text-muted-foreground">{t("apps.chatEndpointDetail.access.confirmationLinkExpiry")}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => {
                  void copyTextToClipboard(joinCommand).then(() => setJoinCommandCopied(true), () => pushToast({ title: t("apps.chatEndpointDetail.access.copyCommandFailed"), tone: "error" }));
                }}>{joinCommandCopied ? <Check className="size-4" /> : <Copy className="size-4" />}{joinCommandCopied ? t("apps.chatEndpointDetail.access.copied") : t("apps.chatEndpointDetail.access.copyCommand")}</Button>
                <Button onClick={() => {
                  const workspace = endpoint.providerAccountId ? `https://app.slack.com/client/${encodeURIComponent(endpoint.providerAccountId)}` : "https://app.slack.com/";
                  void copyTextToClipboard(t("apps.chatEndpointDetail.access.invitationClipboard", { agent: endpoint.assignedAgentName, workspace, command: joinCommand })).then(() => setInviteCopied(true), () => pushToast({ title: t("apps.chatEndpointDetail.access.copyInvitationFailed"), tone: "error" }));
                }}>{inviteCopied ? <Check className="size-4" /> : <Copy className="size-4" />}{inviteCopied ? t("apps.chatEndpointDetail.access.invitationCopied") : t("apps.chatEndpointDetail.access.copyInvitation")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>}
      </div>
      <p className="text-sm text-muted-foreground">{t("apps.chatEndpointDetail.access.linkedAccountsPermissions")} <Link className="underline underline-offset-4" to="/company/settings/members">{t("apps.chatEndpointDetail.access.manageMembers")}</Link></p>
      {confirmationUrl && (
        <div className="space-y-2 border-y border-border py-3">
          <p className="text-sm font-medium">{t("apps.chatEndpointDetail.access.confirmAccount", { account: confirmationFor ?? t("apps.chatEndpointDetail.access.thisAccount") })}</p>
          <p className="text-xs text-muted-foreground">{t("apps.chatEndpointDetail.access.shareConfirmationLinkPrivately")}</p>
          <p className="break-all text-xs text-muted-foreground">
            {confirmationUrl}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void copyTextToClipboard(confirmationUrl).then(
                () =>
                  pushToast({
                    title: t("apps.chatEndpointDetail.access.confirmationLinkCopied"),
                    tone: "success",
                  }),
                () =>
                  pushToast({
                    title: t("apps.chatEndpointDetail.access.copyLinkFailed"),
                    body: t("apps.chatEndpointDetail.access.copyManually"),
                    tone: "error",
                  }),
              );
            }}
          >
            <Copy />
            {t("apps.chatEndpointDetail.access.copyLink")}
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {linksQuery.isPending ? <p role="status" className="text-sm text-muted-foreground">{t("apps.chatEndpointDetail.access.loadingPeople")}</p> : linksQuery.isError ? <p role="alert" className="text-sm text-destructive">{t("apps.chatEndpointDetail.access.loadPeopleFailed")} <button className="underline" onClick={() => void linksQuery.refetch()}>{t("apps.chatEndpointDetail.access.tryAgain")}</button></p> : links.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("apps.chatEndpointDetail.access.noLinkedAccounts")}
          </p>
        ) : (
          <div role="list" aria-label={t("apps.chatEndpointDetail.access.people")} className="divide-y divide-border border-y border-border">
            {links.map((link) => (
              <div
                key={link.id}
                role="listitem"
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Identity name={link.paperclipUserLabel ?? link.externalLabel} size="default" className="gap-2" />
                  {(link.status !== "linked" || link.externalLabel !== link.paperclipUserLabel) && <p className="pl-10 text-xs text-muted-foreground">
                    {link.status === "revoked" ? t("apps.chatEndpointDetail.access.disconnected") : link.status === "linked"
                      ? link.externalLabel
                      : t("apps.chatEndpointDetail.access.waitingForConfirmation")}
                  </p>}
                </div>
                {link.status === "linked" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(link.principalId)}
                  >
                    <Unlink />
                    {t("apps.chatEndpointDetail.access.disconnect")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={createIntent.isPending}
                    onClick={() => { setConfirmationUrl(null); setConfirmationFor(link.externalLabel); createIntent.mutate(link.principalId); }}
                  >
                    {t("apps.chatEndpointDetail.access.createConfirmationLink")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SlackSetupAdvanced label={t("apps.chatEndpointDetail.access.guestAccess")}>
        <SettingToggle label={t("apps.chatEndpointDetail.access.allowUnlinkedPeople")}
          detail={t("apps.chatEndpointDetail.access.allowUnlinkedPeopleDescription")}
          checked={allowUnlinked} pending={updatePolicy.isPending} onChange={value => updatePolicy.mutate(value)} />
      </SlackSetupAdvanced>
      {endpoint.provider === "slack" && <SlackSetupAdvanced label={t("apps.chatEndpointDetail.access.personalSlackSearch")}><SlackSearchAccess companyId={endpoint.companyId} endpointId={endpointId} /></SlackSetupAdvanced>}
    </section>
  );
}

function Conversations({
  endpointId,
  provider,
}: {
  endpointId: string;
  provider: ChatProvider;
}) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.chatEndpoints.conversations(endpointId),
    queryFn: () => chatEndpointsApi.listConversations(endpointId),
    ...liveChatQueryOptions,
  });
  return (
    <section className="space-y-4">
      {query.isPending ? <p role="status" className="text-sm text-muted-foreground">{t("apps.chatEndpointDetail.conversations.loading")}</p> : query.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">{t("apps.chatEndpointDetail.conversations.loadFailed")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>{t("apps.chatEndpointDetail.tryAgain")}</Button>
        </div>
      ) : <ChatConversationList rows={query.data} provider={provider} />}
    </section>
  );
}

function Activity({
  endpointId,
  endpoint,
}: {
  endpointId: string;
  endpoint: Awaited<ReturnType<typeof chatEndpointsApi.get>>;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [resolutionItem, setResolutionItem] = useState<ChatActivityItem | null>(
    null,
  );
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[cursors.length - 1];
  useEffect(() => setCursors([undefined]), [endpointId]);
  const query = useQuery({
    queryKey: [...queryKeys.chatEndpoints.activity(endpointId), cursor ?? null],
    queryFn: () => chatEndpointsApi.listActivityPage(endpointId, cursor),
    ...liveChatQueryOptions,
    refetchInterval: cursor ? false : liveChatQueryOptions.refetchInterval,
  });
  const replay = useMutation({
    mutationFn: (item: ChatActivityItem) =>
      item.kind === "publication"
        ? chatEndpointsApi.replayPublication(endpointId, item.id)
        : chatEndpointsApi.replayDelivery(endpointId, item.id),
    onSuccess: async (_result, item) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatEndpoints.activity(endpointId),
      });
      pushToast({
        title: t(item.kind === "publication"
          ? "apps.chatEndpointDetail.activity.replayPublicationQueued"
          : "apps.chatEndpointDetail.activity.replayDeliveryQueued"),
        tone: "success",
      });
    },
    onError: (error) =>
      pushToast({
        title: t("apps.chatEndpointDetail.activity.replayFailed"),
        body: error instanceof Error ? error.message : t("apps.chatEndpointDetail.activity.tryAgain"),
        tone: "error",
      }),
  });
  const resolveActivity = useMutation({
    mutationFn: (input: {
      item: ChatActivityItem;
      action: "mark_delivered" | "retry_anyway" | "cancel";
    }) => {
      if (input.item.kind === "publication") {
        return chatEndpointsApi.resolvePublication(
          endpointId,
          input.item.id,
          input.action,
          input.item.fileTransfer
            ? {
                phase: input.item.fileTransfer.phase,
                version: input.item.fileTransfer.version,
              }
            : undefined,
        );
      }
      return chatEndpointsApi.resolveAction(
        endpointId,
        input.item.id,
        input.action,
      );
    },
    onSuccess: async (_result, input) => {
      setResolutionItem(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatEndpoints.activity(endpointId),
      });
      const toastKey = input.item.actionType === "slash_task_start"
        ? input.action === "retry_anyway"
          ? "apps.chatEndpointDetail.activity.taskStartRetried"
          : "apps.chatEndpointDetail.activity.taskStartCancelled"
        : input.item.actionType === "provider_effect"
          ? input.action === "mark_delivered"
            ? "apps.chatEndpointDetail.activity.providerReplyMarkedDelivered"
            : input.action === "retry_anyway"
              ? "apps.chatEndpointDetail.activity.providerReplyRetried"
              : "apps.chatEndpointDetail.activity.providerReplyCancelled"
          : input.action === "mark_delivered"
            ? "apps.chatEndpointDetail.activity.publicationMarkedDelivered"
            : input.action === "retry_anyway"
              ? "apps.chatEndpointDetail.activity.publicationQueuedForRetry"
              : "apps.chatEndpointDetail.activity.publicationCancelled";
      pushToast({
        title: t(toastKey),
        tone: "success",
      });
    },
    onError: (error) =>
      pushToast({
        title: t("apps.chatEndpointDetail.activity.resolveFailed"),
        body: error instanceof Error ? error.message : t("apps.chatEndpointDetail.activity.tryAgain"),
        tone: "error",
      }),
  });
  const lifecycle = useMutation({
    mutationFn: async (action: "pause" | "resume" | "remove") =>
      endpoint.provider === "agentmail"
        ? emailApi.control(endpointId, action)
        : chatEndpointsApi.setup(endpointId, { action }),
    onSuccess: async (next, action) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatEndpoints.list(next.companyId),
      });
      if (endpoint.provider === "agentmail") {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["email-inboxes", next.companyId] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.detail(endpointId) }),
        ]);
      }
      if (action === "remove") {
        navigate("/apps");
        return;
      }
      if (endpoint.provider !== "agentmail") queryClient.setQueryData(queryKeys.chatEndpoints.detail(endpointId), next);
      pushToast({
        title: t(action === "pause"
          ? "apps.chatEndpointDetail.activity.connectionPausedToast"
          : "apps.chatEndpointDetail.activity.connectionResumedToast"),
        tone: "success",
      });
    },
    onError: (error) =>
      pushToast({
        title: t("apps.chatEndpointDetail.activity.updateConnectionFailed"),
        body: error instanceof Error ? error.message : t("apps.chatEndpointDetail.activity.tryAgain"),
        tone: "error",
      }),
  });
  const rows = query.data?.items ?? [];
  const { status } = endpoint;
  const health = connectionHealthPresentation(endpoint, t);
  const lifecycleAction = lifecycle.variables;
  const callbackSurfaceRows = endpoint.setup?.callbackSurfaces
    ? ([
        ["Events API", endpoint.setup.callbackSurfaces.events],
        ["Interactivity", endpoint.setup.callbackSurfaces.interactivity],
        ["Slash command", endpoint.setup.callbackSurfaces.slashCommands],
      ] as const)
    : [];
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold">{t("apps.chatEndpointDetail.activity.title")}</h2>
      {((status !== "active" && health.message) || health.error) && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${status === "attention" || status === "revoked" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/30 text-foreground"}`}
        >
          {(status === "attention" || status === "revoked") && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            {health.message && <p>{health.message}</p>}
            {health.previousHealth && (
              <p className="mt-1 text-xs opacity-80">
                <span className="font-medium">{t("apps.chatEndpointDetail.activity.lastReportedHealth")}:</span>{" "}
                {health.previousHealth}
              </p>
            )}
            {health.error && (
              <p className="mt-1 text-xs opacity-80">
                <span className="font-medium">{health.errorLabel}:</span>{" "}
                {health.error}
              </p>
            )}
          </div>
        </div>
      )}
      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium chat-connection-health-summary">
          <span>{t("apps.chatEndpointDetail.activity.healthAndControls")}</span>
          <span className="flex items-center gap-2">
            {endpoint.setup?.callbacksNeedUpdate && <span className="text-xs text-(--status-task-blocked)">{t("apps.chatEndpointDetail.activity.callbackUrlsNeedAttention")}</span>}
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="space-y-5 border-t border-border p-4">
      {endpoint.provider === "slack" && callbackSurfaceRows.length > 0 && (
        <div
          className="space-y-3 text-sm"
        >
          <p className="font-medium">{t("apps.chatEndpointDetail.activity.slackCallbackHealth")}</p>
          <p className="text-xs text-muted-foreground">
            {endpoint.setup?.callbacksNeedUpdate
              ? t("apps.chatEndpointDetail.activity.slackCallbacksNeedUpdate")
              : t("apps.chatEndpointDetail.activity.slackCallbacksRecorded")}
          </p>
          <div className="divide-y divide-border border-y border-border">
            {callbackSurfaceRows.map(([label, surface]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {surface.status === "current"
                    ? t("apps.chatEndpointDetail.activity.callbackCurrent")
                    : surface.status === "stale"
                      ? t("apps.chatEndpointDetail.activity.callbackStale")
                      : t("apps.chatEndpointDetail.activity.callbackNotObserved")}
                </p>
                {surface.observedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("apps.chatEndpointDetail.activity.lastObserved")}{" "}
                    <time
                      dateTime={surface.observedAt}
                      title={surface.observedAt}
                      className="font-mono"
                    >
                      {formatDateTime(surface.observedAt, {
                        includeSeconds: true,
                      })}
                    </time>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {status !== "archived" && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {status === "active" && (
              <Button
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("pause")}
              >
                {lifecycle.isPending && lifecycleAction === "pause" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Pause />
                )}
                {t("apps.chatEndpointDetail.activity.pause")}
              </Button>
            )}
            {status === "paused" && (
              <Button
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("resume")}
              >
                {lifecycle.isPending && lifecycleAction === "resume" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Play />
                )}
                {t("apps.chatEndpointDetail.activity.resume")}
              </Button>
            )}
            {[
              "active",
              "paused",
              "attention",
              "revoked",
              "draft",
              "verifying",
            ].includes(status) && (
              <Button
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() =>
                  navigate(
                    endpoint.provider === "agentmail" && status !== "draft" && status !== "verifying"
                      ? `/apps/chat/${endpoint.id}/settings`
                      : `/apps/chat/connect?provider=${endpoint.provider}&purpose=chat&resume=${endpoint.id}${status === "draft" || status === "verifying" ? "" : "&reconnect=1"}`,
                  )
                }
              >
                <RefreshCw />
                {status === "draft" || status === "verifying"
                  ? t("apps.chatEndpointDetail.activity.finishSetup")
                  : t("apps.chatEndpointDetail.activity.reconnect")}
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={lifecycle.isPending}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 />
              {t("apps.chatEndpointDetail.activity.removeConnection")}
            </Button>
          </div>
          {status !== "draft" && status !== "verifying" && (
            <p className="text-xs text-muted-foreground">
              {t(providerLifecycleGuidanceKeys[endpoint.provider].reconnect)}
            </p>
          )}
        </div>
      )}
        </div>
      </details>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          {t("apps.chatEndpointDetail.activity.recentActivity")}
        </h3>
        {endpoint.provider === "agentmail" && rows.some((item) => item.kind === "publication" && item.status === "delivery_unknown") && (
          <p className="text-sm text-muted-foreground">
            {t("apps.chatEndpointDetail.activity.reviewUnconfirmedEmail")}{" "}
            <Link to={`/apps/chat/${endpointId}/conversations`} className="underline underline-offset-4">{t("apps.chatEndpointDetail.activity.conversationTask")}</Link>.
          </p>
        )}
        <div className="divide-y divide-border border-y border-border">
          {query.isLoading && (
            <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("apps.chatEndpointDetail.activity.loading")}
            </div>
          )}
          {query.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="text-sm text-destructive" role="alert">
                {t("apps.chatEndpointDetail.activity.loadFailed")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => query.refetch()}
              >
                {t("apps.chatEndpointDetail.activity.tryAgain")}
              </Button>
            </div>
          )}
          {!query.isLoading &&
            !query.isError &&
            rows.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-2 py-3 transition-colors hover:bg-accent/50"
              >
                <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
                  {item.kind === "delivery" ? <ArrowDownLeft className="size-4" /> : item.kind === "publication" ? <ArrowUpRight className="size-4" /> : <ActivityIcon className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 text-sm font-medium">{item.summary}</p>
                    <StatusBadge status={item.status} />
                    <time dateTime={item.createdAt} title={item.createdAt} className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(item.createdAt, { includeSeconds: true })}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t(activityKindKeys[item.kind])}</p>
                  {item.fileTransfer && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.fileTransfer.filename} —{" "}
                      {item.fileTransfer.phase.replaceAll("_", " ")}
                    </p>
                  )}
                  {item.detail && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {activityDetailLabel(item, t)}:
                      </span>{" "}
                      {item.detail}
                    </p>
                  )}
                </div>
                {endpoint.provider !== "agentmail" && isReplayEligible(item) && (
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t("apps.chatEndpointDetail.activity.replayFailedAria", { kind: t(activityKindKeys[item.kind]) })}
                    disabled={replay.isPending}
                    onClick={() => replay.mutate(item)}
                  >
                    {replay.isPending && replay.variables?.id === item.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    {t("apps.chatEndpointDetail.activity.replay")}
                  </Button>
                )}
                {endpoint.provider !== "agentmail" && isResolutionEligible(item) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResolutionItem(item)}
                  >
                    {t("apps.chatEndpointDetail.activity.resolve")}
                  </Button>
                )}
              </div>
            ))}
          {!query.isLoading && !query.isError && rows.length === 0 && (
            <p className="py-5 text-sm text-muted-foreground">
              {t("apps.chatEndpointDetail.activity.empty")}
            </p>
          )}
        </div>
      </div>
      <nav aria-label={t("apps.chatEndpointDetail.activity.paginationAria")} className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{t("apps.chatEndpointDetail.activity.page", { number: cursors.length })}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={cursors.length === 1 || query.isFetching} onClick={() => setCursors((pages) => pages.slice(0, -1))}>{t("apps.chatEndpointDetail.activity.previous")}</Button>
          <Button size="sm" variant="outline" disabled={!query.data?.nextCursor || query.isFetching || query.isError} onClick={() => { if (query.data?.nextCursor) setCursors((pages) => [...pages, query.data.nextCursor!]); }}>{t("apps.chatEndpointDetail.activity.next")}</Button>
        </div>
      </nav>
      <AlertDialog
        open={resolutionItem !== null}
        onOpenChange={(open) => !open && setResolutionItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolutionItem?.actionType === "slash_task_start"
                ? t("apps.chatEndpointDetail.activity.resolution.resolveTaskStart")
                : resolutionItem?.actionType === "provider_effect"
                  ? t("apps.chatEndpointDetail.activity.resolution.resolveProviderReply")
                  : t("apps.chatEndpointDetail.activity.resolution.resolveDelivery")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resolutionItem?.actionType === "slash_task_start"
                ? t("apps.chatEndpointDetail.activity.resolution.taskStartUnknown")
                : resolutionItem?.actionType === "provider_effect"
                  ? t("apps.chatEndpointDetail.activity.resolution.providerReplyUnknown")
                  : resolutionItem
                    ? activityResolutionDescription(resolutionItem, t)
                    : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-wrap">
            <AlertDialogCancel disabled={resolveActivity.isPending}>
              {t("apps.chatEndpointDetail.activity.resolution.keepUnresolved")}
            </AlertDialogCancel>
            {resolutionItem &&
              activityResolutionActions(resolutionItem).includes("cancel") && (
                <Button
                  variant="outline"
                  disabled={resolveActivity.isPending}
                  onClick={() =>
                    resolutionItem &&
                    resolveActivity.mutate({
                      item: resolutionItem,
                      action: "cancel",
                    })
                  }
                >
                  {resolutionItem.actionType === "slash_task_start"
                    ? t("apps.chatEndpointDetail.activity.resolution.cancelTaskStart")
                    : resolutionItem.actionType === "provider_effect"
                      ? t("apps.chatEndpointDetail.activity.resolution.cancelProviderReply")
                      : resolutionItem.fileTransfer
                        ? t("apps.chatEndpointDetail.activity.resolution.cancelFileTransfer")
                        : t("apps.chatEndpointDetail.activity.resolution.cancelPublication")}
                </Button>
              )}
            {resolutionItem &&
              activityResolutionActions(resolutionItem).includes(
                "retry_anyway",
              ) && (
                <Button
                  variant="outline"
                  disabled={resolveActivity.isPending}
                  onClick={() =>
                    resolutionItem &&
                    resolveActivity.mutate({
                      item: resolutionItem,
                      action: "retry_anyway",
                    })
                  }
                >
                  {resolutionItem.fileTransfer
                    ? t("apps.chatEndpointDetail.activity.resolution.retryFileNotification")
                    : t("apps.chatEndpointDetail.activity.resolution.retryAnyway")}
                </Button>
              )}
            {resolutionItem &&
              activityResolutionActions(resolutionItem).includes(
                "mark_delivered",
              ) && (
                <AlertDialogAction
                  disabled={resolveActivity.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    if (resolutionItem) {
                      resolveActivity.mutate({
                        item: resolutionItem,
                        action: "mark_delivered",
                      });
                    }
                  }}
                >
                  {t("apps.chatEndpointDetail.activity.resolution.markDelivered")}
                </AlertDialogAction>
              )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("apps.chatEndpointDetail.activity.removeConnectionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("apps.chatEndpointDetail.activity.removeConnectionDescription", {
                agent: endpoint.assignedAgentName,
                provider: providerNames[endpoint.provider],
                guidance: t(providerLifecycleGuidanceKeys[endpoint.provider].remove),
              })}
              {endpoint.provider === "slack" && (
                <> <a
                  href={endpoint.setup?.slackRegistration?.managementUrl ?? "https://api.slack.com/apps"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >{t("apps.chatEndpointDetail.activity.openSlackAppSettings")}</a>{t("apps.chatEndpointDetail.activity.manageSlackAppSuffix")}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("apps.chatEndpointDetail.activity.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate("remove")}
            >
              {lifecycle.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("apps.chatEndpointDetail.activity.removeConnection")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
