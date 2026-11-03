import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { describe, expect, it } from "vitest";
import {
  disableAllRoutinesInConfig,
  formatDisableAllRoutinesResult,
  type DisableAllRoutinesResult,
  registerRoutineCommands,
} from "../commands/routines.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { getCliLocale, setCliLocale } from "../localization/index.js";

const result: DisableAllRoutinesResult = {
  companyId: "company-fixture",
  totalRoutines: 5,
  pausedCount: 2,
  alreadyPausedCount: 1,
  archivedCount: 2,
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  registerRoutineCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function commandShape(command: Command): unknown {
  return {
    name: command.name(),
    args: command.registeredArguments.map((argument) => argument.name()),
    options: command.options.map((option) => option.flags),
    children: command.commands.map(commandShape),
  };
}

describe("routines disable-all localization", () => {
  it("localizes summary and empty-state output while preserving JSON bytes", () => {
    const originalLocale = getCliLocale();
    const summaries: string[] = [];
    const emptyStates: string[] = [];
    const jsonOutputs: string[] = [];
    try {
      for (const locale of ["en", "pt-BR"] as const) {
        setCliLocale(locale);
        summaries.push(formatDisableAllRoutinesResult(result, { locale }));
        emptyStates.push(formatDisableAllRoutinesResult({
          ...result,
          totalRoutines: 0,
          pausedCount: 0,
          alreadyPausedCount: 0,
          archivedCount: 0,
        }, { locale }));
        jsonOutputs.push(formatDisableAllRoutinesResult(result, { json: true, locale }));
      }
    } finally {
      setCliLocale(originalLocale);
    }

    expect(summaries[0]).toContain("Paused 2 routine(s) for company company-fixture (1 already paused, 2 archived).");
    expect(summaries[1]).toContain("Rotinas pausadas: 2 para a organização company-fixture (1 já pausadas, 2 arquivadas).");
    expect(emptyStates[0]).toContain("No routines found for company company-fixture.");
    expect(emptyStates[1]).toContain("Nenhuma rotina encontrada para a organização company-fixture.");
    expect(summaries[0]).not.toBe(summaries[1]);
    expect(emptyStates[0]).not.toBe(emptyStates[1]);
    expect(jsonOutputs[0]).toBe(jsonOutputs[1]);
    expect(jsonOutputs[0]).toBe(JSON.stringify(result, null, 2));
    expect(JSON.parse(jsonOutputs[0]!)).toEqual(result);
  });

  it("localizes help without changing command names or flags", () => {
    const originalLocale = getCliLocale();
    try {
      const en = makeProgram("en");
      const pt = makeProgram("pt-BR");
      expect(commandShape(pt)).toEqual(commandShape(en));

      const enGroup = en.commands.find((command) => command.name() === "routines")!;
      const ptGroup = pt.commands.find((command) => command.name() === "routines")!;
      const enDisable = enGroup.commands.find((command) => command.name() === "disable-all")!;
      const ptDisable = ptGroup.commands.find((command) => command.name() === "disable-all")!;
      expect(enGroup.description()).toBe("Local routine maintenance commands");
      expect(ptGroup.description()).toBe("Comandos locais para manutenção de rotinas");
      expect(enDisable.description()).toContain("Pause all non-archived routines");
      expect(ptDisable.description()).toContain("Pausar todas as rotinas não arquivadas");
      expect(enDisable.helpInformation()).toContain("--company-id <id>");
      expect(ptDisable.helpInformation()).toContain("ID da organização");
      expect(ptDisable.helpInformation()).toContain("--json");
    } finally {
      setCliLocale(originalLocale);
    }
  });

  it("keeps the company-id validation error English and avoids opening a database", async () => {
    const originalLocale = getCliLocale();
    const originalCompanyId = process.env.PAPERCLIP_COMPANY_ID;
    delete process.env.PAPERCLIP_COMPANY_ID;
    const errors: string[] = [];
    try {
      for (const locale of ["en", "pt-BR"] as const) {
        setCliLocale(locale);
        try {
          await disableAllRoutinesInConfig({ config: "/tmp/routines-localization-missing.json" });
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      if (originalCompanyId === undefined) delete process.env.PAPERCLIP_COMPANY_ID;
      else process.env.PAPERCLIP_COMPANY_ID = originalCompanyId;
      setCliLocale(originalLocale);
    }
    expect(errors).toEqual([
      "Company ID is required. Pass --company-id or set PAPERCLIP_COMPANY_ID.",
      "Company ID is required. Pass --company-id or set PAPERCLIP_COMPANY_ID.",
    ]);
  });
});
