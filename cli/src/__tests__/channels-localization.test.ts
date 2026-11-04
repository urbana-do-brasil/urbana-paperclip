import { afterEach, describe, expect, it, vi } from "vitest";
import { channelsCommand, RELEASE_CHANNELS } from "../commands/channels.js";
import { setCliLocale } from "../localization/index.js";
import type { CommandRunner } from "../commands/install.js";

const runner: CommandRunner = async (_command, args) => {
  const packageName = args?.find((arg) => arg.startsWith("paperclipai@"));
  if (packageName === "paperclipai@nightly") throw new Error("external registry failure");
  return { stdout: JSON.stringify("2026.1000.1"), stderr: "" };
};

afterEach(() => { vi.restoreAllMocks(); setCliLocale("pt-BR"); });

describe("release channel localization", () => {
  it("localizes human output while preserving commands, values and JSON across locales", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    setCliLocale("pt-BR");
    await channelsCommand({}, runner);
    const pt = log.mock.calls.map((args) => args.join(" ")).join("\n");
    expect(pt).toContain("Canais de lançamento do Paperclip");
    expect(pt).toContain("indisponível");
    expect(pt).toContain("a versão recomendada");
    expect(pt).toContain("npx paperclipai@latest onboard");
    log.mockClear();
    await channelsCommand({ json: true }, runner);
    const jsonPt = String(log.mock.calls[0][0]);
    expect(JSON.parse(jsonPt).channels.map((entry: { cadence: string }) => entry.cadence)).toEqual(RELEASE_CHANNELS.map((entry) => entry.cadence));
    log.mockClear();
    setCliLocale("en");
    await channelsCommand({}, runner);
    const en = log.mock.calls.map((args) => args.join(" ")).join("\n");
    expect(en).toContain("Paperclip release channels");
    expect(en).toContain("unavailable");
    expect(en).toContain("npx paperclipai@latest onboard");
    log.mockClear();
    await channelsCommand({ json: true }, runner);
    expect(log.mock.calls[0][0]).toBe(jsonPt);
  });
});
