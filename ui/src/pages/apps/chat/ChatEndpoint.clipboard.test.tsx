// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatEndpoint, ChatProvider } from "@/api/chatEndpoints";
import { queryKeys } from "@/lib/queryKeys";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatSetupSidebarProvider } from "@/context/ChatSetupSidebarContext";
import { ChatSetupSidebar } from "@/components/chat/ChatSetupNavigation";
import { i18n } from "@/i18n";
import { ChatEndpointSetup, TryStep } from "./ChatEndpointSetup";
import { ChatEndpointDetail } from "./ChatEndpointDetail";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getAgent: vi.fn(),
  listAgents: vi.fn(),
  tab: "access",
  listActivityPage: vi.fn(),
  replayDelivery: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateResources: vi.fn(),
  slackCapabilities: vi.fn(),
  slackSearch: vi.fn(),
  slackConfigure: vi.fn(),
  slackConnect: vi.fn(),
  slackDisconnect: vi.fn(),
  createSlackApp: vi.fn(),
  installSlackApp: vi.fn(),
  resumeSlackInstallation: vi.fn(),
  inspectPhoton: vi.fn(),
  setup: vi.fn(),
  test: vi.fn(),
  setupTestStatus: vi.fn(),
  finishSlackSetup: vi.fn(),
  generateSetupSecret: vi.fn(),
  listPrincipals: vi.fn(),
  listResources: vi.fn().mockResolvedValue([]),
  createLinkIntent: vi.fn(),
  confirmIdentityLink: vi.fn(),
  pushToast: vi.fn(),
  setBreadcrumbs: vi.fn(),
  search: "",
  setParams: vi.fn(),
}));
vi.mock("@/api/chatEndpoints", () => ({ chatEndpointsApi: mocks }));
vi.mock("@/api/slackTools", () => ({ slackToolsApi: {
  capabilities: mocks.slackCapabilities,
  search: mocks.slackSearch,
  configure: mocks.slackConfigure,
  connect: mocks.slackConnect,
  disconnect: mocks.slackDisconnect,
} }));
vi.mock("@/api/githubChat", () => ({ githubChatApi: {
  configuration: async () => ({ revision: 0, configuration: {} }),
  progress: async () => mocks.get(),
  advance: async () => ({ endpointId: "endpoint-a", state: "create" }),
} }));
vi.mock("@/api/auth", () => ({ authApi: { getSession: async () => ({ user: { id: "owner-user", name: "Owner" } }) } }));
vi.mock("@/api/health", () => ({ healthApi: { get: async () => ({ deploymentMode: "authenticated" }) } }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: mocks.listAgents, get: mocks.getAgent } }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: async () => ({ enableIsolatedWorkspaces: true }) } }));
vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-a" }),
}));
vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mocks.setBreadcrumbs }),
}));
vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ pushToast: mocks.pushToast }),
}));
vi.mock("@/context/SidebarContext", () => ({
  useSidebar: () => ({ isMobile: false }),
}));
vi.mock("@/lib/router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
  useParams: () => ({ endpointId: "endpoint-a", tab: mocks.tab }),
  useSearchParams: () => [new URLSearchParams(mocks.search), mocks.setParams],
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Navigate: () => null,
}));

describe("chat setup and identity-link clipboard actions", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let copied: string[];
  let writeText: ReturnType<typeof vi.fn>;
  let execCommand: ReturnType<typeof vi.fn>;
  const secret = "synthetic-one-time-webhook-secret";

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    localStorage.clear();
    vi.spyOn(window, "open").mockReturnValue(null);
    mocks.listAgents.mockResolvedValue([{ id: "agent-a", name: "Maya", status: "idle" }]);
    mocks.getAgent.mockResolvedValue({ id: "agent-a", name: "Maya", appearance: { schemaVersion: 1, characterVersion: "cap-v1", paletteId: "cherry-pop" } });
    mocks.listResources.mockResolvedValue([]);
    mocks.slackCapabilities.mockResolvedValue({ grantedScopes: [], missingScopes: [], tools: [] });
    mocks.slackSearch.mockResolvedValue({ configured: false, clientId: null, redirectUri: null, connected: false, nativeSearchAvailable: true, limitation: "Personal search is unavailable on this provider host.", canConfigure: false });
    mocks.slackConfigure.mockResolvedValue({ configured: true, clientId: "client-id-external", redirectUri: "https://example.test/slack/oauth/callback?client=original", connected: false, nativeSearchAvailable: true, limitation: "", canConfigure: true });
    mocks.slackConnect.mockResolvedValue({ url: "https://slack.example.test/oauth" });
    mocks.slackDisconnect.mockResolvedValue({ configured: false, clientId: null, redirectUri: null, connected: false, nativeSearchAvailable: true, limitation: "", canConfigure: false });
    mocks.tab = "access";
    mocks.listActivityPage.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    copied = [];
    writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("isSecureContext", false);
    execCommand = vi.fn(() => {
      copied.push((document.activeElement as HTMLTextAreaElement).value);
      return true;
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    mocks.setupTestStatus.mockResolvedValue({ messageReceivedAt: null });
    mocks.finishSlackSetup.mockResolvedValue({ id: "endpoint-a", status: "active" });
    mocks.generateSetupSecret.mockResolvedValue({ webhookSecret: secret });
    mocks.listPrincipals.mockResolvedValue([
      {
        id: "link-a",
        principalId: "principal-a",
        externalLabel: "Test person",
        status: "pending",
      },
    ]);
    mocks.createLinkIntent.mockResolvedValue({
      confirmationUrl:
        "/chat-identity/confirm?token=synthetic-private-confirmation-token",
    });
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    client.clear();
    container.remove();
    Reflect.deleteProperty(document, "execCommand");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.useRealTimers();
  });
  async function settle() {
    for (let i = 0; i < 5; i += 1)
      await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync(() => {});
  }
  function visibleHeading() {
    return [...container.querySelectorAll("h1")]
      .find((heading) => !heading.closest("[hidden]"))?.textContent;
  }
  async function click(text: string) {
    const button = [...document.body.querySelectorAll("button")].find(
      (node) => node.textContent?.trim() === text,
    );
    expect(button, text).toBeDefined();
    flushSync(() => button!.click());
    await settle();
  }
  async function render(provider: ChatProvider, detail = false, publicHttps = true, automaticSlack = false) {
    const endpoint: ChatEndpoint = {
      id: "endpoint-a",
      companyId: "company-a",
      provider,
      status: "draft",
      assignedAgentId: "agent-a",
      assignedAgentName: "Maya",
      allowUnlinkedPeople: false,
      setup: {
        step: "provider_setup",
        webhookUrl: publicHttps ? "https://example.test/api/chat-webhooks/test" : null,
        webhookSecretConfigured: false,
        ...(provider === "microsoft-teams" ? {
          messagingEndpoint: "https://example.test/api/chat-webhooks/teams/endpoint-a",
        } : {}),
        ...(automaticSlack ? {
          slackSetupMethod: "automatic" as const,
          slackOAuthCallbackUri: "https://example.test/api/chat-slack/oauth/callback",
        } : {}),
      },
    };
    mocks.get.mockResolvedValue(endpoint);
    mocks.search = `provider=${provider}&purpose=chat&resume=endpoint-a`;
    flushSync(() =>
      root.render(
        <QueryClientProvider client={client}>
          {detail ? <ChatEndpointDetail /> : (
            <TooltipProvider>
            <ChatSetupSidebarProvider>
              <ChatSetupSidebar />
              <main><ChatEndpointSetup /></main>
            </ChatSetupSidebarProvider>
            </TooltipProvider>
          )}
        </QueryClientProvider>,
      ),
    );
    await settle();
    return endpoint;
  }

  it.each([
    ["en", "Create Maya in Telegram", "Create a bot with BotFather", "Open BotFather", "Paperclip works with Telegram's default bot privacy mode", "Bot token", "Connect bot", "Connect provider", "Connection setup progress"],
    ["pt-BR", "Criar Maya no Telegram", "Crie um bot com o BotFather", "Abrir BotFather", "O Paperclip funciona com o modo de privacidade padrão dos bots do Telegram", "Token do bot", "Conectar bot", "Conectar provedor", "Progresso da configuração da conexão"],
  ])("localizes Telegram setup in %s and preserves the BotFather URL, command, and entered token", async (locale, heading, createDescription, botFatherLabel, privacyIntro, tokenLabel, connectLabel, stepLabel, progressAria) => {
    await i18n.changeLanguage(locale);
    const endpoint = await render("telegram");
    expect(container.querySelector("h1")?.textContent).toBe(heading);
    expect(container.textContent).toContain(createDescription);
    expect(container.textContent).toContain(privacyIntro);
    expect(container.textContent).toContain("/newbot");
    expect(container.textContent).toContain("/task@bot_username <request>");
    expect(container.querySelector("aside nav")?.getAttribute("aria-label")).toBe(progressAria);
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toContain(stepLabel);

    await click(botFatherLabel);
    expect(window.open).toHaveBeenCalledWith("https://t.me/BotFather", "_blank", "noopener,noreferrer");

    const token = "  123456:synthetic-telegram-token  ";
    const tokenInput = [...container.querySelectorAll("label")]
      .find((label) => label.textContent?.trim() === tokenLabel)
      ?.querySelector("input");
    expect(tokenInput).toBeDefined();
    expect(tokenInput?.type).toBe("password");
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(tokenInput, token);
      tokenInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(tokenInput?.value).toBe(token);

    mocks.setup.mockResolvedValueOnce({ ...endpoint, setup: { ...endpoint.setup!, step: "test" } });
    await click(connectLabel);
    expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
      action: "configure",
      credentials: { botToken: token },
    });
  });

  it.each([
    [
      "en",
      "Connect Maya to Discord",
      "Create one dedicated Discord application and bot for this Paperclip agent.",
      "Open Discord Developer Portal",
      "Application ID",
      "Server ID",
      "Bot token",
      "Connect Discord bot",
    ],
    [
      "pt-BR",
      "Conectar Maya ao Discord",
      "Crie um aplicativo e bot exclusivos do Discord para este agente do Paperclip.",
      "Abrir Discord Developer Portal",
      "ID do aplicativo",
      "ID do servidor",
      "Token do bot",
      "Conectar bot do Discord",
    ],
  ])(
    "localizes Discord setup in %s and preserves credentials, provider labels, and the install URL",
    async (locale, heading, description, portalLabel, applicationIdLabel, serverIdLabel, botTokenLabel, connectLabel) => {
      await i18n.changeLanguage(locale);
      const endpoint = await render("discord");
      expect(container.querySelector("h1")?.textContent).toBe(heading);
      expect(container.textContent).toContain(description);
      expect(container.textContent).toContain("General Information");
      expect(container.textContent).toContain("Message Content Intent");
      expect(container.textContent).toContain("Developer Mode");
      expect(container.textContent).toContain("View Channels, Send Messages, Create Public Threads, Send Messages in Threads, Read Message History, Add Reactions, Embed Links, and Attach Files");

      await click(portalLabel);
      expect(window.open).toHaveBeenCalledWith(
        "https://discord.com/developers/applications",
        "_blank",
        "noopener,noreferrer",
      );

      const inputFor = (name: string) => [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.trim() === name)
        ?.querySelector("input") as HTMLInputElement;
      const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const applicationId = "  app id/2  ";
      const serverId = " server#42 ";
      const botToken = "  MTA-private-bot-token  ";
      setValue(inputFor(applicationIdLabel), applicationId);
      setValue(inputFor(serverIdLabel), serverId);
      setValue(inputFor(botTokenLabel), botToken);

      const installLink = container.querySelector<HTMLAnchorElement>('a[href^="https://discord.com/oauth2/authorize"]')!;
      expect(installLink.href).toBe(
        "https://discord.com/oauth2/authorize?client_id=app%20id%2F2&permissions=309237763136&scope=bot&guild_id=server%2342&disable_guild_select=true",
      );
      expect(installLink.href).not.toContain("MTA-private-bot-token");

      mocks.setup.mockResolvedValueOnce({ ...endpoint, setup: { ...endpoint.setup, step: "test" } });
      await click(connectLabel);
      expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
        action: "configure",
        credentials: { applicationId, guildId: serverId, botToken },
      });
    },
  );

  it.each([
    ["en", "Application ID", "Server ID", "Bot token", "Connect Discord bot", "Connection failed", "Check the required values and provider access, then try again."],
    ["pt-BR", "ID do aplicativo", "ID do servidor", "Token do bot", "Conectar bot do Discord", "Falha na conexão", "Confira os valores obrigatórios e o acesso ao provedor e tente novamente."],
  ])("localizes the setup fallback when Discord returns no error message in %s", async (locale, applicationIdLabel, serverIdLabel, botTokenLabel, connectLabel, heading, fallback) => {
    await i18n.changeLanguage(locale);
    await render("discord");
    const inputFor = (name: string) => [...container.querySelectorAll("label")]
      .find((label) => label.textContent?.trim() === name)
      ?.querySelector("input") as HTMLInputElement;
    const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    setValue(inputFor(applicationIdLabel), "synthetic-app-id");
    setValue(inputFor(serverIdLabel), "synthetic-server-id");
    setValue(inputFor(botTokenLabel), "synthetic-discord-token");
    mocks.setup.mockRejectedValueOnce(undefined);

    await click(connectLabel);

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(heading);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(fallback);
    expect(container.textContent).not.toContain("synthetic-discord-token");
    expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
      action: "configure",
      credentials: {
        applicationId: "synthetic-app-id",
        guildId: "synthetic-server-id",
        botToken: "synthetic-discord-token",
      },
    });
  });

  it.each([
    [
      "en",
      "Connect Maya to Microsoft Teams",
      "Use your own Microsoft app credentials for this bot.",
      "Application / Client ID",
      "Directory / Tenant ID",
      "Client secret value",
      "Verify Microsoft credentials",
    ],
    [
      "pt-BR",
      "Conectar Maya ao Microsoft Teams",
      "Use suas próprias credenciais de app Microsoft para este bot.",
      "ID do Aplicativo / cliente",
      "ID do Diretório / tenant",
      "Valor do segredo do cliente",
      "Verificar credenciais Microsoft",
    ],
  ])(
    "localizes Microsoft Teams setup in %s and preserves portal URLs, manifest scopes, and credential payload",
    async (locale, heading, description, clientIdLabel, tenantIdLabel, secretLabel, connectLabel) => {
      await i18n.changeLanguage(locale);
      const endpoint = await render("microsoft-teams");
      expect(container.querySelector("h1")?.textContent).toBe(heading);
      expect(container.textContent).toContain(description);
      expect(container.textContent).toContain("teams.live.com");
      expect(container.textContent).toContain("21Vianet");
      expect(container.textContent).toContain("Application (client) ID");
      expect(container.textContent).toContain("Single Tenant");
      expect(container.textContent).toContain("Use existing app registration");
      expect(container.textContent).toContain("Microsoft Graph");

      expect(container.querySelector('a[href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"]')).not.toBeNull();
      expect(container.querySelector('a[href="https://portal.azure.com/#create/Microsoft.AzureBot"]')).not.toBeNull();
      expect(container.querySelector('a[href="https://dev.teams.microsoft.com/apps"]')).not.toBeNull();
      expect(container.textContent).toContain("https://example.test/api/chat-webhooks/teams/endpoint-a");

      const inputFor = (name: string) => [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.trim() === name)
        ?.querySelector("input") as HTMLInputElement;
      const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const clientId = "  11111111-1111-4111-8111-111111111111  ";
      const tenantId = "22222222-2222-4222-8222-222222222222";
      const clientSecret = "  synthetic-teams-client-secret  ";
      setValue(inputFor(clientIdLabel), clientId);
      setValue(inputFor(tenantIdLabel), tenantId);
      setValue(inputFor(secretLabel), clientSecret);

      const manifest = JSON.parse(container.querySelector("textarea")!.value);
      expect(manifest.bots[0]).toMatchObject({
        botId: "11111111-1111-4111-8111-111111111111",
        scopes: ["personal", "team", "groupChat"],
        supportsFiles: true,
      });
      expect(manifest.webApplicationInfo).toEqual({
        id: "11111111-1111-4111-8111-111111111111",
        resource: "https://paperclip.ing",
      });
      expect(manifest.authorization.permissions.resourceSpecific).toEqual([
        { name: "ChannelMessage.Read.Group", type: "Application" },
        { name: "ChatMessage.Read.Chat", type: "Application" },
      ]);

      mocks.setup.mockResolvedValueOnce({ ...endpoint, setup: { ...endpoint.setup, step: "test" } });
      await click(connectLabel);
      expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
        action: "configure",
        credentials: { clientId, tenantId, clientSecret },
      });
    },
  );

  it.each([
    ["en", "Connect iMessage Photon", "Connect Maya to Photon Cloud.", "Photon dashboard", "Photon line setup", "Project ID", "Project secret", "Inspect Photon project", "Connect selected number"],
    ["pt-BR", "Conectar iMessage Photon", "Conecte Maya ao Photon Cloud.", "Painel do Photon", "Configuração de linha do Photon", "ID do projeto", "Segredo do projeto", "Inspecionar projeto Photon", "Conectar número selecionado"],
  ])(
    "localizes the dedicated iMessage Photon setup in %s and preserves provider URLs and credentials",
    async (locale, heading, description, dashboardLabel, lineSetupLabel, projectIdLabel, projectSecretLabel, inspectLabel, connectLabel) => {
      await i18n.changeLanguage(locale);
      const endpoint = await render("imessage-photon");
      expect(container.querySelector("h1")?.textContent).toBe(heading);
      expect(container.textContent).toContain(description);
      expect(container.querySelector('a[href="https://app.photon.codes/"]')?.textContent).toContain(dashboardLabel);
      expect(container.querySelector('a[href="https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing"]')?.textContent).toContain(lineSetupLabel);

      const inputFor = (name: string) => [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.trim() === name)
        ?.querySelector("input") as HTMLInputElement;
      const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const projectId = "  photon-project-external-id  ";
      const projectSecret = "  photon-private-project-secret  ";
      setValue(inputFor(projectIdLabel), projectId);
      setValue(inputFor(projectSecretLabel), projectSecret);

      mocks.inspectPhoton.mockResolvedValueOnce({
        projectId: "photon-project-external-id",
        projectName: "External Photon Project",
        allocation: "dedicated",
        eligible: true,
        lines: [{ lineId: "external-line-id-42", phoneNumber: "+15555550142", eligible: true }],
      });
      await click(inspectLabel);
      expect(mocks.inspectPhoton).toHaveBeenCalledWith("endpoint-a", {
        projectId: "photon-project-external-id",
        projectSecret,
      });
      expect(container.textContent).toContain("External Photon Project");
      expect(container.textContent).toContain("+15555550142");
      expect(container.textContent).not.toContain(projectSecret.trim());

      mocks.setup.mockResolvedValueOnce({ ...endpoint, setup: { ...endpoint.setup, step: "test" } });
      await click(connectLabel);
      expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
        action: "configure",
        credentials: { projectSecret },
        photon: {
          projectId: "photon-project-external-id",
          lineId: "external-line-id-42",
          allocation: "dedicated",
        },
      });
    },
  );

  it.each([
    ["en", "Inspect Photon project", "Connect shared DMs", "Direct messages only."],
    ["pt-BR", "Inspecionar projeto Photon", "Conectar mensagens diretas compartilhadas", "Somente mensagens diretas."],
  ])(
    "keeps the shared iMessage Photon allocation and payload in %s",
    async (locale, inspectLabel, connectLabel, sharedGuidance) => {
      await i18n.changeLanguage(locale);
      const endpoint = await render("imessage-photon");
      const projectId = "shared-project-id";
      const projectSecret = "shared-project-secret";
      const projectInput = [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.trim() === (locale === "en" ? "Project ID" : "ID do projeto"))
        ?.querySelector("input") as HTMLInputElement;
      const secretInput = [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.trim() === (locale === "en" ? "Project secret" : "Segredo do projeto"))
        ?.querySelector("input") as HTMLInputElement;
      const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      setValue(projectInput, projectId);
      setValue(secretInput, projectSecret);

      mocks.inspectPhoton.mockResolvedValueOnce({
        projectId,
        projectName: "Shared Photon Project",
        allocation: "shared",
        eligible: true,
        lines: [],
      });
      await click(inspectLabel);
      expect(container.textContent).toContain(sharedGuidance);
      mocks.setup.mockResolvedValueOnce({ ...endpoint, setup: { ...endpoint.setup, step: "test" } });
      await click(connectLabel);
      expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
        action: "configure",
        credentials: { projectSecret },
        photon: { projectId, allocation: "shared" },
      });
    },
  );

  it.each([
    ["en", "App configuration access token", "Get your App configuration access token", "Select the workspace where you want to install your bot.", "Create Slack app", "App configuration access token", "Connection setup progress"],
    ["pt-BR", "Token de configuração do App", "Obter token de configuração do App", "Selecione o workspace no qual você quer instalar o bot.", "Criar app do Slack", "Token de configuração do App", "Progresso da configuração da conexão"],
  ])("renders the automatic Slack setup shell in %s and keeps Slack URLs and UI labels intact", async (locale, heading, tokenLink, workspaceInstruction, createLabel, activeStepLabel, progressAria) => {
    await i18n.changeLanguage(locale);
    await render("slack", false, true, true);
    expect(container.querySelector("h1")?.textContent).toBe(heading);
    expect(container.textContent).toContain(tokenLink);
    expect(container.textContent).toContain("Your App Configuration Tokens");
    expect(container.textContent).toContain("Generate Token");
    expect(container.textContent).toContain(workspaceInstruction);
    expect(container.querySelector('a[href="https://api.slack.com/apps"]')).not.toBeNull();
    expect(container.querySelector("aside nav")?.getAttribute("aria-label")).toBe(progressAria);
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toContain(activeStepLabel);
    expect([...container.querySelectorAll("button")].some(button => button.textContent?.trim() === createLabel)).toBe(true);
    expect(container.querySelector<HTMLInputElement>("#slack-configuration-token")?.type).toBe("password");
  });

  it.each([
    ["en", "1Choose agent", "Advanced", "Slack app name", "Bot display name", "Slash command"],
    ["pt-BR", "1Escolher agente", "Avançado", "Nome do app Slack", "Nome de exibição do bot", "Comando slash"],
  ])("localizes Slack App details in %s while preserving the name and slash-command values", async (locale, agentStep, advancedLabel, appNameLabel, botNameLabel, commandLabel) => {
    await i18n.changeLanguage(locale);
    const endpoint = await render("slack", false, true, true);
    mocks.update.mockImplementation(async (_id, input) => ({
      ...endpoint,
      setup: { ...endpoint.setup, slackApp: input.slackApp, command: input.slackApp.command },
    }));
    await click(agentStep);
    const advanced = container.querySelector("details")!;
    expect(advanced.querySelector("summary")?.textContent).toContain(advancedLabel);
    advanced.open = true;
    const edited = { appName: 'Research & "Ops"', botName: "research-ops", command: "/research" };
    for (const [id, label, value] of [
      ["slack-appName", appNameLabel, edited.appName],
      ["slack-botName", botNameLabel, edited.botName],
      ["slack-command", commandLabel, edited.command],
    ]) {
      const fieldLabel = [...container.querySelectorAll("label")].find(node => node.textContent === label)!;
      expect(fieldLabel.htmlFor).toBe(id);
      const input = document.getElementById(id) as HTMLInputElement;
      flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      flushSync(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
      await settle();
    }
    expect(mocks.update).toHaveBeenLastCalledWith("endpoint-a", { slackApp: edited });
    expect((document.getElementById("slack-command") as HTMLInputElement).value).toBe("/research");
  });

  it("pages older activity and lets users return after a page fails", async () => {
    mocks.tab = "activity";
    const item = (id: string) => ({ id, kind: "delivery", status: "processed", summary: id, createdAt: "2026-01-01T00:00:00Z" });
    mocks.listActivityPage.mockImplementation(async (_id, cursor) => cursor
      ? { items: [item("Older message")], nextCursor: null }
      : { items: [item("Newest message")], nextCursor: "older-cursor" });
    await render("slack", true);
    expect(container.textContent).toContain("Newest message");
    await click("Next");
    expect(mocks.listActivityPage).toHaveBeenLastCalledWith("endpoint-a", "older-cursor");
    expect(container.textContent).toContain("Older message");
    expect(container.textContent).toContain("Page 2");
    await click("Previous");
    expect(container.textContent).toContain("Newest message");
    client.removeQueries({ queryKey: [...queryKeys.chatEndpoints.activity("endpoint-a"), "older-cursor"] });
    mocks.listActivityPage.mockRejectedValue(new Error("Offline"));
    await click("Next");
    expect(container.textContent).toContain("Connection activity could not be loaded");
    await click("Previous");
    expect(container.textContent).toContain("Page 1");
  });

  it.each([
    ["en", "Connection activity", "Inbound delivery", "Replay", "Page 1", "Connection setup is incomplete.", "Delivery queued for replay"],
    ["pt-BR", "Atividade da conexão", "Entrega recebida", "Reexecutar", "Página 1", "A configuração da conexão está incompleta.", "Entrega colocada na fila para reexecução"],
  ])(
    "localizes chat activity in %s while preserving provider evidence and identifiers",
    async (locale, heading, kind, replayLabel, pageLabel, healthLabel, toastTitle) => {
      await i18n.changeLanguage(locale);
      mocks.tab = "activity";
      const providerSummary = "Provider callback: <external> event 42";
      const providerDetail = "HTTP 429 Retry-After: 30; request_id=ext-77";
      const providerActivityId = "delivery-provider-id-42";
      const providerTimestamp = "2026-11-03T12:34:56.000Z";
      mocks.listActivityPage.mockResolvedValue({
        items: [{
          id: providerActivityId,
          kind: "delivery",
          status: "failed",
          summary: providerSummary,
          detail: providerDetail,
          createdAt: providerTimestamp,
          replayable: true,
        }],
        nextCursor: null,
      });
      mocks.replayDelivery.mockResolvedValue(undefined);

      await render("slack", true);

      expect(container.textContent).toContain(heading);
      expect(container.textContent).toContain(kind);
      expect(container.textContent).toContain(pageLabel);
      expect(container.textContent).toContain(healthLabel);
      expect(container.textContent).toContain(providerSummary);
      expect(container.textContent).toContain(providerDetail);
      expect(container.querySelector("external")).toBeNull();
      expect(container.querySelector("time")?.getAttribute("datetime")).toBe(providerTimestamp);
      expect(container.querySelector("time")?.textContent).toContain(":56");
      const replayButton = [...container.querySelectorAll("button")]
        .find((button) => button.textContent?.trim() === replayLabel);
      expect(replayButton).toBeDefined();
      flushSync(() => replayButton!.click());
      await settle();

      expect(mocks.replayDelivery).toHaveBeenCalledWith("endpoint-a", providerActivityId);
      expect(mocks.pushToast).toHaveBeenCalledWith({ title: toastTitle, tone: "success" });
    },
  );

  it.each([
    ["en", "People", "Waiting for account confirmation", "Create confirmation link", "Confirm <Taylor ext>", "Copy link"],
    ["pt-BR", "Pessoas", "Aguardando confirmação da conta", "Criar link de confirmação", "Confirmar <Taylor ext>", "Copiar link"],
  ])(
    "localizes the %s identity access flow and keeps external identity/link data intact",
    async (locale, heading, pendingLabel, createLabel, confirmationHeading, copyLinkLabel) => {
      await i18n.changeLanguage(locale);
      mocks.tab = "access";
      const externalLabel = "<Taylor ext>";
      const confirmationUrl = "/chat-identity/confirm?token=synthetic-private-confirmation-token";
      const absoluteConfirmationUrl = new URL(confirmationUrl, window.location.origin).toString();
      mocks.listPrincipals.mockResolvedValue([{
        id: "link-row-42",
        principalId: "slack-principal-42",
        externalLabel,
        status: "pending",
      }]);
      mocks.createLinkIntent.mockResolvedValue({ confirmationUrl });

      await render("slack", true);

      expect(container.textContent).toContain(heading);
      expect(container.textContent).toContain(externalLabel);
      expect(container.textContent).toContain(pendingLabel);
      expect(container.querySelector("taylor")).toBeNull();
      await click(createLabel);
      expect(mocks.createLinkIntent).toHaveBeenCalledWith("endpoint-a", "slack-principal-42");
      expect(container.textContent).toContain(confirmationHeading);
      expect(container.textContent).toContain(absoluteConfirmationUrl);
      await click(copyLinkLabel);
      expect(copied).toEqual([absoluteConfirmationUrl]);
    },
  );

  it.each([
    ["en", "Invite people", "Invite people to talk to Maya", "Send /paperclip connect in Slack.", "Copy command", "Copy invitation", "Invitation copied"],
    ["pt-BR", "Convidar pessoas", "Convide pessoas para conversar com Maya", "Envie /paperclip connect no Slack.", "Copiar comando", "Copiar convite", "Convite copiado"],
  ])(
    "localizes Slack invitation instructions and keeps the copied route values in %s",
    async (locale, inviteLabel, dialogTitle, instruction, copyCommandLabel, copyInviteLabel, inviteCopiedLabel) => {
      await i18n.changeLanguage(locale);
      mocks.tab = "access";

      await render("slack", true);
      await click(inviteLabel);

      expect(document.body.textContent).toContain(dialogTitle);
      expect(document.body.textContent).toContain(instruction);
      await click(copyCommandLabel);
      expect(copied).toEqual(["/paperclip connect"]);
      await click(copyInviteLabel);
      expect(document.body.textContent).toContain(inviteCopiedLabel);
      expect(copied[1]).toContain("Maya");
      expect(copied[1]).toContain("https://app.slack.com/");
      expect(copied[1]).toContain("/paperclip connect");
    },
  );

  it.each([
    ["en", "Allowed Channels", "Enable Channel <provider-42>", "Participants: Dana <external>, Sam provider", "Allow direct messages", "Additional communication instructions", "Save instructions", "Message in a channel", "Copy message", "Slack tools", "Read, search, and act in Slack. Some actions require approval.", "Agent avatar", "Download avatar", "@Maya you there?"],
    ["pt-BR", "Canais permitidos", "Ativar Channel <provider-42>", "Participantes: Dana <external>, Sam provider", "Permitir mensagens diretas", "Instruções adicionais de comunicação", "Salvar instruções", "Enviar mensagem em um canal", "Copiar mensagem", "Ferramentas do Slack", "Leia, pesquise e execute ações no Slack. Algumas ações exigem aprovação.", "Avatar do agente", "Baixar avatar", "@Maya você está aí?"],
  ])(
    "localizes Slack settings in %s while preserving destinations, message text, and credentials",
    async (locale, channelsHeading, destinationAria, participantsLabel, directMessagesLabel, instructionsLabel, saveInstructionsLabel, messageSectionLabel, copyMessageLabel, slackToolsTitle, capabilitiesDescription, avatarTitle, avatarDownloadLabel, messageExample) => {
      await i18n.changeLanguage(locale);
      mocks.tab = "settings";
      const destination = {
        id: "slack-channel-provider-42",
        type: "channel",
        label: "Channel <provider-42>",
        availability: "available",
        detail: "Provider detail: keep external-tenant-7",
        participants: ["Dana <external>", "Sam provider"],
        enabled: false,
      };
      mocks.listResources.mockResolvedValue([destination]);
      mocks.updateResources.mockResolvedValue([{ ...destination, enabled: true }]);
      mocks.slackCapabilities.mockResolvedValue({
        grantedScopes: [],
        missingScopes: ["chat:write.public"],
        tools: [],
      });
      const endpoint = await render("slack", true);
      mocks.update.mockImplementation(async (_id, input) => ({ ...endpoint, ...input }));

      expect(container.textContent).toContain(channelsHeading);
      expect(container.textContent).toContain(destination.label);
      expect(container.textContent).toContain(destination.detail);
      expect(container.textContent).toContain(participantsLabel);
      expect(container.textContent).toContain("Maya");
      expect(container.textContent).toContain(avatarTitle);
      expect(container.textContent).toContain(avatarDownloadLabel);
      expect(container.textContent).toContain(messageExample);
      expect(container.querySelector("provider-42")).toBeNull();
      const resourceSwitch = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')]
        .find((button) => button.getAttribute("aria-label") === destinationAria);
      expect(resourceSwitch).toBeDefined();
      flushSync(() => resourceSwitch!.click());
      await settle();
      expect(mocks.updateResources).toHaveBeenCalledWith("endpoint-a", [{ id: destination.id, enabled: true }]);

      const directMessagesSwitch = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')]
        .find((button) => button.getAttribute("aria-label") === directMessagesLabel);
      expect(directMessagesSwitch).toBeDefined();
      flushSync(() => directMessagesSwitch!.click());
      await settle();
      expect(mocks.update.mock.calls[0]?.slice(0, 2)).toEqual(["endpoint-a", { allowDirectMessages: true }]);

      const instructionsTextarea = container.querySelector("textarea")!;
      const customInstructions = "Preserve provider phrase <external> exactly";
      flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(instructionsTextarea, `  ${customInstructions}  `);
        instructionsTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(container.textContent).toContain(instructionsLabel);
      await click(saveInstructionsLabel);
      expect(mocks.update).toHaveBeenLastCalledWith("endpoint-a", { communicationInstructions: customInstructions });

      const messageDetails = [...container.querySelectorAll("details")]
        .find((details) => details.querySelector("summary")?.textContent?.trim() === messageSectionLabel)!;
      messageDetails.open = true;
      const copyMessageButton = [...container.querySelectorAll("button")]
        .find((button) => button.getAttribute("aria-label") === copyMessageLabel)!;
      flushSync(() => copyMessageButton.click());
      await settle();
      expect(copied).toContain(messageExample);

      const toolsDetails = [...container.querySelectorAll("details")]
        .find((details) => details.querySelector("summary")?.textContent?.trim() === slackToolsTitle)!;
      toolsDetails.open = true;
      expect(container.textContent).toContain(capabilitiesDescription);
      expect(container.textContent).toContain("chat:write.public");
    },
  );

  it.each([
    ["en", "Personal Slack search", "OAuth app configuration for connection managers", "Your Slack search access", "Client ID", "Client Secret", "Save OAuth configuration"],
    ["pt-BR", "Busca pessoal do Slack", "Configuração do app OAuth para administradores de conexões", "Seu acesso à busca do Slack", "Client ID", "Client Secret", "Salvar configuração OAuth"],
  ])(
    "localizes Slack search configuration in %s without changing credential values",
    async (locale, searchSection, oauthSummary, searchHeading, clientIdLabel, clientSecretLabel, saveLabel) => {
      await i18n.changeLanguage(locale);
      mocks.tab = "access";
      const oauthStatus = {
        configured: false,
        clientId: "client-id-provider-value",
        redirectUri: "https://slack.example.test/oauth/callback?provider=ext-42&keep=%2F",
        connected: false,
        nativeSearchAvailable: false,
        limitation: "Provider limitation: external tenant requires admin approval",
        canConfigure: true,
      };
      mocks.slackSearch.mockResolvedValue(oauthStatus);
      mocks.slackConfigure.mockResolvedValue({ ...oauthStatus, configured: true });
      await render("slack", true);

      const searchDetails = [...container.querySelectorAll("details")]
        .find((details) => details.querySelector("summary")?.textContent?.trim() === searchSection)!;
      expect(searchDetails).toBeDefined();
      searchDetails.open = true;
      expect(container.textContent).toContain(searchHeading);
      expect(container.textContent).toContain(oauthStatus.redirectUri);
      expect(container.textContent).toContain(oauthStatus.limitation);
      expect(container.textContent).toContain("search:read.public");

      const oauthDetails = [...searchDetails.querySelectorAll("details")]
        .find((details) => details.querySelector("summary")?.textContent?.trim() === oauthSummary)!;
      expect(oauthDetails).toBeDefined();
      oauthDetails.open = true;
      const clientInputId = [...container.querySelectorAll("label")]
        .find((label) => label.textContent === clientIdLabel)!.htmlFor;
      expect((document.getElementById(clientInputId) as HTMLInputElement).value).toBe(oauthStatus.clientId);
      const secretInputId = [...container.querySelectorAll("label")]
        .find((label) => label.textContent === clientSecretLabel)!.htmlFor;
      const secretField = document.getElementById(secretInputId) as HTMLInputElement;
      const clientSecret = "synthetic-provider-client-secret";
      flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(secretField, clientSecret);
        secretField.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await click(saveLabel);
      expect(mocks.slackConfigure).toHaveBeenCalledWith("company-a", "endpoint-a", {
        clientId: "client-id-provider-value",
        clientSecret,
      });
      expect((document.getElementById(secretInputId) as HTMLInputElement).value).toBe("");
    },
  );

  it.each(["slack", "microsoft-teams"] as const)(
    "copies the %s manifest via the insecure-context fallback",
    async (provider) => {
      await render(provider);
      if (provider === "microsoft-teams") {
        const input = [...container.querySelectorAll("label")]
          .find((label) =>
            label.textContent?.includes("Application / Client ID"),
          )
          ?.querySelector("input");
        expect(input).toBeDefined();
        flushSync(() => {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )!.set!.call(input, "11111111-1111-4111-8111-111111111111");
          input!.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }
      if (provider === "slack") await click("View Slack App Manifest");
      const expected = document.querySelector("textarea")!.value;
      await click(
        provider === "slack" ? "Copy manifest" : "Copy manifest settings",
      );
      expect(copied).toEqual([expected]);
      expect(writeText).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain(
        provider === "slack" ? "Manifest copied" : "Manifest settings copied",
      );
    },
  );

  it("keeps the Slack manifest in a modal and generates the creation link from saved edits", async () => {
    const endpoint = await render("slack");
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    const edited = { appName: 'Research & "Ops"', botName: "research-ops", command: "/research" };
    mocks.update.mockImplementation(async (_id, input) => ({
      ...endpoint,
      setup: { ...endpoint.setup, slackApp: input.slackApp, command: input.slackApp.command },
    }));
    await click("1Choose agent");
    const advanced = container.querySelector("details")!; advanced.open = true;
    for (const [label, value] of [
      ["Slack app name", edited.appName],
      ["Bot display name", edited.botName],
      ["Slash command", edited.command],
    ]) {
      const fieldLabel = [...container.querySelectorAll("label")].find((node) => node.textContent === label)!;
      const input = document.getElementById(fieldLabel.htmlFor) as HTMLInputElement;
      flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      flushSync(() => input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
      await settle();
    }
    expect(mocks.update).toHaveBeenLastCalledWith("endpoint-a", { slackApp: edited });
    await click("Continue");
    await click("View Slack App Manifest");
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
    expect(document.querySelector("textarea")!.readOnly).toBe(true);
    const manifest = document.querySelector("textarea")!.value;
    expect(JSON.parse(manifest)).toMatchObject({ display_information: { name: edited.appName }, features: { bot_user: { display_name: "research-ops" }, slash_commands: [{ command: "/research" }] } });
    await click("Copy manifest");
    expect(copied).toEqual([manifest]);
    await click("Close");
    expect(document.querySelector("[role=dialog]")).toBeNull();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    vi.useFakeTimers();
    const createButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Create Slack app")!;
    flushSync(() => createButton.click());
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://api.slack.com/apps");
    expect(url.searchParams.get("new_app")).toBe("1");
    expect(url.searchParams.get("manifest_json")).toBe(manifest);
    expect(open.mock.calls[0].slice(1)).toEqual(["_blank", "noopener,noreferrer"]);
    expect(container.querySelector("h1")?.textContent).toBe("Create a Slack app");
    expect(createButton.disabled).toBe(true);
    flushSync(() => createButton.click());
    expect(open).toHaveBeenCalledTimes(1);
    flushSync(() => vi.advanceTimersByTime(999));
    expect(container.querySelector("h1")?.textContent).toBe("Create a Slack app");
    flushSync(() => vi.advanceTimersByTime(1));
    vi.useRealTimers();
    expect(container.querySelector("h1")?.textContent).toBe("Add Slack credentials");
    expect(document.querySelector("textarea")).toBeNull();
    const token = container.querySelector<HTMLInputElement>("#slack-bot-token")!;
    expect(token.closest("[hidden]")).toBeNull();
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(token, "synthetic-token");
      token.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(mocks.setParams.mock.calls.at(-1)?.[0].get("stage")).toBe("credentials");
    await click("2Create Slack app");
    expect(container.querySelector("h1")?.textContent).toBe("Create a Slack app");
    expect(token.closest("[hidden]")).not.toBeNull();
    await click("View Slack App Manifest");
    expect(document.querySelector("textarea")!.value).toBe(manifest);
    await click("Close");
    await click("3Add credentials");
    expect(token.closest("[hidden]")).toBeNull();
    expect(token.value).toBe("synthetic-token");
    const finalStep = container.querySelectorAll("aside button")[4] as HTMLButtonElement;
    expect(finalStep.disabled).toBe(true);

  });

  it.each([
    [
      "en",
      "Create a Slack app",
      "View Slack App Manifest",
      "Create Slack app",
      "Add Slack credentials",
      "Now you need to find two secrets.",
      "Connect Slack app",
    ],
    [
      "pt-BR",
      "Criar um app do Slack",
      "Ver manifesto do app Slack",
      "Criar app do Slack",
      "Adicionar credenciais do Slack",
      "Agora você precisa encontrar dois segredos.",
      "Conectar app Slack",
    ],
  ])(
    "localizes manual Slack app setup in %s while preserving the manifest URL and credential payload",
    async (locale, appHeading, viewManifestLabel, createAppLabel, credentialsHeading, credentialInstructions, connectLabel) => {
      await i18n.changeLanguage(locale);
      const endpoint = await render("slack");
      expect(container.querySelector("h1")?.textContent).toBe(appHeading);
      expect(container.querySelector("aside nav")?.textContent).toContain(locale === "en" ? "Add credentials" : "Adicionar credenciais");
      expect(container.querySelector("aside nav")?.textContent).toContain(locale === "en" ? "Verify Slack connection" : "Verificar conexão do Slack");
      expect(container.querySelector("aside nav")?.textContent).toContain(locale === "en" ? "Connect your Slack account" : "Conectar sua conta do Slack");

      await click(viewManifestLabel);
      expect(document.querySelector("[role=dialog]")).not.toBeNull();
      const manifest = document.querySelector("textarea")!.value;
      const manifestData = JSON.parse(manifest);
      expect(manifestData.features.slash_commands[0]).toMatchObject({
        command: "/maya",
        url: "https://example.test/api/chat-webhooks/test",
      });
      expect(manifestData.settings.event_subscriptions.request_url).toBe("https://example.test/api/chat-webhooks/test");
      expect(manifestData.oauth_config.scopes.bot).toContain("app_mentions:read");
      await click("Close");

      const open = vi.spyOn(window, "open").mockReturnValue(null);
      vi.useFakeTimers();
      const createButton = [...container.querySelectorAll("button")]
        .find(button => button.textContent?.trim() === createAppLabel)!;
      flushSync(() => createButton.click());
      const createUrl = new URL(open.mock.calls[0][0] as string);
      expect(createUrl.origin + createUrl.pathname).toBe("https://api.slack.com/apps");
      expect(createUrl.searchParams.get("new_app")).toBe("1");
      expect(createUrl.searchParams.get("manifest_json")).toBe(manifest);
      expect(open.mock.calls[0].slice(1)).toEqual(["_blank", "noopener,noreferrer"]);
      flushSync(() => vi.advanceTimersByTime(1000));
      vi.useRealTimers();
      await settle();

      expect(container.querySelector("h1")?.textContent).toBe(credentialsHeading);
      expect(container.textContent).toContain(credentialInstructions);
      expect(container.textContent).toContain("OAuth & Permissions");
      expect(container.textContent).toContain("Basic Information");
      expect(container.querySelector('a[href="https://api.slack.com/apps"]')).not.toBeNull();

      const botToken = "  xoxb-synthetic-manual-token  ";
      const signingSecret = "  synthetic-signing-secret  ";
      const botInput = container.querySelector<HTMLInputElement>("#slack-bot-token")!;
      const signingInput = container.querySelector<HTMLInputElement>("#slack-signing-secret")!;
      const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const connectButton = [...container.querySelectorAll("button")]
        .find(button => button.textContent?.trim() === connectLabel)!;
      setValue(botInput, "xapp-invalid-bot-token");
      expect(document.getElementById("slack-bot-token-warning")?.textContent)
        .toContain(locale === "en"
          ? "Your Bot User OAuth Token must start with xoxb-."
          : "O Bot User OAuth Token precisa começar com xoxb-.");
      expect(connectButton.disabled).toBe(true);
      setValue(botInput, botToken);
      setValue(signingInput, "xapp-invalid-signing-secret");
      expect(document.getElementById("slack-signing-secret-warning")?.textContent)
        .toContain(locale === "en"
          ? "Use the Signing Secret, NOT an app or bot token."
          : "Use o Signing Secret, NÃO um token de app ou de bot.");
      expect(connectButton.disabled).toBe(true);
      setValue(signingInput, signingSecret);
      expect(connectButton.disabled).toBe(false);
      expect(botInput.type).toBe("password");
      expect(signingInput.type).toBe("password");
      expect(container.textContent).not.toContain(botToken.trim());
      expect(container.textContent).not.toContain(signingSecret.trim());

      mocks.setup.mockResolvedValueOnce({ ...endpoint, setup: { ...endpoint.setup, step: "provider_setup" } });
      await click(connectLabel);
      expect(mocks.setup).toHaveBeenCalledWith("endpoint-a", {
        action: "configure",
        credentials: { botToken, signingSecret },
      });
    },
  );

  it.each([
    ["en", "Verify Slack connection", "Slack needs to confirm that it can reach your Paperclip instance.", "Waiting for Slack. We’ll continue automatically.", "Troubleshooting"],
    ["pt-BR", "Verificar conexão do Slack", "O Slack precisa confirmar que consegue acessar sua instância do Paperclip.", "Aguardando o Slack. Vamos continuar automaticamente.", "Solução de problemas"],
  ])("localizes manual Slack verification in %s and preserves the webhook URL and Slack setup link", async (locale, heading, description, waiting, troubleshooting) => {
    await i18n.changeLanguage(locale);
    const endpoint = await render("slack");
    const verifying: ChatEndpoint = {
      ...endpoint,
      status: "verifying",
      providerAccountId: "workspace-a",
      setup: { ...endpoint.setup!, slackSetupMethod: "existing", webhookVerifiedAt: null },
    };
    mocks.get.mockResolvedValue(verifying);
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], verifying));
    await settle();

    expect(visibleHeading()).toBe(heading);
    expect(container.textContent).toContain(description);
    expect(container.textContent).toContain(waiting);
    expect(container.querySelector('a[href="https://api.slack.com/apps"]')).not.toBeNull();
    expect(container.textContent).toContain("https://example.test/api/chat-webhooks/test");
    expect(container.textContent).toContain(troubleshooting);
    expect(container.textContent).toContain("Request URL");
  });

  it.each(["xapp-", "xoxb-", "xoxp-"])("warns about a %s token in the Slack signing secret field and clears after correction", async (prefix) => {
    await render("slack");
    await click("I already created the app");
    const inputFor = (name: string) => document.getElementById([...container.querySelectorAll("label")]
      .find((label) => label.textContent === name)!.htmlFor) as HTMLInputElement;
    const setValue = (input: HTMLInputElement, value: string) => flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const signingSecret = inputFor("Signing Secret");
    const connect = [...container.querySelectorAll("button")].find((button) => button.textContent === "Connect Slack app")!;
    setValue(inputFor("Bot User OAuth Token"), "xoxb-synthetic-token");
    setValue(signingSecret, `  ${prefix}synthetic-private-token  `);
    expect(signingSecret.getAttribute("aria-invalid")).toBe("true");
    const warning = document.getElementById("slack-signing-secret-warning")!;
    expect(signingSecret.getAttribute("aria-describedby")?.split(" ")).toContain(warning.id);
    expect(warning.textContent).toContain("Signing Secret, NOT an app or bot token");
    expect(warning.textContent).not.toContain("synthetic-private-token");
    expect(connect.disabled).toBe(true);
    setValue(signingSecret, "synthetic-signing-secret");
    expect(document.getElementById("slack-signing-secret-warning")).toBeNull();
    expect(signingSecret.getAttribute("aria-invalid")).toBeNull();
    expect(connect.disabled).toBe(false);
    const botToken = inputFor("Bot User OAuth Token");
    for (const value of ["xapp-synthetic-token", "xoxp-synthetic-token", "not-a-bot-token"]) {
      setValue(botToken, value);
      expect(botToken.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById("slack-bot-token-warning")!.textContent).toContain("must start with xoxb-");
      expect(connect.disabled).toBe(true);
    }
    setValue(botToken, "  xoxb-synthetic-token  ");
    expect(document.getElementById("slack-bot-token-warning")).toBeNull();
    expect(connect.disabled).toBe(false);
    setValue(signingSecret, "");
    expect(connect.disabled).toBe(true);
    expect(container.querySelector("img")).toBeNull();
  });

  it("separates saved credentials, finishing Slack setup, and the message test", async () => {
    const endpoint = await render("slack");
    await click("I already created the app");
    const configured: ChatEndpoint = {
      ...endpoint,
      status: "verifying",
      providerAccountId: "workspace-a",
      botExternalId: "bot-a",
      setup: { ...endpoint.setup!, command: "/maya-test" },
    };
    mocks.get.mockResolvedValue(configured);
    mocks.setup.mockResolvedValueOnce(configured);
    for (const [id, value] of [["slack-bot-token", "xoxb-synthetic-token"], ["slack-signing-secret", "synthetic-secret"]]) {
      const input = document.getElementById(id)!;
      flushSync(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await click("Connect Slack app");
    expect(container.querySelector("h1")?.textContent).toBe("Verify Slack connection");
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("4Verify Slack connection");
    await click("3Add credentials");
    expect(container.querySelector("h1")?.textContent).toBe("Add Slack credentials");
    expect(container.querySelector<HTMLInputElement>("#slack-bot-token")!.value).toBe("");
    await click("Continue");
    expect(container.querySelector("h1")?.textContent).toBe("Verify Slack connection");
    expect(mocks.setup).toHaveBeenCalledTimes(1);
    expect([...container.querySelectorAll("button")].find((button) => button.textContent === "Continue")!.disabled).toBe(true);
    expect(container.querySelector("details")?.open).toBe(false);
    const verified = { ...configured, setup: { ...configured.setup, webhookVerifiedAt: new Date().toISOString() } };
    mocks.get.mockResolvedValue(verified);
    mocks.setup.mockResolvedValueOnce({ ...verified, setup: { ...verified.setup, step: "test" } });
    await client.invalidateQueries({ queryKey: ["chat-endpoint-slack-webhook-verification", endpoint.id] });
    await settle();
    expect(mocks.setup).toHaveBeenLastCalledWith(endpoint.id, { action: "verify", credentials: undefined });
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("5Connect your Slack account");
    expect(container.textContent).toContain("Connect your Slack account");
    await click("4Verify Slack connection");
    expect(container.querySelector("h1")?.textContent).toBe("Verify Slack connection");
    expect(container.textContent).toContain("Your Slack connection is working.");
    await click("Continue");
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("5Connect your Slack account");
    expect(mocks.setup).toHaveBeenCalledTimes(2);
    await click("3Add credentials");
    expect(container.querySelector("h1")?.textContent).toBe("Add Slack credentials");
  });

  it("skips verification when Slack has already verified the URL", async () => {
    const endpoint = await render("slack");
    const verified: ChatEndpoint = {
      ...endpoint, status: "verifying", providerAccountId: "workspace-a",
      setup: { ...endpoint.setup!, webhookVerifiedAt: new Date().toISOString() },
    };
    mocks.setup.mockResolvedValueOnce({ ...verified, setup: { ...verified.setup, step: "test" } });
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], verified));
    await settle();
    expect(mocks.setup).toHaveBeenCalledTimes(1);
    expect(mocks.setup).toHaveBeenCalledWith(endpoint.id, { action: "verify", credentials: undefined });
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("5Connect your Slack account");
  });

  it("picks up verification completed in another tab", async () => {
    const endpoint = await render("slack");
    const verified: ChatEndpoint = {
      ...endpoint, status: "verifying", providerAccountId: "workspace-a",
      setup: { ...endpoint.setup!, webhookVerifiedAt: new Date().toISOString() },
    };
    mocks.setup.mockRejectedValueOnce(new Error("Provider verification is not available at this setup step"));
    mocks.get.mockResolvedValue({ ...verified, setup: { ...verified.setup, step: "test" } });
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], verified));
    await settle();
    expect(mocks.setup).toHaveBeenCalledTimes(1);
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("5Connect your Slack account");
    expect(container.textContent).not.toContain("Connection failed");
  });

  it("allows retrying a failed automatic transition without looping", async () => {
    const endpoint = await render("slack");
    const verified: ChatEndpoint = {
      ...endpoint, status: "verifying", providerAccountId: "workspace-a",
      setup: { ...endpoint.setup!, webhookVerifiedAt: new Date().toISOString() },
    };
    mocks.setup.mockRejectedValueOnce(new Error("Connection interrupted"));
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], verified));
    await settle();
    expect(mocks.setup).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Connection interrupted");
    mocks.setup.mockResolvedValueOnce({ ...verified, setup: { ...verified.setup, step: "test" } });
    await click("Continue");
    expect(mocks.setup).toHaveBeenCalledTimes(2);
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("5Connect your Slack account");
  });

  async function renderSlackIdentityStep() {
    const endpoint = await render("slack");
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], {
      ...endpoint, status: "verifying", providerAccountId: "workspace-a",
      setup: { ...endpoint.setup, step: "test", command: "/maya-test", testStartedAt: "2026-09-18T20:00:00Z" },
    }));
    await settle();
    return endpoint;
  }

  it.each([
    ["en", "Connect your Slack account", "Copy command", "Open Slack", "This is my Slack account", "Continue to message test", "Try Maya in Slack", "Copy message"],
    ["pt-BR", "Conectar sua conta do Slack", "Copiar comando", "Abrir Slack", "Esta é minha conta do Slack", "Continuar para o teste de mensagem", "Testar Maya no Slack", "Copiar mensagem"],
  ])(
    "localizes manual Slack identity and message-test steps in %s without changing commands or copied messages",
    async (locale, identityHeading, copyCommandLabel, openSlackLabel, linkAccountLabel, continueLabel, testHeading, copyMessageLabel) => {
      await i18n.changeLanguage(locale);
      const externalLabel = "Slack account <external-42>";
      const externalDetail = "@provider-user-42";
      const identity = {
        id: "link-external-42",
        principalId: "provider-principal-42",
        externalLabel,
        externalDetail,
        status: "pending",
        lastConnectAt: "2026-09-18T20:01:00Z",
      };
      await renderSlackIdentityStep();
      expect(visibleHeading()).toBe(identityHeading);
      expect(container.textContent).toContain("/maya-test connect");
      expect(container.querySelector('a[href="https://app.slack.com/"]')?.textContent).toContain(openSlackLabel);
      expect(container.textContent).not.toContain("synthetic-private-confirmation-token");
      await click(copyCommandLabel);
      expect(copied).toContain("/maya-test connect");

      mocks.listPrincipals.mockResolvedValue([identity]);
      client.setQueryData(queryKeys.chatEndpoints.principals("endpoint-a"), [identity]);
      await settle();
      expect(container.textContent).toContain(externalLabel);
      expect(container.textContent).toContain(externalDetail);
      expect(container.textContent).toContain("Owner");
      mocks.confirmIdentityLink.mockImplementationOnce(async () => {
        mocks.listPrincipals.mockResolvedValue([{
          ...identity,
          status: "linked",
          paperclipUserId: "owner-user",
        }]);
        return { ok: true };
      });
      await click(linkAccountLabel);
      expect(mocks.createLinkIntent).toHaveBeenCalledWith("endpoint-a", "provider-principal-42");
      expect(mocks.confirmIdentityLink).toHaveBeenCalledWith("synthetic-private-confirmation-token");
      await click(continueLabel);
      expect(visibleHeading()).toBe(testHeading);
      expect(container.textContent).toContain(locale === "en"
        ? "Continue the conversation in the thread."
        : "Continue a conversa na thread.");
      expect(container.textContent).toContain("@Maya you there?");
      await click(copyMessageLabel);
      expect(copied).toContain("@Maya you there?");
    },
  );

  it.each(["en", "pt-BR"])("localizes provider TryStep instructions and preserves mentions, commands, phone numbers, URLs, and callbacks in %s", async (locale) => {
    const variants = [
      {
        provider: "discord" as const,
        providerName: "Discord",
        botUsername: "maya_discord",
        preserved: locale === "en" ? ["Open a text channel where the bot is installed.", "@maya_discord"] : ["Abra um canal de texto em que o bot esteja instalado.", "@maya_discord"],
        identityTitle: locale === "en" ? "Your first message identifies your account" : "Sua primeira mensagem identifica sua conta",
      },
      {
        provider: "telegram" as const,
        providerName: "Telegram",
        botUsername: "maya_telegram",
        preserved: locale === "en" ? ["Tap Start.", "/new", "Help me test this"] : ["Toque em Start.", "/new", "Help me test this"],
        identityTitle: locale === "en" ? "Identity readiness could not be checked" : "Não foi possível verificar a identidade",
        principalsError: true,
      },
      {
        provider: "github" as const,
        providerName: "GitHub",
        botUsername: "paperclip[bot]",
        preserved: locale === "en" ? ["Open an installed issue or pull request.", "@paperclip"] : ["Abra uma issue ou pull request em que o app esteja instalado.", "@paperclip"],
        identityTitle: locale === "en" ? "Your first message identifies your account" : "Sua primeira mensagem identifica sua conta",
      },
      {
        provider: "microsoft-teams" as const,
        providerName: "Microsoft Teams",
        botUsername: "maya_teams",
        preserved: locale === "en" ? ["Open an installed channel and start a new post.", "@maya_teams"] : ["Abra um canal em que o app esteja instalado e crie uma publicação.", "@maya_teams"],
        identityTitle: locale === "en" ? "Your first message identifies your account" : "Sua primeira mensagem identifica sua conta",
      },
      {
        provider: "imessage-photon" as const,
        providerName: "iMessage Photon",
        botUsername: "+15551234567",
        preserved: locale === "en" ? ["Open Apple Messages and send a fresh message to +15551234567.", "Link the discovered sender to a Paperclip person in Access"] : ["Abra o Apple Messages e envie uma nova mensagem para +15551234567.", "Vincule o remetente descoberto a uma pessoa do Paperclip em Acesso"],
        identityTitle: locale === "en" ? "Link your Messages identity" : "Vincular sua identidade do Messages",
      },
    ];
    await i18n.changeLanguage(locale);

    for (const variant of variants) {
      mocks.listPrincipals.mockResolvedValue([]);
      if ("principalsError" in variant && variant.principalsError) {
        mocks.listPrincipals.mockRejectedValueOnce(new Error("identity check unavailable"));
      }
      const onOpenAccess = vi.fn();
      const onTest = vi.fn();
      const providerUrl = `https://example.test/${variant.provider}?preserve=1`;
      flushSync(() => root.render(
        <QueryClientProvider client={client}>
          <TryStep
            endpointId="endpoint-a"
            provider={variant.provider}
            agentName="Maya"
            botUsername={variant.botUsername}
            photonAllocation="dedicated"
            providerUrl={providerUrl}
            guestIsolationState="enabled"
            pending={false}
            onOpenAccess={onOpenAccess}
            onTest={onTest}
            onSaveExit={vi.fn()}
          />
        </QueryClientProvider>,
      ));
      await settle();

      expect(container.querySelector("h1")?.textContent).toBe(locale === "en"
        ? `Try Maya in ${variant.providerName}`
        : `Testar Maya no ${variant.providerName}`);
      expect(container.textContent).toContain(variant.identityTitle);
      for (const phrase of variant.preserved) expect(container.textContent).toContain(phrase);
      expect(container.querySelector(`a[href="${providerUrl}"]`)).not.toBeNull();
      expect(container.textContent).toContain(locale === "en" ? "Complete this real conversation to finish setup." : "Conclua esta conversa real para terminar a configuração.");

      await click(locale === "en" ? "Review identity access" : "Revisar acesso da identidade");
      expect(onOpenAccess).toHaveBeenCalledTimes(1);
      if (variant.provider === "imessage-photon") {
        const copyLabel = locale === "en" ? "Copy +15551234567" : "Copiar +15551234567";
        await click(copyLabel);
        expect(copied).toContain("+15551234567");
      }
      await click(locale === "en" ? "I've sent the test message" : "Enviei a mensagem de teste");
      expect(onTest).toHaveBeenCalledTimes(1);

      flushSync(() => root.unmount());
      client.clear();
      root = createRoot(container);
      client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    }
  });

  it.each([
    ["en", "Test not complete", "Send the provider message, then try again."],
    ["pt-BR", "Teste não concluído", "Envie a mensagem pelo provedor e tente novamente."],
  ])("localizes the shared provider test fallback in %s", async (locale, title, body) => {
    await i18n.changeLanguage(locale);
    const endpoint = await render("discord");
    const readyToTest: ChatEndpoint = {
      ...endpoint,
      setup: { ...endpoint.setup!, step: "test" },
    };
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], readyToTest));
    await settle();
    mocks.test.mockRejectedValueOnce(undefined);

    await click(locale === "en" ? "I've sent the test message" : "Enviei a mensagem de teste");

    expect(mocks.pushToast).toHaveBeenCalledWith({ title, body, tone: "error" });
  });

  it("resumes event configuration on the saved app and clears the retry token", async () => {
    const endpoint = await render("slack");
    const saved: ChatEndpoint = { ...endpoint, status: "draft", setup: {
      ...endpoint.setup!, slackSetupMethod: "automatic", slackOAuthCallbackUri: "https://paperclip.example/api/chat-slack/oauth/callback",
      slackRegistration: { status: "install", appId: "ATEST", errorCode: "slack_manifest_update_pending" },
    } };
    mocks.get.mockResolvedValue(saved);
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], saved));
    await settle();
    expect(container.textContent).toContain("Retry app configuration");
    expect(container.textContent).not.toContain("Install in Slack");
    const input = container.querySelector<HTMLInputElement>("#slack-configuration-token")!;
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "synthetic-retry-token");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const ready = { ...saved, setup: { ...saved.setup!, slackRegistration: { ...saved.setup!.slackRegistration!, errorCode: null } } };
    mocks.createSlackApp.mockResolvedValue(ready);
    mocks.get.mockResolvedValue(ready);
    await click("Retry app configuration");
    expect(mocks.createSlackApp).toHaveBeenCalledWith(endpoint.id, expect.objectContaining({ credentials: { configurationToken: "synthetic-retry-token" } }));
    expect(container.textContent).toContain("Install in Slack");
    expect(container.querySelector("#slack-configuration-token")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it.each(["uploaded", "failed", "pending"] as const)("keeps automatic setup at four steps with the installer linked when avatar upload is %s", async status => {
    const endpoint = await render("slack");
    const saved: ChatEndpoint = { ...endpoint, status: "verifying", providerAccountId: "workspace-a", setup: {
      ...endpoint.setup!, step: "test", slackSetupMethod: "automatic",
      slackRegistration: { status: "configured", appId: "ATEST", managementUrl: "https://api.slack.com/apps/ATEST" },
      slackAccount: { externalUserId: "UPERSON", paperclipUserId: "owner-user", status: "linked", welcomeStatus: "sent", dmChannelId: "DTEST" },
      slackAvatar: status === "uploaded" ? { status, uploadedAt: "2026-10-07T12:00:00Z" } : status === "failed" ? { status, errorCode: "slack_avatar_upload_failed" } : { status },
    } };
    mocks.get.mockResolvedValue(saved);
    flushSync(() => client.setQueryData(["chat-endpoint-setup-resume", endpoint.id], saved));
    await settle();
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("4Send a message");
    expect(container.querySelectorAll('aside nav button')).toHaveLength(4);
    expect(container.querySelector('h1')?.textContent).toBe("Success");
    expect(container.textContent).toContain("You can now talk to Maya in Slack");
    expect(container.querySelector('[aria-label="Maya avatar"]')).not.toBeNull();
    expect(container.querySelector('main')?.textContent ?? container.textContent).not.toContain("Save & exit");
    expect(container.textContent).not.toContain("Copy message");
    expect(container.textContent).not.toContain("Open your Slack DM");
    expect(container.textContent).not.toContain("Add avatar");
    expect(container.querySelector('a[download]')).toBeNull();
    expect(localStorage.length).toBe(0);
    flushSync(() => root.unmount());
    client.clear();
    root = createRoot(container);
    flushSync(() => root.render(<QueryClientProvider client={client}><TooltipProvider><ChatSetupSidebarProvider><ChatSetupSidebar /><ChatEndpointSetup /></ChatSetupSidebarProvider></TooltipProvider></QueryClientProvider>));
    await settle();
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("4Send a message");
  });

  it("keeps a terminated agent’s saved avatar available in settings", async () => {
    mocks.tab = "settings";
    mocks.listAgents.mockResolvedValue([]);
    mocks.getAgent.mockResolvedValue({ id: "agent-a", name: "Maya", status: "terminated", appearance: { schemaVersion: 1, characterVersion: "cap-v1", paletteId: "orchid-peach" } });
    await render("slack", true);
    expect(container.querySelector('a[download]')?.getAttribute("href")).toBe("/api/agent-avatars/cap-v1/orchid-peach/rest.png?size=512&scale=1&background=paperclip-dark");
    expect(mocks.getAgent).toHaveBeenCalledWith("agent-a", "company-a");
  });

  it("keeps avatar download available in connector settings", async () => {
    mocks.tab = "settings";
    await render("slack", true);
    const section = container.querySelector('section[aria-label="Slack avatar"]')!;
    expect(section.textContent).toContain("Download avatar");
    expect(section.querySelector('a[download]')?.getAttribute("href")).toContain("/cherry-pop/rest.png?size=512&scale=1");
    expect(section.querySelector("details")?.open).toBe(false);
    expect(mocks.getAgent).toHaveBeenCalledWith("agent-a", "company-a");
  });

  it("discovers a newly invited, enabled Slack channel while settings stays open", async () => {
    mocks.tab = "settings";
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    await render("slack", true);
    expect(container.textContent).toContain("Invite Maya to a channel to add it");
    mocks.listResources.mockResolvedValue([
      { id: "channel-new", type: "channel", label: "#design", providerResourceId: "CDESIGN", availability: "available", enabled: true },
    ]);
    expect(container.textContent).not.toContain("#design");
    await vi.waitFor(() => expect(container.textContent).toContain("#design"), { timeout: 6_500 });
    expect(container.querySelector('[aria-label="Enable #design"]')?.getAttribute("aria-checked")).toBe("true");
    expect(mocks.listResources.mock.calls.length).toBeGreaterThan(1);
    expect(container.textContent).toContain("Invite Maya to a channel to add it");
  }, 10_000);

  it("waits for a fresh connect command and links the selected identity inside the wizard", async () => {
    mocks.listPrincipals.mockResolvedValue([
      { id: "old", principalId: "old", externalLabel: "Old workspace member", status: "pending", lastConnectAt: "2026-09-17T20:00:00Z" },
      { id: "unrelated", principalId: "unrelated", externalLabel: "Other workspace member", status: "pending" },
    ]);
    await renderSlackIdentityStep();
    expect(container.textContent).toContain("/maya-test connect");
    expect(container.textContent).toContain("Waiting for your connect command");
    expect(container.textContent).not.toContain("Other workspace member");
    expect(container.textContent).not.toContain("Old workspace member");
    expect(mocks.createLinkIntent).not.toHaveBeenCalled();
    await click("Copy command");
    expect(copied).toContain("/maya-test connect");
    const identity = { id: "link-a", principalId: "principal-a", externalLabel: "My Slack identity", externalDetail: "@my-slack", status: "pending", lastConnectAt: "2026-09-18T20:01:00Z" };
    mocks.listPrincipals.mockResolvedValue([identity]);
    client.setQueryData(queryKeys.chatEndpoints.principals("endpoint-a"), [identity]);
    await settle();
    expect(container.textContent).toContain("My Slack identity");
    expect(container.textContent).toContain("Owner");
    expect(mocks.confirmIdentityLink).not.toHaveBeenCalled();
    mocks.confirmIdentityLink.mockImplementationOnce(async () => {
      mocks.listPrincipals.mockResolvedValue([{ ...identity, status: "linked", paperclipUserId: "owner-user" }]);
      return { ok: true };
    });
    await click("This is my Slack account");
    expect(mocks.createLinkIntent).toHaveBeenCalledWith("endpoint-a", "principal-a");
    expect(mocks.confirmIdentityLink).toHaveBeenCalledWith("synthetic-private-confirmation-token");
    expect(container.textContent).toContain("Linked to you");
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("5Connect your Slack account");
    await click("Continue to message test");
    expect(container.querySelector('aside button[aria-current="step"]')?.textContent).toBe("6Try it");
    expect(container.textContent).toContain("@Maya you there?");
    await click("Copy message");
    expect(copied).toContain("@Maya you there?");
    expect(container.textContent).not.toContain("Review identity access");
    expect(container.textContent).not.toContain("Complete this real conversation");
    expect(container.textContent).toContain("Continue the conversation in the thread.");
    expect([...container.querySelectorAll("button")].find((button) => button.textContent === "Done")!.disabled).toBe(false);
    mocks.finishSlackSetup.mockImplementationOnce(async () => ({
      ...client.getQueryData<ChatEndpoint>(["chat-endpoint-setup-resume", "endpoint-a"]),
      status: "active", setup: { step: "complete", command: "/maya-test" },
    }));
    await click("Done");
    expect(mocks.finishSlackSetup).toHaveBeenCalledWith("endpoint-a");
    await click("5Connect your Slack account");
    expect([...container.querySelectorAll("h1")].find((heading) => !heading.closest("[hidden]"))?.textContent).toBe("Connect your Slack account");
    expect(container.textContent).toContain("Linked to you");
    await click("6Try it");
    expect([...container.querySelectorAll("h1")].find((heading) => !heading.closest("[hidden]"))?.textContent).toBe("Try Maya in Slack");
  });

  it("keeps failed identity linking in the wizard and allows retry", async () => {
    mocks.listPrincipals.mockResolvedValue([{ id: "link-a", principalId: "principal-a", externalLabel: "My Slack identity", status: "pending", lastConnectAt: "2026-09-18T20:01:00Z" }]);
    mocks.confirmIdentityLink.mockRejectedValueOnce(new Error("Expired"));
    await renderSlackIdentityStep();
    await click("This is my Slack account");
    expect(container.textContent).toContain(i18n.t("apps.chatEndpointSetup.slack.manual.identity.linkFailed"));
    expect(container.textContent).not.toContain("Continue to message test");
    expect([...container.querySelectorAll("button")].find((button) => button.textContent === "This is my Slack account")!.disabled).toBe(false);
  });

  it("does not offer to claim a Slack identity linked to someone else", async () => {
    mocks.listPrincipals.mockResolvedValue([{ id: "link-a", principalId: "principal-a", externalLabel: "Someone else", status: "linked", paperclipUserId: "another-user", paperclipUserLabel: "Another Person", lastConnectAt: "2026-09-18T20:01:00Z" }]);
    await renderSlackIdentityStep();
    expect(container.textContent).toContain("Linked to Another Person");
    expect(container.textContent).not.toContain("This is my Slack account");
    expect(container.textContent).not.toContain("Continue to message test");
    expect(mocks.createLinkIntent).not.toHaveBeenCalled();
  });

  it("links the missing HTTPS warning to the setup guide", async () => {
    await render("slack", false, false);
    const warning = container.querySelector('[role="alert"]')!;
    expect(warning.textContent).toContain("Public HTTPS URL required");
    const link = warning.querySelector("a")!;
    expect(link.textContent).toBe("Learn how to set up HTTPS");
    expect(link.href).toBe("https://docs.paperclip.ing/reference/deploy/https/");
  });

  it("cancels the delayed Slack advance when returning to the agent step", async () => {
    await render("slack");
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.useFakeTimers();
    const buttons = [...container.querySelectorAll("button")];
    flushSync(() => buttons.find((button) => button.textContent?.trim() === "Create Slack app")!.click());
    flushSync(() => buttons.find((button) => button.textContent?.trim() === "1Choose agent")!.click());
    flushSync(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector('input[aria-label="Assigned agent"]')).not.toBeNull();
    expect(mocks.setParams).not.toHaveBeenCalled();
    vi.useRealTimers();
    await click("2Create Slack app");
    await click("I already created the app");
    expect(container.querySelector("h1")?.textContent).toBe("Add Slack credentials");
  });

  it.each(["slack", "discord", "telegram", "microsoft-teams"] as const)(
    "lets %s setup revisit the agent without duplicating the connection or losing provider fields",
    async (provider) => {
      await render(provider);
      const nav = container.querySelector('aside nav[aria-label="Connection setup progress"]')!;
      expect(nav).not.toBeNull();
      expect(container.querySelector("main nav")).toBeNull();
      const steps = [...nav.querySelectorAll("button")];
      expect(steps[1].getAttribute("aria-current")).toBe("step");
      expect(steps[2].disabled).toBe(true);
      const fields = [...container.querySelectorAll("main input")];
      await click("1Choose agent");
      expect(container.querySelector('input[aria-label="Assigned agent"]')?.getAttribute("readonly")).not.toBeNull();
      expect(steps[0].getAttribute("aria-current")).toBe("step");
      expect(steps[1].disabled).toBe(false);
      await click("Continue");
      expect(steps[1].getAttribute("aria-current")).toBe("step");
      expect([...container.querySelectorAll("main input")]).toEqual(fields);
      expect(mocks.create).not.toHaveBeenCalled();
      await click("1Choose agent");
      await click(provider === "slack" ? "2Create Slack app" : "2Connect provider");
      expect(steps[1].getAttribute("aria-current")).toBe("step");
    },
  );

  it("resumes an assigned GitHub draft in the two-screen wizard without creating a connection", async () => {
    await render("github");
    const steps = [...container.querySelectorAll('nav[aria-label="GitHub connection setup progress"] button')];
    expect(steps).toHaveLength(2);
    expect(steps[1].getAttribute("aria-current")).toBe("step");
    expect(container.querySelector("h1")?.textContent).toBe("Connect GitHub");
    expect(container.querySelector("input#github-app-name")?.getAttribute("value")).toBe("Maya");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps manual existing-App recovery write-only without generating or copying credentials", async () => {
    await render("github");
    await click("I already have an App");
    expect(container.querySelector('input[type="password"]')).not.toBeNull();
    expect(container.querySelector("textarea")?.value).toBe("");
    expect(container.textContent).not.toContain("Copy webhook secret");
    expect(container.textContent).not.toContain("Generate webhook secret");
    expect(mocks.generateSetupSecret).not.toHaveBeenCalled();
    expect(copied).toEqual([]);
  });

  it("copies a reusable Slack invitation without granting access or exposing a private confirmation token", async () => {
    await render("slack", true);
    await click("Invite people");
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Invite people to talk to Maya");
    expect(dialog.textContent).toContain("wait for an admin to approve");
    const copy = [...dialog.querySelectorAll("button")].find(button => button.textContent === "Copy invitation")!;
    flushSync(() => copy.click());
    await settle();
    expect(copied[0]).toContain("connect");
    expect(copied[0]).toContain("Talk to Maya");
    expect(copied[0]).not.toContain("token=");
    expect(mocks.createLinkIntent).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("copies the private identity link with fallback and preserves success feedback", async () => {
    await render("slack", true);
    await click("Create confirmation link");
    await click("Copy link");
    expect(copied).toEqual([
      new URL(
        "/chat-identity/confirm?token=synthetic-private-confirmation-token",
        window.location.origin,
      ).toString(),
    ]);
    expect(writeText).not.toHaveBeenCalled();
    expect(mocks.pushToast).toHaveBeenLastCalledWith({
      title: "Confirmation link copied",
      tone: "success",
    });
  });
});
