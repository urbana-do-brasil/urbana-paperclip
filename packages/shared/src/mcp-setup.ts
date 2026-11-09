import { DEFAULT_USER_LOCALE, type SupportedLocale } from "./localization.js";
import { PUBLIC_MCP_SCOPES } from "./public-mcp.js";

export type AssistantClient = "codex" | "claude" | "opencode" | "browser" | "headless" | "other";
export const assistantClientNames: Record<AssistantClient, string> = {
  codex: "Codex", claude: "Claude Code", opencode: "OpenCode", browser: "ChatGPT / Claude web", headless: "Headless", other: "Other",
};

type SetupPageCopy = {
  title: string;
  introduction: string;
  accessNotice: string;
  markdownLink: string;
  mcpServer: string;
  requestedOrganization: string;
  finalGuidance: string;
  afterApprovalTitle: string;
  afterApproval: string;
  invitation: string;
  authorizationHandoff: string;
  steps: Record<AssistantClient, readonly string[]>;
};

const setupPageCopy: Record<SupportedLocale, SetupPageCopy> = {
  en: {
    title: "Connect your assistant to Paperclip",
    introduction: "Follow the setup instructions for your assistant, then approve its access in Paperclip.",
    accessNotice: "This link gives instructions, not access. Your assistant connects as you, not as a Paperclip agent.",
    markdownLink: "Instructions for assistants (Markdown)",
    mcpServer: "MCP server",
    requestedOrganization: "Requested organization ID: {{id}} (a hint, not authority).",
    finalGuidance: "Keep existing client configuration. If a Paperclip entry points to a different instance, use a distinct server name. Verify the connected person and organization before doing work.",
    afterApprovalTitle: "After approval",
    afterApproval: "Call paperclip_connection, verify the human and organization, then summarize agents and open tasks. If the approved organization differs from the requested one, stop and reconnect. Do not create tasks or comments merely to test a connection. Creating tasks or comments can start paid agent work; do that only when requested. Access is governed by the consenting human's permissions, not a selected agent's identity.",
    invitation: "Connect to my {{company}}Paperclip organization using the instructions at {{url}}. Start authorization, give me the approval link, and verify the connection after I approve.",
    authorizationHandoff: "Authorization commands wait for human approval. When using an assistant shell tool, keep the command running in a persistent terminal or background process, capture its output privately, and share the approval URL immediately while it is still running. Client callback deadlines still apply. If the command timed out or stopped, start a fresh authorization request before sharing a link. If the host cannot keep the command alive across turns, ask the user to run it in their own terminal.",
    steps: {
      codex: [
        "Check for an existing Paperclip server first. Reuse it only if its URL matches this instance. Add the remote server with the Codex CLI.",
        "Start browser authorization and give the user the approval link.",
        "If the current conversation does not reload its MCP tools, start a new conversation or restart the client. Verify the connection with paperclip_connection before claiming success.",
      ],
      claude: [
        "Check existing servers and reuse a matching instance. Add the remote server using Claude Code.",
        "In Claude Code, run /mcp, select paperclip, and choose Authenticate. Versions that offer `claude mcp login --help` can also start authorization with `claude mcp login paperclip`. Give the user the approval link.",
        "Reconnect through /mcp, or start a new session if needed. Verify the account and organization with paperclip_connection.",
      ],
      opencode: [
        "Check `opencode --version` and existing configuration. For OpenCode 1.x, merge this entry into opencode.json without replacing other settings. OpenCode 2.x uses mcp.servers; use that version's documented format instead.",
        "Run from the same project directory. OpenCode opens Paperclip's sign-in and consent page; give the user the approval link.",
        "If OpenCode was already running, restart it to load the connection. For the browser app, use this command. Verify the tools with paperclip_connection.",
      ],
      browser: [
        "Open your assistant's Apps / Connectors settings and add a custom remote MCP connection using this URL. Availability depends on the account and workspace policy. Reading this page in chat does not install a connector.",
        "Choose OAuth / browser sign-in. Approve the connection in Paperclip, then select the connector in your conversation. If custom connectors are unavailable, use a supported local client. Verify the connected account and organization before doing work.",
      ],
      headless: [
        "Use a Paperclip CLI version with `mcp login --device` support. This needs no callback listener; it prints a verification URL and user code, then waits for human approval.",
        "After approval, configure a local stdio MCP server running the command below. Credentials stay in the CLI's private credential store. Do not copy tokens or device codes into chat or project configuration.",
        "The user code is for the human to verify the request. The private device code remains inside the CLI. After connecting, call paperclip_connection to verify the account and organization.",
      ],
      other: [
        "Add a remote HTTP MCP server at this URL, then choose OAuth / browser sign-in.",
        "If the client cannot install MCP servers from chat, use its connection settings. If it cannot receive a browser callback, use the Headless instructions. After approval, verify the account and organization with paperclip_connection.",
      ],
    },
  },
  "pt-BR": {
    title: "Conecte seu assistente ao Paperclip",
    introduction: "Siga as instruções de configuração do seu assistente e, em seguida, aprove o acesso dele no Paperclip.",
    accessNotice: "Este link contém instruções, não concede acesso. Seu assistente se conecta como você, não como um agente do Paperclip.",
    markdownLink: "Instruções para assistentes (Markdown)",
    mcpServer: "Servidor MCP",
    requestedOrganization: "ID da organização solicitada: {{id}} (uma indicação, não uma autorização).",
    finalGuidance: "Mantenha a configuração atual do cliente. Se uma entrada do Paperclip apontar para outra instância, use um nome de servidor diferente. Antes de trabalhar, confirme a pessoa conectada e a organização.",
    afterApprovalTitle: "Após a aprovação",
    afterApproval: "Chame paperclip_connection, confirme a pessoa e a organização e, então, resuma os agentes e as tarefas abertas. Se a organização aprovada for diferente da solicitada, pare e conecte novamente. Não crie tarefas nem comentários apenas para testar a conexão. Criar tarefas ou comentários pode iniciar trabalho pago de agentes; faça isso somente quando for solicitado. O acesso segue as permissões da pessoa que consentiu, não a identidade de um agente selecionado.",
    invitation: "Conecte-se à minha organização {{company}}do Paperclip usando as instruções em {{url}}. Inicie a autorização, envie-me o link de aprovação e verifique a conexão depois que eu aprovar.",
    authorizationHandoff: "Os comandos de autorização aguardam aprovação humana. Ao usar uma ferramenta de terminal do assistente, mantenha o comando em execução em um terminal persistente ou processo em segundo plano, capture a saída de forma privada e compartilhe o link de aprovação assim que ele aparecer, enquanto o comando ainda estiver em execução. Os prazos de retorno do cliente continuam valendo. Se o comando expirar ou parar, inicie uma nova solicitação de autorização antes de compartilhar um link. Se o host não conseguir manter o comando ativo entre turnos, peça à pessoa usuária que o execute no próprio terminal.",
    steps: {
      codex: [
        "Verifique primeiro se já existe um servidor Paperclip. Reutilize-o somente se a URL corresponder a esta instância. Adicione o servidor remoto pela CLI do Codex.",
        "Inicie a autorização pelo navegador e envie à pessoa usuária o link de aprovação.",
        "Se a conversa atual não carregar novamente as ferramentas MCP, inicie uma nova conversa ou reinicie o cliente. Verifique a conexão com paperclip_connection antes de confirmar que deu certo.",
      ],
      claude: [
        "Confira os servidores existentes e reutilize uma instância correspondente. Adicione o servidor remoto pelo Claude Code.",
        "No Claude Code, execute /mcp, selecione paperclip e escolha Authenticate. Versões que oferecem `claude mcp login --help` também podem iniciar a autorização com `claude mcp login paperclip`. Envie à pessoa usuária o link de aprovação.",
        "Reconecte por /mcp ou, se necessário, inicie uma nova sessão. Verifique a conta e a organização com paperclip_connection.",
      ],
      opencode: [
        "Verifique `opencode --version` e a configuração existente. No OpenCode 1.x, mescle esta entrada em opencode.json sem substituir outras configurações. O OpenCode 2.x usa mcp.servers; siga o formato documentado para essa versão.",
        "Execute no mesmo diretório do projeto. O OpenCode abre a página de login e consentimento do Paperclip; envie à pessoa usuária o link de aprovação.",
        "Se o OpenCode já estava em execução, reinicie-o para carregar a conexão. Para o app de navegador, use este comando. Verifique as ferramentas com paperclip_connection.",
      ],
      browser: [
        "Abra as configurações de Apps / Conectores do seu assistente e adicione uma conexão MCP remota personalizada usando esta URL. A disponibilidade depende da política da conta e do workspace. Ler esta página no chat não instala um conector.",
        "Escolha OAuth / login pelo navegador. Aprove a conexão no Paperclip e selecione o conector na conversa. Se conectores personalizados não estiverem disponíveis, use um cliente local compatível. Antes de trabalhar, confirme a conta e a organização conectadas.",
      ],
      headless: [
        "Use uma versão da CLI do Paperclip com suporte a `mcp login --device`. Não é necessário um listener de callback; a CLI imprime uma URL de verificação e um código de usuário e, em seguida, aguarda a aprovação humana.",
        "Após a aprovação, configure um servidor MCP local via stdio usando o comando abaixo. As credenciais ficam no armazenamento privado da CLI. Não copie tokens ou códigos de dispositivo para o chat nem para a configuração do projeto.",
        "O código de usuário serve para que a pessoa confira a solicitação. O código de dispositivo privado permanece dentro da CLI. Depois de conectar, chame paperclip_connection para verificar a conta e a organização.",
      ],
      other: [
        "Adicione um servidor MCP remoto por HTTP nesta URL e escolha OAuth / login pelo navegador.",
        "Se o cliente não puder instalar servidores MCP pelo chat, use as configurações de conexão. Se não receber o retorno do navegador, use as instruções para Headless. Após a aprovação, verifique a conta e a organização com paperclip_connection.",
      ],
    },
  },
};

export function mcpSetupPageMessages(locale: SupportedLocale): SetupPageCopy {
  return setupPageCopy[locale];
}

export function mcpSetupUrl(serverUrl: string, companyId?: string, locale?: SupportedLocale) {
  const url = new URL("/mcp/setup", serverUrl);
  if (companyId) url.searchParams.set("company", companyId);
  if (locale) url.searchParams.set("locale", locale);
  return url.toString();
}

export function mcpInvitation(
  serverUrl: string,
  company?: { id: string; name: string },
  locale: SupportedLocale = DEFAULT_USER_LOCALE,
) {
  const messages = setupPageCopy[locale];
  const companyName = company?.name ? `${company.name} ` : "";
  return messages.invitation
    .replace("{{company}}", companyName)
    .replace("{{url}}", mcpSetupUrl(serverUrl, company?.id, locale));
}

export function mcpSetupSteps(
  serverUrl: string,
  assistant: AssistantClient,
  locale: SupportedLocale = DEFAULT_USER_LOCALE,
) {
  const quoted = `'${serverUrl.replaceAll("'", "'\"'\"'")}'`;
  const scopes = PUBLIC_MCP_SCOPES.join(" ");
  const text = setupPageCopy[locale].steps[assistant];
  switch (assistant) {
    case "codex": return [
      { text: text[0]!, code: `codex mcp add paperclip --url ${quoted}` },
      { text: text[1]!, code: "codex mcp login paperclip --scopes paperclip:read,paperclip:write,paperclip:configure,offline_access" },
      { text: text[2]! },
    ];
    case "claude": return [
      { text: text[0]!, code: `claude mcp add --transport http paperclip ${quoted}` },
      { text: text[1]! },
      { text: text[2]! },
    ];
    case "opencode": return [
      { text: text[0]!, code: JSON.stringify({ mcp: { paperclip: { type: "remote", url: serverUrl, enabled: true, oauth: { scope: scopes } } } }, null, 2) },
      { text: text[1]!, code: "opencode mcp auth paperclip" },
      { text: text[2]!, code: "opencode web" },
    ];
    case "browser": return [
      { text: text[0]!, code: serverUrl },
      { text: text[1]! },
    ];
    case "headless": return [
      { text: text[0]!, code: `paperclipai mcp login --device --url ${quoted}` },
      { text: text[1]!, code: `paperclipai mcp proxy --url ${quoted}` },
      { text: text[2]! },
    ];
    default: return [
      { text: text[0]!, code: serverUrl },
      { text: text[1]! },
    ];
  }
}

export const mcpAuthorizationHandoffInstructions = setupPageCopy.en.authorizationHandoff;
export function mcpAuthorizationHandoffInstructionsFor(locale: SupportedLocale) {
  return setupPageCopy[locale].authorizationHandoff;
}

export function mcpSetupMarkdown(
  serverUrl: string,
  companyId?: string,
  locale: SupportedLocale = DEFAULT_USER_LOCALE,
) {
  const messages = setupPageCopy[locale];
  return [
    `# ${messages.title}`, "",
    locale === "en"
      ? "These are setup instructions, not an access credential. Ask the human to approve the identified client in Paperclip. Never approve on their behalf or reuse browser cookies as MCP credentials."
      : "Estas são instruções de configuração, não uma credencial de acesso. Peça à pessoa para aprovar no Paperclip o cliente identificado. Nunca aprove em nome dela nem reutilize cookies do navegador como credenciais MCP.", "",
    `${messages.mcpServer}: ${serverUrl}`,
    ...(companyId ? [messages.requestedOrganization.replace("{{id}}", companyId)] : []), "",
    messages.finalGuidance, "",
    mcpAuthorizationHandoffInstructionsFor(locale), "",
    ...Object.entries(assistantClientNames).flatMap(([client, name]) => [
      `## ${name}`, "",
      ...mcpSetupSteps(serverUrl, client as AssistantClient, locale).flatMap((step) => [
        step.text,
        ...(step.code ? ["", "```", step.code, "```"] : []),
        "",
      ]),
    ]),
    `## ${messages.afterApprovalTitle}`, "", messages.afterApproval, "",
  ].join("\n");
}
