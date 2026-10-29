// @vitest-environment jsdom

import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCatalogEntry } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { ActionTestDialog, errorHints } from "./ActionTestDialog";

const listTestAgentsMock = vi.hoisted(() => vi.fn());
const listCatalogMock = vi.hoisted(() => vi.fn());
const getTestAgentAccessMock = vi.hoisted(() => vi.fn());
const runTestCallMock = vi.hoisted(() => vi.fn());
const getTestCallStatusMock = vi.hoisted(() => vi.fn());
const declineActionRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/tools", () => ({
  toolsApi: {
    listTestAgents: (connectionId: string) => listTestAgentsMock(connectionId),
    listCatalog: (connectionId: string) => listCatalogMock(connectionId),
    getTestAgentAccess: (connectionId: string, agentId: string) => getTestAgentAccessMock(connectionId, agentId),
    runTestCall: (connectionId: string, input: unknown) => runTestCallMock(connectionId, input),
    getTestCallStatus: (connectionId: string, requestId: string) => getTestCallStatusMock(connectionId, requestId),
    declineActionRequest: (companyId: string, requestId: string) => declineActionRequestMock(companyId, requestId),
  },
}));
vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const entry = {
  id: "asana-list-projects",
  companyId: "company-1",
  applicationId: "app-asana",
  connectionId: "conn-1",
  entryKind: "tool",
  toolName: "list_projects",
  title: "List projects",
  description: "Find Asana projects.",
  inputSchema: { type: "object", properties: {} },
  outputSchema: null,
  annotations: null,
  riskLevel: "read",
  isReadOnly: true,
  isWrite: false,
  isDestructive: false,
  status: "active",
  addedAt: new Date("2026-09-01T00:00:00Z"),
  version: null,
  schemaHash: null,
  firstSeenAt: new Date("2026-09-01T00:00:00Z"),
  lastSeenAt: new Date("2026-10-01T00:00:00Z"),
  reviewedAt: null,
  reviewedByAgentId: null,
  reviewedByUserId: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-10-01T00:00:00Z"),
} as ToolCatalogEntry;

const askFirstEntry = {
  ...entry,
  id: "asana-create-task",
  toolName: "create_task",
  title: "Create task",
  riskLevel: "write",
  isReadOnly: false,
  isWrite: true,
} as ToolCatalogEntry;

const resumeToolEntry = {
  ...entry,
  id: "provider-resume-action",
  toolName: "resume_provider_request",
  title: "Resume provider request",
  inputSchema: {
    type: "object",
    required: ["confirmation_code"],
    properties: { confirmation_code: { type: "string" } },
  },
} as ToolCatalogEntry;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let client: QueryClient;

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> | undefined;
  flushSync(() => { result = callback(); });
  await result;
}

async function flushReact() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }
}

async function renderDialog(testEntry = entry) {
  await act(() => root.render(
    <QueryClientProvider client={client}>
      <ActionTestDialog connectionId="conn-1" appName="Asana" entry={testEntry} open onOpenChange={() => undefined} />
    </QueryClientProvider>,
  ));
  await flushReact();
}

async function openAndRun(testEntry = entry, runLabel = "Run") {
  await renderDialog(testEntry);
  const button = [...document.body.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === runLabel);
  expect(button).toBeTruthy();
  await act(() => button!.click());
  await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 260)); });
  await flushReact();
}

function allowAskFirst() {
  getTestAgentAccessMock.mockResolvedValue({
    access: {
      connectionId: "conn-1", toolCount: 1, allowedCount: 0, askFirstCount: 1, offCount: 0,
      lastChangedAt: null, lastChangedByAgentId: null, lastChangedByName: null,
      tools: [{ toolName: "create_task", gatewayToolName: "asana__create_task", displayName: "Create task", risk: "write", decision: "ask_first", reasonCode: null, matchedPolicyIds: [] }],
    },
  });
  runTestCallMock.mockResolvedValue({ decision: "ask_first", invocationId: "ask-invocation", actionRequestId: "request-1" });
}

function requestStatus(phase: "waiting" | "running" | "done" | "denied" | "cancelled" | "expired") {
  return {
    actionRequestId: "request-1", invocationId: "ask-invocation", phase,
    parameters: {}, requestedAt: "2026-10-01T00:00:00.000Z",
    resolvedAt: phase === "waiting" ? null : "2026-10-01T00:00:05.000Z",
    durationMs: phase === "done" ? 1200 : null,
  };
}

function allowProviderResume(expiresAt: string) {
  getTestAgentAccessMock.mockResolvedValue({
    access: {
      connectionId: "conn-1", toolCount: 2, allowedCount: 2, askFirstCount: 0, offCount: 0,
      lastChangedAt: null, lastChangedByAgentId: null, lastChangedByName: null,
      tools: [
        { toolName: "list_projects", gatewayToolName: "asana__list_projects", displayName: "List projects", risk: "read", decision: "allowed", reasonCode: null, matchedPolicyIds: [] },
        { toolName: resumeToolEntry.toolName, gatewayToolName: "provider__resume_request", displayName: "Resume provider request", risk: "write", decision: "allowed", reasonCode: null, matchedPolicyIds: [] },
      ],
    },
  });
  listCatalogMock.mockResolvedValue({ catalog: [resumeToolEntry] });
  runTestCallMock.mockResolvedValueOnce({
    decision: "allowed",
    invocationId: "provider-original-invocation",
    upstreamPending: {
      kind: "approval",
      links: [{ url: "https://provider.example/authorize?state=keep-this-state", host: "provider.example", elicitationId: "provider-request-88" }],
      executionId: "provider-execution-77",
      elicitationId: "provider-request-88",
      resumeTool: resumeToolEntry.toolName,
      expiresAt,
      message: "Provider message: confirm access to the Urbana workspace.",
      requestedSchema: resumeToolEntry.inputSchema,
    },
  });
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  listTestAgentsMock.mockReset().mockResolvedValue({
    agents: [{ id: "agent-ceo", name: "CEO", role: "ceo", title: "CEO", status: "active", orgDepth: 0 }],
  });
  listCatalogMock.mockReset().mockResolvedValue({ catalog: [] });
  getTestAgentAccessMock.mockReset().mockResolvedValue({
    access: {
      connectionId: "conn-1", toolCount: 1, allowedCount: 1, askFirstCount: 0, offCount: 0,
      lastChangedAt: null, lastChangedByAgentId: null, lastChangedByName: null,
      tools: [{ toolName: "list_projects", gatewayToolName: "asana__list_projects", displayName: "List projects", risk: "read", decision: "allowed", reasonCode: null, matchedPolicyIds: [] }],
    },
  });
  runTestCallMock.mockReset();
  getTestCallStatusMock.mockReset().mockResolvedValue(requestStatus("waiting"));
  declineActionRequestMock.mockReset();
  window.sessionStorage.clear();
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  window.sessionStorage.clear();
});

describe("Permissions action Test dialog", () => {
  it("localizes the action preview and agent picker in Brazilian Portuguese", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });

    await renderDialog();

    expect(document.body.textContent).toContain("Testar List projects");
    expect(document.body.textContent).toContain("Execute uma ação real com as mesmas permissões");
    expect(document.body.textContent).toContain("Agir como");
    expect(document.body.textContent).toContain("Permitida");
    expect(document.body.textContent).toContain("Esta ação não recebe parâmetros.");
    expect(document.body.textContent).toContain("Esta ação fará uma chamada real ao Asana como CEO.");

    const picker = document.body.querySelector<HTMLButtonElement>('button[aria-label="Escolha com qual agente testar"]');
    expect(picker).toBeTruthy();
    await act(() => picker!.click());
    expect(document.body.querySelector<HTMLInputElement>('input[aria-label="Buscar agentes"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Só aparecem agentes para os quais você pode atribuir tarefas.");
    expect(document.body.textContent).toContain("O que os indicadores significam");
    expect(document.body.textContent).toContain("Os indicadores mostram as configurações atuais deste agente, não as suas.");
  });

  it("localizes empty and failed agent loading states", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    listTestAgentsMock.mockResolvedValueOnce({ agents: [] });

    await renderDialog();
    expect(document.body.textContent).toContain("Não há agentes disponíveis para testar como.");

    await act(() => root.render(null));
    client.clear();
    listTestAgentsMock.mockRejectedValueOnce(new Error("private server detail"));
    await renderDialog();
    expect(document.body.textContent).toContain("Não foi possível carregar os agentes disponíveis para teste.");
    expect(document.body.textContent).toContain("Tentar novamente");
    expect(document.body.textContent).not.toContain("private server detail");
  });

  it("localizes a permissions loading failure without exposing its server detail", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    getTestAgentAccessMock.mockRejectedValueOnce(new Error("private server detail"));

    await renderDialog();

    expect(document.body.textContent).toContain("Não foi possível carregar as permissões de CEO.");
    expect(document.body.textContent).toContain("Tentar novamente");
    expect(document.body.textContent).not.toContain("private server detail");
  });

  it("explains a blocked action in Brazilian Portuguese without changing its ID", async () => {
    getTestAgentAccessMock.mockResolvedValue({
      access: {
        connectionId: "conn-1", toolCount: 1, allowedCount: 0, askFirstCount: 0, offCount: 1,
        lastChangedAt: null, lastChangedByAgentId: null, lastChangedByName: null,
        tools: [{ toolName: "list_projects", gatewayToolName: "asana__list_projects", displayName: "List projects", risk: "read", decision: "off", reasonCode: null, matchedPolicyIds: [] }],
      },
    });
    await act(async () => { await i18n.changeLanguage("pt-BR"); });

    await renderDialog();

    expect(document.body.textContent).toContain("List projects está bloqueada para CEO.");
    expect(document.body.textContent).toContain("Ela não será executada aqui nem em uma tarefa.");
    expect(document.body.textContent).toContain("Nenhuma chamada será feita: esta ação está bloqueada para CEO.");
    expect(document.body.textContent).toContain("Ative a ação para CEO em");
    expect(document.body.textContent).toContain("Abrir permissões →");
  });

  it("localizes argument form controls and validation without translating schema names", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    const formEntry = {
      ...entry,
      inputSchema: {
        type: "object",
        required: ["project_url", "mode"],
        properties: {
          project_url: { type: "string" },
          mode: { type: "string", enum: ["compact", "full"] },
          profile: { type: "string", enum: ["basic", "extended"] },
        },
      },
    } as ToolCatalogEntry;

    await renderDialog(formEntry);

    expect(document.body.textContent).toContain("Project Url");
    const runButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Executar");
    expect(runButton).toBeTruthy();
    await act(() => runButton!.click());
    await flushReact();

    expect(document.body.textContent).toContain("Este campo é obrigatório");
    expect(runTestCallMock).not.toHaveBeenCalled();

    const modeSelect = document.body.querySelector<HTMLButtonElement>('button[aria-label="Mode"]');
    expect(modeSelect).toBeTruthy();
    expect(modeSelect!.textContent).toContain("Selecione uma opção");

    const moreOptions = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Mais opções");
    expect(moreOptions).toBeTruthy();
    await act(() => moreOptions!.click());
    const profileSelect = document.body.querySelector<HTMLButtonElement>('button[aria-label="Profile"]');
    expect(profileSelect?.textContent).toContain("Nenhum");
  });

  it("forwards an explicitly cleared optional text field", async () => {
    const textEntry = {
      ...entry,
      inputSchema: { type: "object", properties: { update_text: { type: "string" } } },
    } as ToolCatalogEntry;
    runTestCallMock.mockResolvedValue({ decision: "allowed", invocationId: "empty-text" });

    await renderDialog(textEntry);
    const moreOptions = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "More options");
    expect(moreOptions).toBeTruthy();
    await act(() => moreOptions!.click());
    const input = document.body.querySelector<HTMLInputElement>('input[aria-label="Update Text"]');
    expect(input).toBeTruthy();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(() => {
      setValue!.call(input, "draft");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(() => {
      setValue!.call(input, "");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const runButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Run");
    await act(() => runButton!.click());
    await flushReact();

    expect(runTestCallMock).toHaveBeenCalledWith("conn-1", {
      agentId: "agent-ceo",
      toolName: "list_projects",
      parameters: { update_text: "" },
    });
  });

  it("forwards false, zero, and an explicit object default without normalization", async () => {
    const defaultsEntry = {
      ...entry,
      inputSchema: {
        type: "object",
        properties: {
          enabled: { type: "boolean", default: false },
          count: { type: "integer", default: 0 },
          options: {
            type: "object",
            default: { enabled: false, count: 0 },
            required: ["enabled", "count"],
            properties: {
              enabled: { type: "boolean" },
              count: { type: "integer" },
            },
          },
        },
      },
    } as ToolCatalogEntry;
    runTestCallMock.mockResolvedValue({ decision: "allowed", invocationId: "defaults" });

    await renderDialog(defaultsEntry);
    const runButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Run");
    await act(() => runButton!.click());
    await flushReact();

    expect(runTestCallMock).toHaveBeenCalledWith("conn-1", {
      agentId: "agent-ceo",
      toolName: "list_projects",
      parameters: { enabled: false, count: 0, options: { enabled: false, count: 0 } },
    });
  });

  it("rejects an explicitly supplied empty optional object with required children", async () => {
    const objectEntry = {
      ...entry,
      inputSchema: {
        type: "object",
        properties: {
          options: {
            type: "object",
            default: {},
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
      },
    } as ToolCatalogEntry;

    await renderDialog(objectEntry);
    const runButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Run");
    await act(() => runButton!.click());
    await flushReact();

    expect(document.body.textContent).toContain("This field is required");
    expect(runTestCallMock).not.toHaveBeenCalled();
  });

  it("runs the actual ActionTester with Firecrawl's minimal URL input after opening More options", async () => {
    const firecrawlEntry = {
      ...entry,
      id: "firecrawl-scrape",
      toolName: "firecrawl_scrape",
      title: "Firecrawl scrape",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          profile: { type: "object", required: ["name"], properties: { name: { type: "string" } } },
          queryOptions: {
            type: "object",
            required: ["prompt"],
            properties: {
              mode: { type: "string", enum: ["directQuote", "freeform"], default: "freeform" },
              prompt: { type: "string" },
            },
          },
          screenshotOptions: {
            type: "object",
            properties: {
              viewport: {
                type: "object",
                required: ["width", "height"],
                properties: { width: { type: "number" }, height: { type: "number" } },
              },
            },
          },
        },
      },
    } as ToolCatalogEntry;
    getTestAgentAccessMock.mockResolvedValue({
      access: {
        connectionId: "conn-1", toolCount: 1, allowedCount: 1, askFirstCount: 0, offCount: 0,
        lastChangedAt: null, lastChangedByAgentId: null, lastChangedByName: null,
        tools: [{ toolName: "firecrawl_scrape", gatewayToolName: "firecrawl__firecrawl_scrape", displayName: "Firecrawl scrape", risk: "read", decision: "allowed", reasonCode: null, matchedPolicyIds: [] }],
      },
    });
    runTestCallMock.mockResolvedValue({ decision: "allowed", invocationId: "firecrawl-minimal" });

    await renderDialog(firecrawlEntry);
    const moreOptions = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "More options");
    expect(moreOptions).toBeTruthy();
    await act(() => moreOptions!.click());
    const urlInput = document.body.querySelector<HTMLInputElement>('input[aria-label="Url"]');
    expect(urlInput, document.body.textContent).toBeTruthy();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(() => {
      setValue!.call(urlInput, "https://paperclip.ing");
      urlInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const runButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Run");
    expect(runButton).toBeTruthy();
    await act(() => runButton!.click());
    await flushReact();

    expect(document.body.textContent).not.toContain("This field is required");
    expect(runTestCallMock).toHaveBeenCalledWith("conn-1", {
      agentId: "agent-ceo",
      toolName: "firecrawl_scrape",
      parameters: { url: "https://paperclip.ing" },
    });
  });

  it("renders structured MCP rows and keeps the full response behind the raw disclosure", async () => {
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "structured",
      result: {
        content: '{"data":[{"name":"Q4 launch"},{"name":"Customer onboarding"}]}',
        data: {
          content: [{ type: "text", text: '{"data":[{"name":"Q4 launch"},{"name":"Customer onboarding"}]}' }],
          structuredContent: { data: [{ name: "Q4 launch" }, { name: "Customer onboarding" }] },
          isError: false, transport: "mcp_http",
        },
      },
    });
    await openAndRun();
    expect(runTestCallMock).toHaveBeenCalledWith("conn-1", { agentId: "agent-ceo", toolName: "list_projects", parameters: {} });
    expect(document.body.textContent).toContain("Worked. 2 rows came back.");
    expect(document.body.querySelector("table")?.textContent).toContain("Q4 launch");
    expect(document.body.textContent).not.toContain("structuredContent");
    const raw = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Show raw response");
    await act(() => raw!.click());
    expect(document.body.textContent).toContain("structuredContent");
  });

  it("parses JSON text when structured content is absent", async () => {
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "text",
      result: { content: '{"data":[{"name":"Q4 launch"}]}', data: { content: [{ type: "text", text: '{"data":[{"name":"Q4 launch"}]}' }], structuredContent: null, isError: false } },
    });
    await openAndRun();
    expect(document.body.querySelector("table")?.textContent).toContain("Q4 launch");
  });

  it("uses structured content when an MCP result has no content blocks", async () => {
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "structured-only",
      result: { content: "", data: { structuredContent: { results: [{ name: "Northstar launch plan" }] }, isError: false } },
    });
    await openAndRun();
    expect(document.body.textContent).toContain("Worked. 1 row came back.");
    expect(document.body.querySelector("table")?.textContent).toContain("Northstar launch plan");
    expect(document.body.textContent).not.toContain("structuredContent");
  });

  it("shows wide search results as readable cards with a safe page link", async () => {
    const rows = [{
      id: "11111111-2222-4333-8444-555555555555",
      title: "Northstar launch plan",
      url: "https://www.notion.so/11111111222243338444555555555555",
      type: "page",
      highlight: "The launch plan covers milestones, owners, and a detailed summary that should not stretch a table row in the dialog.",
      timestamp: "2026-09-10T14:30:00.000Z",
    }];
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "notion-wide",
      result: { content: JSON.stringify({ results: rows }), data: { content: [{ type: "text", text: JSON.stringify({ results: rows }) }], structuredContent: null, isError: false } },
    });
    await openAndRun();
    expect(document.body.querySelector("table")).toBeNull();
    expect(document.body.textContent).toContain("Northstar launch plan");
    expect(document.body.textContent).toContain("The launch plan covers milestones");
    expect(document.body.querySelector('a[href="https://www.notion.so/11111111222243338444555555555555"]')?.textContent).toBe("Open link");
  });

  it("shows a non-link URL as a field in a result card", async () => {
    const rows = [{ title: "Northstar launch plan", url: "notion://workspace/launch", description: "A long description that keeps the card layout useful even when the provider supplies a URL that cannot open in a browser." }];
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "non-link-url",
      result: { content: JSON.stringify({ results: rows }), data: { content: [{ type: "text", text: JSON.stringify({ results: rows }) }], isError: false } },
    });
    await openAndRun();
    expect(document.body.querySelector('a[href="notion://workspace/launch"]')).toBeNull();
    expect(document.body.textContent).toContain("notion://workspace/launch");
  });

  it("keeps an ask-first request visible after reopening the dialog", async () => {
    allowAskFirst();
    await openAndRun(askFirstEntry);
    expect(document.body.textContent).toContain("Sent for your OK.");
    expect(document.body.textContent).toContain("Cancel this request");
    expect(document.body.querySelector('a[href="/apps/conn-1/review"]')).toBeTruthy();

    await act(() => root.unmount());
    root = createRoot(container);
    await renderDialog(askFirstEntry);
    expect(runTestCallMock).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Sent for your OK.");
  });

  it("shows an approved request running and then the completed result", async () => {
    allowAskFirst();
    getTestCallStatusMock.mockResolvedValue(requestStatus("running"));
    await openAndRun(askFirstEntry);
    expect(document.body.textContent).toContain("Approved · running");
    expect(document.body.textContent).not.toContain("Cancel this request");

    getTestCallStatusMock.mockResolvedValue({ ...requestStatus("done"), result: [{ name: "Northstar launch plan" }] });
    await act(async () => { await client.invalidateQueries({ queryKey: ["tools"] }); });
    await flushReact();
    expect(document.body.textContent).toContain("Worked.");
    expect(document.body.textContent).toContain("Northstar launch plan");
    expect(runTestCallMock).toHaveBeenCalledTimes(1);
  });

  it("shows a denied request without offering cancellation", async () => {
    allowAskFirst();
    getTestCallStatusMock.mockResolvedValue(requestStatus("denied"));
    await openAndRun(askFirstEntry);
    expect(document.body.textContent).toContain("Denied — see Review for why");
    expect(document.body.textContent).not.toContain("Cancel this request");
  });

  it("localizes an Ask-first request and preserves its Review and cancellation contracts", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    allowAskFirst();
    getTestCallStatusMock.mockResolvedValue(requestStatus("waiting"));
    declineActionRequestMock.mockResolvedValueOnce(undefined);

    await openAndRun(askFirstEntry, "Executar");

    expect(document.body.textContent).toContain("Enviado para aprovação.");
    expect(document.body.textContent).toContain("CEO precisa da sua aprovação antes da execução.");
    expect(document.body.textContent).toContain("AçãoCreate task");
    expect(document.body.textContent).toContain("Conclua abaixo a solicitação existente.");
    expect(document.body.querySelector('a[href="/apps/conn-1/review"]')).toBeTruthy();
    const cancelButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Cancelar esta solicitação");
    expect(cancelButton).toBeTruthy();
    await act(() => cancelButton!.click());
    await flushReact();

    expect(declineActionRequestMock).toHaveBeenCalledWith("company-1", "request-1");
    expect(document.body.textContent).toContain("Cancelada");
    expect(runTestCallMock).toHaveBeenCalledTimes(1);
  });

  it("localizes an expired Ask-first request and removes its cancellation action", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    allowAskFirst();
    getTestCallStatusMock.mockResolvedValue(requestStatus("expired"));

    await openAndRun(askFirstEntry, "Executar");

    expect(document.body.textContent).toContain("Expirada — envie novamente");
    expect(document.body.textContent).not.toContain("Cancelar esta solicitação");
  });

  it("localizes provider authorization hand-off while preserving its URL, host, message, and IDs", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    const authorizationUrl = "https://provider.example/authorize?state=keep-this-state";
    runTestCallMock.mockResolvedValueOnce({
      decision: "allowed", invocationId: "provider-authorization",
      upstreamPending: {
        kind: "authorization",
        links: [{ url: authorizationUrl, host: "provider.example", elicitationId: "provider-request-88" }],
        executionId: "provider-execution-77",
        elicitationId: "provider-request-88",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        message: "Provider message: confirm access to the Urbana workspace.",
      },
    });

    await openAndRun(entry, "Executar");

    expect(document.body.textContent).toContain("Autorização necessária para Asana");
    expect(document.body.textContent).toContain("O Paperclip permitiu esta chamada.");
    expect(document.body.textContent).toContain("Provider message: confirm access to the Urbana workspace.");
    expect(document.body.textContent).toContain("Execução: provider-execution-77");
    expect(document.body.textContent).toContain("Solicitação: provider-request-88");
    expect(document.body.textContent).toContain("A aprovação expira às");
    expect(document.body.textContent).toContain("Após autorizar, confira o resultado do provedor");
    const continueLink = document.body.querySelector<HTMLAnchorElement>(`a[href="${authorizationUrl}"]`);
    expect(continueLink?.textContent).toBe("Continuar em provider.example");
  });

  it("resumes a provider approval in PT-BR with the same execution and action payload", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    allowProviderResume(new Date(Date.now() + 60_000).toISOString());
    runTestCallMock.mockResolvedValueOnce({
      decision: "allowed", invocationId: "provider-resumed",
      result: { content: "Provider accepted the request.", data: { content: [{ type: "text", text: "Provider accepted the request." }], isError: false } },
    });

    await openAndRun(entry, "Executar");

    expect(document.body.textContent).toContain("Revise a solicitação do provedor e retome esta execução como CEO.");
    expect(document.body.textContent).toContain("Permissão para retomarPermitida");
    expect(document.body.textContent).toContain("Continuar em provider.example");
    const confirmation = document.body.querySelector<HTMLInputElement>('input[aria-label="Confirmation Code"]');
    expect(confirmation).toBeTruthy();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(() => {
      setValue!.call(confirmation, "confirm-provider-request");
      confirmation!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const approveButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Aprovar e retomar");
    expect(approveButton).toBeTruthy();
    await act(() => approveButton!.click());
    await flushReact();

    expect(runTestCallMock).toHaveBeenNthCalledWith(1, "conn-1", { agentId: "agent-ceo", toolName: "list_projects", parameters: {} });
    expect(runTestCallMock).toHaveBeenNthCalledWith(2, "conn-1", {
      agentId: "agent-ceo",
      toolName: "resume_provider_request",
      parameters: { executionId: "provider-execution-77", action: "accept", content: JSON.stringify({ confirmation_code: "confirm-provider-request" }) },
    });
    expect(document.body.textContent).toContain("Provider accepted the request.");
    expect(runTestCallMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["decline", "Recusar", "Solicitação recusada", "Provider request was declined by the user"],
    ["cancel", "Cancelar solicitação", "Solicitação cancelada", "Provider request was cancelled by the user"],
  ] as const)("localizes provider %s and keeps the original call stopped", async (action, buttonLabel, heading, providerMessage) => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    allowProviderResume(new Date(Date.now() + 60_000).toISOString());
    runTestCallMock.mockResolvedValueOnce({
      decision: "allowed", invocationId: `provider-${action}`,
      error: { message: providerMessage, reasonCode: "tool_error" },
    });

    await openAndRun(entry, "Executar");

    const actionButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === buttonLabel);
    expect(actionButton).toBeTruthy();
    await act(() => actionButton!.click());
    await flushReact();

    expect(document.body.textContent).toContain(heading);
    expect(document.body.textContent).toContain(providerMessage);
    expect(document.body.textContent).toContain("A chamada original não foi repetida.");
    expect(document.body.textContent).toContain("Execução: provider-execution-77");
    expect(runTestCallMock).toHaveBeenNthCalledWith(2, "conn-1", {
      agentId: "agent-ceo",
      toolName: "resume_provider_request",
      parameters: { executionId: "provider-execution-77", action },
    });
    expect(runTestCallMock).toHaveBeenCalledTimes(2);
  });

  it("localizes expired provider approvals and blocks resuming them", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    allowProviderResume(new Date(Date.now() - 60_000).toISOString());

    await openAndRun(entry, "Executar");

    expect(document.body.textContent).toContain("Esta aprovação do provedor expirou.");
    expect(document.body.textContent).toContain("Confira o provedor antes de iniciar uma nova ação.");
    const approveButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Aprovar e retomar");
    expect(approveButton?.hasAttribute("disabled")).toBe(true);
    expect(runTestCallMock).toHaveBeenCalledTimes(1);
  });

  it("shows a tool error and opens its raw response", async () => {
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "error",
      result: { content: "PERMISSION_DENIED: Asana denied access to this workspace.", data: { content: [{ type: "text", text: "PERMISSION_DENIED: Asana denied access to this workspace." }], isError: true }, error: "MCP tool returned an error result" },
    });
    await openAndRun();
    expect(document.body.textContent).toContain("It didn't work.");
    expect(document.body.textContent).toContain("PERMISSION_DENIED: Asana denied access to this workspace.");
    expect(document.body.textContent).toContain("Hide raw response");
  });

  it("opens the raw response when an MCP block has an unexpected shape", async () => {
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "malformed",
      result: { content: "", data: { content: [{ type: "text", payload: "missing text" }], structuredContent: null, isError: false } },
    });
    await openAndRun();
    expect(document.body.textContent).toContain("Hide raw response");
    expect(document.body.textContent).toContain("missing text");
  });

  it("localizes a successful run preview while preserving provider result data", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "localized-success",
      result: {
        content: '{"data":[{"name":"Q4 launch"},{"name":"Customer onboarding"}]}',
        data: {
          content: [{ type: "text", text: '{"data":[{"name":"Q4 launch"},{"name":"Customer onboarding"}]}' }],
          structuredContent: { data: [{ name: "Q4 launch" }, { name: "Customer onboarding" }] },
          isError: false, transport: "mcp_http",
        },
      },
    });

    await openAndRun(entry, "Executar");

    expect(document.body.textContent).toContain("Concluído. 2 resultados retornados.");
    expect(document.body.textContent).toContain("Prévia");
    expect(document.body.querySelector("table")?.textContent).toContain("Q4 launch");
    expect(document.body.textContent).not.toContain("structuredContent");
    const raw = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Mostrar resposta bruta");
    expect(raw).toBeTruthy();
    await act(() => raw!.click());
    expect(document.body.textContent).toContain("structuredContent");
    expect(document.body.textContent).toContain("registro de auditoria");
  });

  it("localizes a tool failure and next steps while preserving provider text and codes", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    runTestCallMock.mockResolvedValue({
      decision: "allowed", invocationId: "localized-error",
      result: { content: "PERMISSION_DENIED: Asana denied access to this workspace.", data: { content: [{ type: "text", text: "PERMISSION_DENIED: Asana denied access to this workspace." }], isError: true }, error: "MCP tool returned an error result" },
    });

    await openAndRun(entry, "Executar");

    expect(document.body.textContent).toContain("A execução falhou.");
    expect(document.body.textContent).toContain("Resposta do Asana");
    expect(document.body.textContent).toContain("PERMISSION_DENIED: Asana denied access to this workspace.");
    expect(document.body.textContent).toContain("código: tool_error");
    expect(document.body.textContent).toContain("O que tentar");
    expect(document.body.textContent).toContain("A conta conectada talvez não tenha permissão para esta ação.");
    expect(document.body.textContent).toContain("Ocultar resposta bruta");
  });

  it("localizes an execution request failure and preserves its technical detail", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    runTestCallMock.mockRejectedValueOnce(new Error("socket closed by gateway"));

    await openAndRun(entry, "Executar");

    expect(document.body.textContent).toContain("Não foi possível alcançar CEO.");
    expect(document.body.textContent).toContain("socket closed by gateway");
  });

  it("localizes the running card and cancellation control in Brazilian Portuguese", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    let resolveRun: ((value: unknown) => void) | undefined;
    runTestCallMock.mockReturnValue(new Promise((resolve) => { resolveRun = resolve; }));

    await renderDialog();
    const runButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Executar");
    expect(runButton).toBeTruthy();
    await act(() => runButton!.click());
    await flushReact();

    expect(document.body.textContent).toContain("Executando…");
    expect(document.body.textContent).toContain("Lendo de Asana como CEO.");
    expect(document.body.textContent).toContain("Cancele para interromper");
    const cancelButton = [...document.body.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Cancelar");
    expect(cancelButton).toBeTruthy();
    await act(() => cancelButton!.click());
    expect(document.body.textContent).not.toContain("Executando…");

    await act(() => resolveRun?.({ decision: "allowed", invocationId: "cancelled" }));
    await flushReact();
    expect(document.body.textContent).not.toContain("Concluído.");
  });

  it("keeps useful and generic error hints", () => {
    expect(errorHints("Not found", "NOT_FOUND").join(" ")).toMatch(/check|verify|ID/i);
    expect(errorHints("Unexpected provider failure", null).length).toBeGreaterThan(0);
  });
});
