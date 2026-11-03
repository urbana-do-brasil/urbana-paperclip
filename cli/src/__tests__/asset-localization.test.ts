import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAssetCommands } from "../commands/client/asset.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "asset-keep-case-17";
const IMAGE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
const CONTENT_BYTES = Buffer.from([0x00, 0x41, 0xff, 0x0a]);
const UPLOAD_RESULT = { id: ASSET_ID, url: "/assets/KeepCase.png", alt: "KeepCase image" };
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerAssetCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("asset CLI localization", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let tempDir: string;
  let contextPath: string;
  let imagePath: string;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    process.argv = ["node", "paperclipai"];
    tempDir = await mkdtemp(join(tmpdir(), "paperclip-asset-localization-"));
    contextPath = join(tempDir, "context.json");
    imagePath = join(tempDir, "KeepCase.png");
    await writeFile(contextPath, JSON.stringify({ version: 2, currentProfile: "default", profiles: { default: {} } }));
    await writeFile(imagePath, IMAGE_BYTES);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliCommandLineShape(undefined);
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  async function run(args: readonly string[], locale: SupportedLocale, json = false): Promise<void> {
    const commandArgs = [
      ...args,
      "--context", contextPath,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...(json ? ["--json"] : []),
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Operações de arquivos de mídia",
      descriptions: [
        "Enviar uma imagem para a organização",
        "Enviar o logotipo da organização",
        "Baixar o conteúdo de um arquivo de mídia",
      ],
      file: "Caminho do arquivo de imagem",
      companyId: "ID da organização",
      namespace: "Sufixo do namespace do ativo",
      assetId: "ID do ativo",
      out: "Gravar o conteúdo em um arquivo em vez de stdout",
    },
    {
      locale: "en",
      group: "Asset operations",
      descriptions: ["Upload a company image asset", "Upload a company logo", "Download asset content"],
      file: "Image file path",
      companyId: "Company ID",
      namespace: "Asset namespace suffix",
      assetId: "Asset ID",
      out: "Write content to a file instead of stdout",
    },
  ] as const)("localizes $locale help and keeps commands and flags stable", ({ locale, group, descriptions, file, companyId, namespace, assetId, out }) => {
    const program = makeProgram(locale);
    const asset = program.commands.find((command) => command.name() === "asset");
    const commands = ["image:upload", "logo:upload", "content"].map((name) => asset?.commands.find((command) => command.name() === name));
    expect(asset?.description()).toBe(group);
    expect(commands.map((command) => command?.description())).toEqual(descriptions);

    const imageHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(imageHelp).toContain("paperclipai asset image:upload [options]");
    expect(imageHelp).toContain("--file <path>");
    expect(imageHelp).toContain(file);
    expect(imageHelp).toContain("--company-id <id>");
    expect(imageHelp).toContain(companyId);
    expect(imageHelp).toContain("--namespace <value>");
    expect(imageHelp).toContain(namespace);

    const contentHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(contentHelp).toContain("paperclipai asset content [options] <assetId>");
    expect(contentHelp).toContain(assetId);
    expect(contentHelp).toContain("--out <path>");
    expect(contentHelp).toContain(out);
  });

  it("preserves image upload route, multipart values, data, and JSON output in both locales", async () => {
    const args = [
      "asset", "image:upload", "--file", imagePath, "--company-id", COMPANY_ID,
      "--namespace", "avatars", "--alt", "KeepCase alt", "--title", "KeepCase title",
    ];

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(UPLOAD_RESULT, 201));
      await run(args, locale, true);
      expect(logSpy.mock.calls.at(-1)?.[0]).toBe(JSON.stringify(UPLOAD_RESULT, null, 2));
      logSpy.mockClear();

      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/companies/${COMPANY_ID}/assets/images`);
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({ authorization: "Bearer board-token" });
      const form = init.body as FormData;
      const image = form.get("file") as File;
      expect(image.name).toBe("KeepCase.png");
      expect(image.type).toBe("image/png");
      expect(Buffer.from(await image.arrayBuffer())).toEqual(IMAGE_BYTES);
      expect(form.get("namespace")).toBe("avatars");
      expect(form.get("alt")).toBe("KeepCase alt");
      expect(form.get("title")).toBe("KeepCase title");
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves logo upload route, file data, and JSON output in both locales", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(UPLOAD_RESULT, 201));
      await run(["asset", "logo:upload", "--file", imagePath, "--company-id", COMPANY_ID], locale);
      expect(logSpy.mock.calls.at(-1)?.[0]).toBe(JSON.stringify(UPLOAD_RESULT, null, 2));
      logSpy.mockClear();

      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/companies/${COMPANY_ID}/logo`);
      expect(init.method).toBe("POST");
      const form = init.body as FormData;
      const image = form.get("file") as File;
      expect(image.name).toBe("KeepCase.png");
      expect(Buffer.from(await image.arrayBuffer())).toEqual(IMAGE_BYTES);
      expect([...form.keys()]).toEqual(["file"]);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves asset content route and raw bytes in both locales", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(new Response(CONTENT_BYTES, { status: 200 }));
      await run(["asset", "content", ASSET_ID], locale);
      const output = stdoutWrite.mock.calls.at(-1)?.[0];
      expect(Buffer.from(output as Uint8Array)).toEqual(CONTENT_BYTES);
      stdoutWrite.mockClear();

      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/assets/${ASSET_ID}/content`);
      expect(init.headers).toEqual({ authorization: "Bearer board-token" });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes upload validation and keeps JSON-mode stderr stable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);

    for (const locale of ["pt-BR", "en"] as const) {
      await expect(run(["asset", "image:upload", "--file", "   ", "--company-id", COMPANY_ID], locale)).rejects.toThrow("exit:1");
      expect(errorSpy.mock.calls.at(-1)?.[0]).toBe(locale === "pt-BR" ? "A opção --file é obrigatória." : "--file is required");
      errorSpy.mockClear();
    }

    const structuredErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      await expect(run(["asset", "image:upload", "--file", "   ", "--company-id", COMPANY_ID], locale, true)).rejects.toThrow("exit:1");
      structuredErrors.push(String(errorSpy.mock.calls.at(-1)?.[0]));
      errorSpy.mockClear();
    }
    expect(structuredErrors).toEqual(["--file is required", "--file is required"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls).toEqual(Array(4).fill([1]));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("localizes each API failure while preserving status, provider message, and structured stderr", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const operations = [
      { args: ["asset", "image:upload", "--file", imagePath, "--company-id", COMPANY_ID], status: 422, message: "Image rejected KeepCase" },
      { args: ["asset", "logo:upload", "--file", imagePath, "--company-id", COMPANY_ID], status: 409, message: "Logo conflict KeepCase" },
      { args: ["asset", "content", ASSET_ID], status: 404, message: "Asset missing KeepCase" },
    ];
    const structuredErrors: string[][] = operations.map(() => []);

    for (const [index, operation] of operations.entries()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse({ error: operation.message }, operation.status));
          await expect(run(operation.args, locale, json)).rejects.toThrow("exit:1");
          const output = String(errorSpy.mock.calls.at(-1)?.[0]);
          const expectedLabel = json || locale === "en" ? "API error" : "Erro de API";
          expect(output).toContain(`${expectedLabel} ${operation.status}:`);
          expect(output).toContain(operation.message);
          if (json) expect(output).toBe(`API error ${operation.status}: ${operation.message}`);
          if (json) structuredErrors[index]?.push(output);
          errorSpy.mockClear();
        }
      }
    }

    for (const errors of structuredErrors) expect(errors).toHaveLength(2), expect(errors[0]).toBe(errors[1]);
    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(exitSpy.mock.calls).toEqual(Array(12).fill([1]));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("uses stdout output paths without changing API content semantics", async () => {
    const outputPath = join(tempDir, "download.bin");
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(new Response(CONTENT_BYTES, { status: 200 }));
      await run(["asset", "content", ASSET_ID, "--out", outputPath], locale, true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]))).toEqual({ ok: true, out: outputPath, bytes: CONTENT_BYTES.length });
      expect(await readFile(outputPath)).toEqual(CONTENT_BYTES);
      logSpy.mockClear();
      await rm(outputPath, { force: true });
    }
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(Array(2).fill(`http://paperclip.test/api/assets/${ASSET_ID}/content`));
    expect(stdoutWrite).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
