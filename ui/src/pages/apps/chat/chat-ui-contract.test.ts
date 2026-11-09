import { buildSlackAppManifest } from "@paperclipai/shared";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { t } from "@/i18n";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function expectBilingualCopy(sourceText: string, key: string, options: Record<string, unknown> = {}) {
  expect(sourceText).toContain(key);
  const english = t(key, { ...options, lng: "en" });
  const portuguese = t(key, { ...options, lng: "pt-BR" });
  expect(english, `English catalog value for ${key}`).not.toBe(key);
  expect(portuguese, `PT-BR catalog value for ${key}`).not.toBe(key);
  expect(portuguese, `PT-BR translation for ${key}`).not.toBe(english);
  expect(english.trim()).not.toBe("");
  expect(portuguese.trim()).not.toBe("");
  return { english, portuguese };
}

describe("chat connector UI contract", () => {
  it("describes the close command as a conversation control rather than a task status change", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    expect(setup).toContain("Close the active chat conversation");
    expect(setup).not.toContain("Close the active Paperclip task");
  });

  it("retries the selected failed run from every Board entry point", () => {
    for (const file of [
      "AgentDetail.tsx",
      "AgentDetail.production.tsx",
      "Inbox.tsx",
      "LegacyInbox.tsx",
    ]) {
      const page = source(`../../${file}`);
      expect(page).toMatch(
        /agentsApi\.retryFailedRun\(\s*run\.agentId,\s*run\.id,\s*run\.companyId,?\s*\)/,
      );
      expect(page).not.toContain('reason: "retry_failed_run"');
      expect(page).toContain("newRun.runId");
      expect(page).toContain("newRun.issueId");
    }
    const issue = source("../../IssueDetail.tsx");
    expect(issue).toMatch(
      /agentsApi\.retryFailedRun\(\s*failedRun\.agentId,\s*failedRun\.runId,\s*companyId/,
    );
    expect(issue).toContain("Retry queued");
    for (const file of ["Inbox.tsx", "LegacyInbox.tsx"]) {
      const page = source(`../../${file}`);
      expect(page).toMatch(
        /const retryRunMutation = useMutation\(\{[\s\S]*?onError: \(error\) => \{\s*pushToast\(\{\s*title: "Run retry failed"/,
      );
    }
  });
  it("keeps the exact dual-purpose choice and immutable searchable agent selection", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.purpose.chatTitle");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.purpose.toolTitle");
    expect(setup).toContain("<AgentSelect");
    expect(setup).not.toContain("Change agent");
  });

  it("provides every settled detail tab and no detach control", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    for (const tab of ["settings", "access", "conversations", "activity"]) {
      expect(detail).toContain(`"${tab}"`);
    }
    expect(detail).not.toContain('"overview"');
    expect(detail.toLowerCase()).not.toContain("detach");
  });

  it("shows independent Slack callback surfaces and public URL drift", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    expectBilingualCopy(detail, "apps.chatEndpointDetail.activity.slackCallbackHealth");
    expect(detail).toContain("Events API");
    expect(detail).toContain("Interactivity");
    expect(detail).toContain("Slash command");
    expect(detail).toContain("callbacksNeedUpdate");
    expectBilingualCopy(detail, "apps.chatEndpointDetail.activity.slackCallbacksNeedUpdate");
    expectBilingualCopy(detail, "apps.chatEndpointDetail.activity.callbackNotObserved");
  });

  it("keeps provider capabilities automatic and settings focused on plausible reach", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    const setup = source("./ChatEndpointSetup.tsx");
    expectBilingualCopy(detail, "apps.chatEndpointDetail.settings.allowDirectMessages");
    expectBilingualCopy(detail, "apps.chatEndpointDetail.settings.allowGroupChats");
    const guestAccess = expectBilingualCopy(detail, "apps.chatEndpointDetail.access.allowUnlinkedPeopleDescription");
    expect(guestAccess.english).toContain("Requests are refused when isolation is unavailable");
    expect(guestAccess.portuguese).toContain("As solicitações são recusadas quando o isolamento não está disponível");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.try.identity.linkTestedAccountTitle");
    const unlinkedIdentity = expectBilingualCopy(setup, "apps.chatEndpointSetup.try.identity.unlinkedGuestDisabled", {
      agent: "the agent",
      freshConversationInstruction: "send a new message",
    });
    expect(unlinkedIdentity.english).toContain("Paperclip does not replay the refused request");
    expect(unlinkedIdentity.portuguese).toContain("o Paperclip não repete a solicitação recusada");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.try.reviewIdentityAccess");
    expect(setup).toContain("instanceSettingsApi.getExperimental()");
    expect(setup).toContain("chatEndpointsApi.listPrincipals(endpointId)");
    expect(setup).toContain("queryKeys.chatEndpoints.detail(next.id)");
    expect(setup).toContain('target="_blank" rel="noopener noreferrer"');
    expect(detail).not.toContain("Enable streaming");
    expect(detail).not.toContain("Delivery transport");
  });

  it("explains Discord's independent per-server direct-message restriction", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    expect(detail).toContain('endpoint.provider === "discord"');
    expectBilingualCopy(detail, "apps.chatEndpointDetail.settings.discordDirectMessagesDetail");
  });

  it("offers only real connection lifecycle actions", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    const settings = detail.slice(
      detail.indexOf("function Settings"),
      detail.indexOf("function SettingToggle"),
    );
    const activity = detail.slice(detail.indexOf("function Activity"));
    expect(detail).toContain('"pause" | "resume" | "remove"');
    expectBilingualCopy(detail, "apps.chatEndpointDetail.activity.removeConnectionTitle");
    expect(detail).toContain("purpose=chat&resume=${endpoint.id}");
    expect(detail).toContain('? "" : "&reconnect=1"');
    expectBilingualCopy(detail, "apps.chatEndpointDetail.activity.finishSetup");
    expectBilingualCopy(detail, "apps.chatEndpointDetail.continueSetup");
    expect(detail).toContain('endpoint.setup?.step !== "complete"');
    expect(detail).not.toContain("Change agent");
    for (const key of [
      "apps.chatEndpointDetail.activity.pause",
      "apps.chatEndpointDetail.activity.resume",
      "apps.chatEndpointDetail.activity.reconnect",
      "apps.chatEndpointDetail.activity.removeConnection",
    ]) {
      expectBilingualCopy(detail, key);
      expect(activity).toContain(key);
      expect(settings).not.toContain(key);
    }
  });

  it("states the provider boundary for reconnect and removal", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    for (const provider of ["slack", "github", "discord", "microsoftTeams", "telegram"]) {
      expectBilingualCopy(detail, `apps.chatEndpointDetail.lifecycle.reconnect.${provider}`);
      expectBilingualCopy(detail, `apps.chatEndpointDetail.lifecycle.remove.${provider}`);
    }
  });

  it("uses only executable provider credential flows", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    const githubSetup = source("./GitHubChatSetup.tsx");
    for (const credential of [
      "botToken",
      "appId",
      "applicationId",
      "guildId",
      "clientId",
      "tenantId",
      "clientSecret",
    ]) {
      expect(setup).toContain(`\"${credential}\"`);
    }
    expect(githubSetup).toContain("credentials.privateKey");
    expect(setup).toContain("credentials.signingSecret");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.purpose.chatTitle");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.slack.automatic.createApp");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.slack.manual.steps.verifyConnection");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.instructions.entra");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.telegram.createDescription");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.discord.createDescription");
    const discordBotInstructions = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.discord.instructions.bot",
      { bot: "Bot", messageContentIntent: "Message Content Intent" },
    );
    expect(discordBotInstructions.english).toContain("enable Message Content Intent");
    expect(discordBotInstructions.portuguese).toContain("ative Message Content Intent");
    expectBilingualCopy(githubSetup, "apps.githubChatSetup.progress.checkingConnection");
    expectBilingualCopy(githubSetup, "apps.githubChatSetup.existing.appId");
    expectBilingualCopy(githubSetup, "apps.githubChatSetup.existing.privateKey");
    expectBilingualCopy(githubSetup, "apps.githubChatSetup.existing.webhookSecret");
    expectBilingualCopy(githubSetup, "apps.githubChatSetup.existing.reconnectDescription");
    expect(setup).toMatch(/Create\s+Public Threads/);
    expect(setup).toContain("permissions=309237763136&scope=bot");
    expect(setup).not.toContain("applications.commands");
    expect(githubSetup).toContain('params.get("reconnect") === "1"');
    expect(setup).not.toContain("/setprivacy");
    expect(setup).toContain("/task@bot_username");
    const telegramPrivacy = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.telegram.privacyNoteBeforeCommand",
    );
    expect(telegramPrivacy.english).toContain("registers its command menu automatically");
    expect(telegramPrivacy.portuguese).toContain("registra o menu de comandos automaticamente");
    expect(telegramPrivacy.english).toContain("ordinary mentions are not delivered to bots");
    expect(telegramPrivacy.portuguese).toContain("menções comuns não chegam aos bots");
    const teamsRequirements = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.microsoftTeams.requirements",
    );
    for (const value of [teamsRequirements.english, teamsRequirements.portuguese]) {
      expect(value).toContain("teams.live.com");
      expect(value).toContain("GCC High");
      expect(value).toContain("21Vianet");
    }
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.links.createAzureBot");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.fields.clientSecret");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.portalMap.heading");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.portalMap.steps.entra");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.portalMap.steps.azureBot");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.portalMap.steps.teamsDeveloperPortal");
    const installInstructions = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.microsoftTeams.portalMap.steps.install",
    );
    expect(installInstructions.english).toContain("One team install covers its standard channels");
    expect(installInstructions.portuguese).toContain("Uma instalação na equipe cobre os canais padrão");
    expect(installInstructions.english).toContain("Private and shared channels require a separate app installation");
    expect(installInstructions.portuguese).toContain("Canais privados e compartilhados exigem uma instalação separada do app");
    expectBilingualCopy(setup, "apps.chatEndpointSetup.microsoftTeams.manifest.copy");
    const manifestNote = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.microsoftTeams.manifest.clientIdNote",
    );
    expect(manifestNote.english).toContain("not a complete app package");
    expect(manifestNote.portuguese).toContain("não é um pacote completo do app");
    expect(setup).toContain("disabled={!credentials.clientId?.trim()}");
    expect(setup).toContain('scopes: ["personal", "team", "groupChat"]');
    expect(setup).toContain('scopes: ["personal", "groupChat"]');
    expect(setup).toContain('title: "/status"');
    expect(setup).toContain('title: "/new"');
    expect(setup).toContain('title: "/close"');
    expect(setup).not.toContain("supportsTargetedMessages");
    expect(setup).toContain("resourceSpecific");
    expect(setup).toContain("ChannelMessage.Read.Group");
    expect(setup).toContain("ChatMessage.Read.Chat");
    const teamsAppInstruction = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.microsoftTeams.instructions.teamsApp",
    );
    expect(teamsAppInstruction.english).toContain("not Microsoft Graph permissions in Entra");
    expect(teamsAppInstruction.portuguese).toContain("não são permissões do Microsoft Graph no Entra");
    const noSsoNote = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.microsoftTeams.manifest.noSsoNote",
    );
    expect(noSsoNote.english).toContain("webApplicationInfo");
    expect(noSsoNote.portuguese).toContain("webApplicationInfo");
    expect(setup).toContain('resource: "https://paperclip.ing"');
    expect(noSsoNote.english).toContain("only associates the RSC");
    expect(noSsoNote.portuguese).toContain("apenas associa as permissões RSC");
    expect(noSsoNote.english).toContain("you do not need to register an Entra");
    expect(noSsoNote.portuguese).toContain("não é necessário registrar um URI");
    expect(teamsAppInstruction.english).toContain("receive every message");
    expect(teamsAppInstruction.portuguese).toContain("receba todas as mensagens");
    expect(setup).not.toContain(
      "does not require a <code>webApplicationInfo</code>",
    );
    expect(setup).not.toContain("api://paperclip-chat/");
    const supportedScopes = expectBilingualCopy(
      setup,
      "apps.chatEndpointSetup.microsoftTeams.manifest.supportedScopesNote",
    );
    expect(supportedScopes.english).toContain("not private channels");
    expect(supportedScopes.portuguese).toContain("não a canais privados");
    expect(supportedScopes.english).toContain("native file receipt and consent-based sending");
    expect(supportedScopes.portuguese).toContain("recebimento nativo de arquivos e o envio mediante consentimento");
    expect(setup).toContain("issue_comment");
    expect(setup).toContain("pull_request");
    expect(setup).toContain("pull_request_review_comment");
    expect(setup).toContain('type="password"');
    expect(setup).not.toContain("WebkitTextSecurity");
    expect(setup).toContain("buildSlackAppManifest");
    expect(setup).toContain("defaultSlackAppConfiguration");
    const manifest = buildSlackAppManifest({
      app: { appName: "Maya", botName: "maya", command: "/maya" },
      agentName: "Maya",
      webhookUrl: "https://paperclip.example/api/chat-webhooks/test/slack",
    });
    expect(manifest.settings.event_subscriptions.bot_events).toEqual(expect.arrayContaining([
      "member_joined_channel", "member_left_channel", "channel_left", "group_left",
      "group_archive", "group_unarchive", "group_rename", "app_uninstalled",
      "agent_session_stopped", "reaction_added", "reaction_removed",
    ]));
    expect(manifest.oauth_config.scopes.bot).toEqual(expect.arrayContaining(["reactions:write", "reactions:read", "assistant:write"]));
    expect(manifest.features).toHaveProperty("agent_view");
    expect(manifest.features).not.toHaveProperty("assistant_view");
    expect(manifest.features.bot_user).not.toHaveProperty("always_online");
    expect(manifest.features.app_home).toEqual({
      home_tab_enabled: false, messages_tab_enabled: true, messages_tab_read_only_enabled: false,
    });
    expect(setup).not.toContain("No credentials");
    expect(setup).not.toContain("managed Microsoft app");
    expect(setup).toContain("endpoint.providerAccountId && !repairing");
    expect(setup).not.toContain('field("webhookSecret"');
    expect(setup).not.toContain("@paperclipai/teams-connect");
    expect(setup).not.toContain("Copy setup command");
    expect(setup).not.toContain("Add {agentName} to Slack");
    expect(setup).not.toContain("Create in GitHub");
  });

  it("keeps provider setup failures visible without rendering submitted credentials", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    const setupError = source("./chat-setup-error.ts");
    expect(setup).toContain("sanitizedSetupErrorMessage");
    expect(setup).toContain('role="alert"');
    expect(setupError).toContain('message.replaceAll(candidate, "[redacted]")');
    expect(setupError).toContain("return encodeURIComponent(value)");
    expect(setup).toContain("onMutate: () => setSetupError(null)");
    expect(setup).not.toContain('title: "Connection failed"');
  });

  it("keeps GitHub setup on the shipped customer-owned App path", () => {
    const route = source("./ChatEndpointSetup.tsx");
    const setup = source("./GitHubChatSetup.tsx");
    expect(route).toContain('import { GitHubChatSetup } from "./GitHubChatSetup"');
    expect(route).toContain("<GitHubChatSetup />");
    expect(setup).toContain("gitHubAppManifestAction");
    expect(setup).toContain('url.origin !== "https://github.com"');
    expect(setup).toContain("githubChatApi");
    expect(setup).toContain("credentials.appId");
    expect(setup).toContain("credentials.privateKey");
    expect(setup).toContain("credentials.webhookSecret");
    expectBilingualCopy(setup, "apps.githubChatSetup.progress.checkingConnection");
    expectBilingualCopy(setup, "apps.githubChatSetup.existing.appId");
    expectBilingualCopy(setup, "apps.githubChatSetup.existing.privateKey");
    expectBilingualCopy(setup, "apps.githubChatSetup.existing.webhookSecret");
    expectBilingualCopy(setup, "apps.githubChatSetup.existing.reconnectDescription");
  });
});
