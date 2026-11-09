import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerConnectionIntentCommands } from "../commands/client/connections.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const SEARCH_RESULT = [{ service: "mail", name: "Café Mail", connectionId: "KeepCase" }];
const REQUEST_RESULT = { requested: true, status: "pending", connectionId: "KeepCase" };
const RUNTIME_ENV = {
  PAPERCLIP_RUNTIME_TOOLS_CONNECTIONS_SEARCH_URL: "http://runtime.test/search",
  PAPERCLIP_RUNTIME_TOOLS_CONNECTION_REQUEST_URL: "http://runtime.test/request",
  PAPERCLIP_RUNTIME_TOOLS_TOKEN: "runtime-token",
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerConnectionIntentCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("connections command localization", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as never);
  });

  afterEach(() => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function runCommand(args: readonly string[], locale: SupportedLocale): Promise<void> {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  async function rejectedMessage(args: readonly string[], locale: SupportedLocale): Promise<string> {
    try {
      await runCommand(args, locale);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    throw new Error("Expected the connections command to fail");
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Pesquisar ou solicitar conexões durante uma execução ativa de heartbeat",
      search: "Pesquisar conexões disponíveis por serviço ou capacidade",
      query: "Nome do serviço ou capacidade",
      retry: "Reavaliar uma escolha de provedor somente a pedido explícito do usuário",
      request: "Solicitar conexão com um serviço",
      service: "Slug do serviço que pode ser conectado",
      target: "Aplicativo solicitado quando o usuário mencionar explicitamente um provedor externo",
      interaction: "ID da pergunta sobre o provedor externo que já foi respondida",
      json: "Exibir JSON formatado",
      guidance: "Ferramentas de conexão:",
    },
    {
      locale: "en",
      group: "Search or request connections from an active heartbeat run",
      search: "Search available connections for a service or capability",
      query: "Service name or capability",
      retry: "Reconsider a provider choice only at the user’s explicit request",
      request: "Request a connection to a service",
      service: "Connectable service slug",
      target: "Requested app when the user explicitly names an external provider",
      interaction: "Answered external-provider question ID",
      json: "Print formatted JSON",
      guidance: "Connection tools:",
    },
  ] as const)("localizes $locale help while preserving command names, arguments, and flags", ({ locale, group, search, query, retry, request, service, target, interaction, json, guidance }) => {
    const program = makeProgram(locale);
    const connections = program.commands.find((command) => command.name() === "connections");
    const searchCommand = connections?.commands.find((command) => command.name() === "search");
    const requestCommand = connections?.commands.find((command) => command.name() === "request");

    expect(connections?.description()).toBe(group);
    expect(searchCommand?.description()).toBe(search);
    expect(requestCommand?.description()).toBe(request);

    const searchHelp = searchCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(searchHelp).toContain("paperclipai connections search [options] [query]");
    expect(searchHelp).toContain(query);
    expect(searchHelp).toContain("--retry-provider-choice");
    expect(searchHelp).toContain(retry);
    expect(searchHelp).toContain("--json");
    expect(searchHelp).toContain(json);

    const requestHelp = requestCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(requestHelp).toContain("paperclipai connections request [options] <service>");
    expect(requestHelp).toContain(service);
    expect(requestHelp).toContain("--target-service <slug>");
    expect(requestHelp).toContain(target);
    expect(requestHelp).toContain("--selection-interaction-id <id>");
    expect(requestHelp).toContain(interaction);
    expect(requestHelp).toContain(json);

    const groupOutput: string[] = [];
    connections?.configureOutput({
      writeOut: (output) => groupOutput.push(output),
      writeErr: () => undefined,
    });
    connections?.outputHelp();
    const groupHelp = groupOutput.join("");
    expect(groupHelp).toContain(guidance);
    expect(groupHelp).toContain("`connections_search`");
    expect(groupHelp).toContain("`connection_request`");
    expect(groupHelp).toContain("connectionId");
    expect(groupHelp).toContain("toolNames");
  });

  it("preserves search/request payloads, API data, and JSON bytes in both locales", async () => {
    const operations = [
      {
        args: ["connections", "search", "mail", "--retry-provider-choice", "--json"],
        endpoint: RUNTIME_ENV.PAPERCLIP_RUNTIME_TOOLS_CONNECTIONS_SEARCH_URL,
        body: { query: "mail", retryProviderChoice: true },
        result: SEARCH_RESULT,
      },
      {
        args: [
          "connections", "request", "mail",
          "--target-service", "external-mail",
          "--selection-interaction-id", "11111111-1111-4111-8111-111111111111",
          "--json",
        ],
        endpoint: RUNTIME_ENV.PAPERCLIP_RUNTIME_TOOLS_CONNECTION_REQUEST_URL,
        body: {
          service: "mail",
          targetService: "external-mail",
          selectionInteractionId: "11111111-1111-4111-8111-111111111111",
        },
        result: REQUEST_RESULT,
      },
    ];
    const outputs: string[] = [];

    for (const operation of operations) {
      for (const locale of ["pt-BR", "en"] as const) {
        Object.assign(process.env, RUNTIME_ENV);
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.result));
        await runCommand(operation.args, locale);

        outputs.push(String(stdoutSpy.mock.calls.at(-1)?.[0]));
        expect(JSON.parse(String(stdoutSpy.mock.calls.at(-1)?.[0]))).toEqual(operation.result);
        stdoutSpy.mockClear();
      }
    }

    for (let index = 0; index < outputs.length; index += 2) {
      expect(outputs[index + 1]).toBe(outputs[index]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit).method,
      (init as RequestInit).headers,
      JSON.parse(String((init as RequestInit).body)),
    ])).toEqual(operations.flatMap((operation) => ["pt-BR", "en"].map(() => [
      operation.endpoint,
      "POST",
      expect.objectContaining({
        Authorization: "Bearer runtime-token",
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      operation.body,
    ])));
  });

  it("localizes only its own runtime-environment and fallback status errors", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      const expected = locale === "en"
        ? "This command requires the runtime connection environment from an active heartbeat run"
        : "Este comando exige o ambiente de conexões do runtime em uma execução ativa de heartbeat";
      await expect(runCommand(["connections", "search"], locale)).rejects.toThrow(expected);
    }

    const missingEnvironmentJsonErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      missingEnvironmentJsonErrors.push(await rejectedMessage(["connections", "search", "--json"], locale));
    }
    expect(missingEnvironmentJsonErrors).toEqual([
      "This command requires the runtime connection environment from an active heartbeat run",
      "This command requires the runtime connection environment from an active heartbeat run",
    ]);

    Object.assign(process.env, RUNTIME_ENV);
    for (const [locale, expected] of [
      ["pt-BR", "A solicitação de conexão do runtime falhou com status 503"],
      ["en", "Runtime connection request failed with 503"],
    ] as const) {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
      await expect(runCommand(["connections", "request", "mail"], locale)).rejects.toThrow(expected);
    }

    const fallbackJsonErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
      fallbackJsonErrors.push(await rejectedMessage(["connections", "request", "mail", "--json"], locale));
    }
    expect(fallbackJsonErrors).toEqual([
      "Runtime connection request failed with 503",
      "Runtime connection request failed with 503",
    ]);
  });

  it("keeps runtime-provided error messages unchanged in both locales and output modes", async () => {
    Object.assign(process.env, RUNTIME_ENV);
    const externalError = {
      error: "Provider permission denied/KeepCase",
      code: "CONNECTION_DENIED",
      details: { service: "mail", customCode: "PreserveCase" },
    };

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(externalError, 403));
        await expect(runCommand(json
          ? ["connections", "request", "mail", "--json"]
          : ["connections", "request", "mail"], locale))
          .rejects.toThrow("Provider permission denied/KeepCase");
      }
    }
  });
});
