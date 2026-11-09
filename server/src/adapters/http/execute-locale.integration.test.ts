import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { execute } from "./execute.js";

describe("HTTP adapter locale delivery", () => {
  let server: Server | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => server!.close((err) => err ? reject(err) : resolve()));
    }
    server = undefined;
  });

  it.each(["pt-BR", "en"] as const)("delivers %s to a real isolated HTTP receiver", async (locale) => {
    const received: Array<{ method?: string; body: unknown }> = [];
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        received.push({ method: request.method, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
        response.writeHead(204).end();
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");
    const origin = `http://127.0.0.1:${address.port}`;
    vi.stubEnv("PAPERCLIP_HTTP_ADAPTER_PRIVATE_ENDPOINT_ALLOWLIST", origin);
    const context = {
      paperclipWake: { reason: "issue_commented", communicationLocale: locale },
      paperclipTaskMarkdownAssignment: "Preserve `curl --fail https://example.invalid` and WAITING_FOR_REVIEW.",
      connectionInstructions: { text: "Keep this technical instruction.", digest: "fixture-digest" },
    };

    const result = await execute({
      runId: `run-${locale}`,
      agent: { id: "agent-1", companyId: "company-1", name: "Agent", adapterType: "http", adapterConfig: {} },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: { url: `${origin}/wake`, payloadTemplate: { marker: "unchanged" } },
      context,
      onLog: async () => {},
    });

    expect(result).toMatchObject({ exitCode: 0, timedOut: false });
    expect(received).toEqual([{
      method: "POST",
      body: {
        marker: "unchanged",
        agentId: "agent-1",
        runId: `run-${locale}`,
        context,
        connectionInstructions: context.connectionInstructions,
      },
    }]);
  });
});
