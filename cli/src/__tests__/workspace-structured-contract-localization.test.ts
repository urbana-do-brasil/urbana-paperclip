import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerWorkspaceCommands } from "../commands/client/workspace.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const API_BASE = "http://paperclip.test";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_ID = "workspace/KeepCase";
const ENVIRONMENT_ID = "environment/KeepCase";
const PROJECT_ID = "project/KeepCase";
const PROJECT_WORKSPACE_ID = "project-workspace/KeepCase";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const LOCALES = ["pt-BR", "en"] as const satisfies readonly SupportedLocale[];

interface OperationFixture {
  name: string;
  args: string[];
  method: string;
  url: string;
  response: unknown;
  body?: unknown;
}

interface ErrorFixture {
  args: string[];
  method: string;
  url: string;
  status: number;
  error: string;
  details: Record<string, unknown>;
  body?: unknown;
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerWorkspaceCommands(program);
  setCliCommandLineShape(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function cliArgs(...args: string[]): string[] {
  return [...args, "--api-base", API_BASE, "--api-key", "fixture-token", "--json"];
}

function operationFixtures(): OperationFixture[] {
  const workspaceUpdate = { status: "ready", metadata: { note: "KeepCase / livre" } };
  const runtimeService = { serviceName: "database", restartReason: "requested by operator" };
  const runtimeCommand = { argv: ["echo", "Olá"], cwd: "/workspace/KeepCase" };
  const environmentCreate = { name: "local fixture", variables: { APP_NAME: "Paperclip" } };
  const environmentUpdate = { name: "Updated environment", metadata: { note: "Preserve / Case" } };
  const probeConfig = { target: { region: "local" }, options: { safeMode: true } };
  const projectWorkspaceCreate = { name: "Implementation KeepCase", executionWorkspacePolicy: { defaultMode: "isolated_workspace" } };
  const projectWorkspaceUpdate = { name: "Updated project workspace", metadata: { note: "User supplied" } };
  const projectRuntimeService = { service: "worker", actionReason: "manual" };

  return [
    {
      name: "agent-config list",
      args: cliArgs("agent-config", "list", "--company-id", COMPANY_ID),
      method: "GET",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/agent-configurations`,
      response: [{ agentId: "agent/KeepCase", revision: 4, variables: { MODE: "fixture" } }],
    },
    {
      name: "workspace list",
      args: cliArgs("workspace", "list", "--company-id", COMPANY_ID),
      method: "GET",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/execution-workspaces`,
      response: [{ id: WORKSPACE_ID, name: "Build lane", status: "ready" }],
    },
    {
      name: "workspace get",
      args: cliArgs("workspace", "get", WORKSPACE_ID),
      method: "GET",
      url: `${API_BASE}/api/execution-workspaces/workspace%2FKeepCase`,
      response: { id: WORKSPACE_ID, name: "Build lane", status: "ready" },
    },
    {
      name: "workspace close-readiness",
      args: cliArgs("workspace", "close-readiness", WORKSPACE_ID),
      method: "GET",
      url: `${API_BASE}/api/execution-workspaces/workspace%2FKeepCase/close-readiness`,
      response: { ready: false, blockers: ["active session"] },
    },
    {
      name: "workspace operations",
      args: cliArgs("workspace", "operations", WORKSPACE_ID),
      method: "GET",
      url: `${API_BASE}/api/execution-workspaces/workspace%2FKeepCase/workspace-operations`,
      response: [{ id: "operation-1", command: "pnpm test --filter KeepCase" }],
    },
    {
      name: "workspace update",
      args: cliArgs("workspace", "update", WORKSPACE_ID, "--payload-json", JSON.stringify(workspaceUpdate)),
      method: "PATCH",
      url: `${API_BASE}/api/execution-workspaces/workspace%2FKeepCase`,
      body: workspaceUpdate,
      response: { id: WORKSPACE_ID, ...workspaceUpdate },
    },
    {
      name: "workspace runtime-service",
      args: cliArgs("workspace", "runtime-service", WORKSPACE_ID, "restart", "--payload-json", JSON.stringify(runtimeService)),
      method: "POST",
      url: `${API_BASE}/api/execution-workspaces/workspace%2FKeepCase/runtime-services/restart`,
      body: runtimeService,
      response: { accepted: true, serviceName: runtimeService.serviceName },
    },
    {
      name: "workspace runtime-command",
      args: cliArgs("workspace", "runtime-command", WORKSPACE_ID, "run", "--payload-json", JSON.stringify(runtimeCommand)),
      method: "POST",
      url: `${API_BASE}/api/execution-workspaces/workspace%2FKeepCase/runtime-commands/run`,
      body: runtimeCommand,
      response: { operationId: "operation-run-1", status: "queued" },
    },
    {
      name: "environment list",
      args: cliArgs("environment", "list", "--company-id", COMPANY_ID),
      method: "GET",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/environments`,
      response: [{ id: ENVIRONMENT_ID, name: "local fixture" }],
    },
    {
      name: "environment capabilities",
      args: cliArgs("environment", "capabilities", "--company-id", COMPANY_ID),
      method: "GET",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/environments/capabilities`,
      response: { providers: ["local"], supported: true },
    },
    {
      name: "environment create",
      args: cliArgs("environment", "create", "--company-id", COMPANY_ID, "--payload-json", JSON.stringify(environmentCreate)),
      method: "POST",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/environments`,
      body: environmentCreate,
      response: { id: ENVIRONMENT_ID, ...environmentCreate },
    },
    {
      name: "environment get",
      args: cliArgs("environment", "get", ENVIRONMENT_ID),
      method: "GET",
      url: `${API_BASE}/api/environments/environment%2FKeepCase`,
      response: { id: ENVIRONMENT_ID, name: "local fixture" },
    },
    {
      name: "environment leases",
      args: cliArgs("environment", "leases", ENVIRONMENT_ID),
      method: "GET",
      url: `${API_BASE}/api/environments/environment%2FKeepCase/leases`,
      response: [{ id: "lease-1", status: "active" }],
    },
    {
      name: "environment lease",
      args: cliArgs("environment", "lease", "lease/KeepCase"),
      method: "GET",
      url: `${API_BASE}/api/environment-leases/lease%2FKeepCase`,
      response: { id: "lease/KeepCase", status: "active" },
    },
    {
      name: "environment update",
      args: cliArgs("environment", "update", ENVIRONMENT_ID, "--payload-json", JSON.stringify(environmentUpdate)),
      method: "PATCH",
      url: `${API_BASE}/api/environments/environment%2FKeepCase`,
      body: environmentUpdate,
      response: { id: ENVIRONMENT_ID, ...environmentUpdate },
    },
    {
      name: "environment delete",
      args: cliArgs("environment", "delete", ENVIRONMENT_ID),
      method: "DELETE",
      url: `${API_BASE}/api/environments/environment%2FKeepCase`,
      response: { deleted: true, id: ENVIRONMENT_ID },
    },
    {
      name: "environment probe",
      args: cliArgs("environment", "probe", ENVIRONMENT_ID),
      method: "POST",
      url: `${API_BASE}/api/environments/environment%2FKeepCase/probe`,
      body: {},
      response: { reachable: true, latencyMs: 12 },
    },
    {
      name: "environment probe-config",
      args: cliArgs("environment", "probe-config", "--company-id", COMPANY_ID, "--payload-json", JSON.stringify(probeConfig)),
      method: "POST",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/environments/probe-config`,
      body: probeConfig,
      response: { valid: true, target: probeConfig.target },
    },
    {
      name: "project-workspace list",
      args: cliArgs("project-workspace", "list", PROJECT_ID),
      method: "GET",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces`,
      response: [{ id: PROJECT_WORKSPACE_ID, name: "Implementation KeepCase" }],
    },
    {
      name: "project-workspace create",
      args: cliArgs("project-workspace", "create", PROJECT_ID, "--payload-json", JSON.stringify(projectWorkspaceCreate)),
      method: "POST",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces`,
      body: projectWorkspaceCreate,
      response: { id: PROJECT_WORKSPACE_ID, ...projectWorkspaceCreate },
    },
    {
      name: "project-workspace update",
      args: cliArgs("project-workspace", "update", PROJECT_ID, PROJECT_WORKSPACE_ID, "--payload-json", JSON.stringify(projectWorkspaceUpdate)),
      method: "PATCH",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces/project-workspace%2FKeepCase`,
      body: projectWorkspaceUpdate,
      response: { id: PROJECT_WORKSPACE_ID, ...projectWorkspaceUpdate },
    },
    {
      name: "project-workspace delete",
      args: cliArgs("project-workspace", "delete", PROJECT_ID, PROJECT_WORKSPACE_ID),
      method: "DELETE",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces/project-workspace%2FKeepCase`,
      response: { deleted: true, id: PROJECT_WORKSPACE_ID },
    },
    {
      name: "project-workspace runtime-service",
      args: cliArgs("project-workspace", "runtime-service", PROJECT_ID, PROJECT_WORKSPACE_ID, "start", "--payload-json", JSON.stringify(projectRuntimeService)),
      method: "POST",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces/project-workspace%2FKeepCase/runtime-services/start`,
      body: projectRuntimeService,
      response: { accepted: true, service: projectRuntimeService.service },
    },
    {
      name: "project-workspace runtime-command",
      args: cliArgs("project-workspace", "runtime-command", PROJECT_ID, PROJECT_WORKSPACE_ID, "run"),
      method: "POST",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces/project-workspace%2FKeepCase/runtime-commands/run`,
      body: {},
      response: { operationId: "project-operation-1", status: "queued" },
    },
  ];
}

function errorFixtures(): ErrorFixture[] {
  return [
    {
      args: cliArgs("agent-config", "list", "--company-id", COMPANY_ID),
      method: "GET",
      url: `${API_BASE}/api/companies/${COMPANY_ID}/agent-configurations`,
      status: 503,
      error: "Agent config unavailable from fixture provider",
      details: { code: "AGENT_CONFIG_BACKEND" },
    },
    {
      args: cliArgs("workspace", "update", "workspace/denied", "--payload-json", JSON.stringify({ status: "closed" })),
      method: "PATCH",
      url: `${API_BASE}/api/execution-workspaces/workspace%2Fdenied`,
      status: 409,
      error: "Workspace update rejected by fixture provider",
      details: { code: "WORKSPACE_CONFLICT", reference: "KeepCase" },
      body: { status: "closed" },
    },
    {
      args: cliArgs("environment", "delete", "environment/denied"),
      method: "DELETE",
      url: `${API_BASE}/api/environments/environment%2Fdenied`,
      status: 422,
      error: "Environment deletion rejected by fixture provider",
      details: { code: "ENVIRONMENT_IN_USE" },
    },
    {
      args: cliArgs("project-workspace", "runtime-command", PROJECT_ID, PROJECT_WORKSPACE_ID, "run", "--payload-json", JSON.stringify({ argv: ["false"] })),
      method: "POST",
      url: `${API_BASE}/api/projects/project%2FKeepCase/workspaces/project-workspace%2FKeepCase/runtime-commands/run`,
      status: 502,
      error: "Project runtime command failed at fixture adapter",
      details: { code: "RUNTIME_ADAPTER_FAILURE", retryable: false },
      body: { argv: ["false"] },
    },
  ];
}

describe("workspace structured CLI contracts", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-workspace-contract-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    stdoutSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    setCliCommandLineShape();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function runCommand(args: string[], locale: SupportedLocale): Promise<void> {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  function expectRequest(operation: Pick<OperationFixture, "method" | "url" | "body">): void {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(url).toBe(operation.url);
    expect(init?.method ?? "GET").toBe(operation.method);
    if (operation.body === undefined) {
      expect(init?.body).toBeUndefined();
    } else {
      expect(JSON.parse(String(init?.body))).toEqual(operation.body);
    }
  }

  it("keeps JSON output, routes and request payloads equivalent across locales", async () => {
    for (const operation of operationFixtures()) {
      const outputs: string[] = [];
      for (const locale of LOCALES) {
        fetchMock.mockClear();
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        stdoutSpy.mockClear();
        await runCommand(operation.args, locale);

        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs.push(output);
        expect(JSON.parse(output), operation.name).toEqual(operation.response);
        expectRequest(operation);
      }
      expect(outputs[0], operation.name).toBe(outputs[1]);
    }
  });

  it("keeps structured API errors and exit status equivalent for each workspace family", async () => {
    const errorOutputs: string[][] = errorFixtures().map(() => []);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("fixture exit"); });

    for (const [index, failure] of errorFixtures().entries()) {
      for (const locale of LOCALES) {
        fetchMock.mockClear();
        fetchMock.mockResolvedValueOnce(jsonResponse({ error: failure.error, details: failure.details }, failure.status));
        stdoutSpy.mockClear();
        stderrSpy.mockClear();
        await expect(runCommand(failure.args, locale)).rejects.toThrow("fixture exit");

        expect(exitSpy).toHaveBeenLastCalledWith(1);
        expect(stdoutSpy).not.toHaveBeenCalled();
        expect(stderrSpy).toHaveBeenCalledTimes(1);
        const message = String(stderrSpy.mock.calls[0]?.[0]);
        errorOutputs[index]!.push(message);
        expect(message).toContain(`API error ${failure.status}: ${failure.error}`);
        expect(message).toContain(`details=${JSON.stringify(failure.details)}`);
        expectRequest({ method: failure.method, url: failure.url, body: failure.body });
      }
      expect(errorOutputs[index]?.[0]).toBe(errorOutputs[index]?.[1]);
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual(Array(errorFixtures().length * LOCALES.length).fill(1));
    exitSpy.mockRestore();
  });
});
