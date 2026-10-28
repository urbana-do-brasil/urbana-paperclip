import { Command } from "commander";
import { afterEach, describe, expect, it } from "vitest";
import { localizeCommanderErrorOutput } from "../localization/commander-errors.js";
import { setCliLocale } from "../localization/index.js";

afterEach(() => setCliLocale("pt-BR"));

describe("Commander parser error localization", () => {
  it("localizes unknown commands and options while preserving suggestions", () => {
    setCliLocale("pt-BR");
    expect(localizeCommanderErrorOutput("error: unknown command 'onbaord'\n(Did you mean onboard?)\n"))
      .toBe("erro: comando desconhecido 'onbaord'\n(Você quis dizer onboard?)\n");
    expect(localizeCommanderErrorOutput("error: unknown option '--langauge'\n(Did you mean one of --language, --lang?)\n"))
      .toBe("erro: opção desconhecida '--langauge'\n(Você quis dizer um destes: --language, --lang?)\n");
  });

  it("localizes missing arguments, required options, and conflicts", () => {
    setCliLocale("pt-BR");
    expect(localizeCommanderErrorOutput("error: missing required argument '<file>'\n"))
      .toBe("erro: o argumento obrigatório '<file>' não foi informado\n");
    expect(localizeCommanderErrorOutput("error: option '--output <path>' argument missing\n"))
      .toBe("erro: a opção '--output <path>' exige um argumento\n");
    expect(localizeCommanderErrorOutput("error: required option '--api-key <key>' not specified\n"))
      .toBe("erro: a opção obrigatória '--api-key <key>' não foi informada\n");
    expect(localizeCommanderErrorOutput("error: option '--json' cannot be used with environment variable 'PAPERCLIP_JSON'\n"))
      .toBe("erro: a opção '--json' não pode ser usada junto com a variável de ambiente 'PAPERCLIP_JSON'\n");
    expect(localizeCommanderErrorOutput("error: too many arguments for 'onboard'. Expected 1 argument but got 2: a, b.\n"))
      .toBe("erro: argumentos em excesso para 'onboard'. Eram esperados 1 argumento, mas foram recebidos 2: a, b.\n");
    expect(localizeCommanderErrorOutput("error: option '--port <number>' argument 'abc' is invalid. Allowed choices are: 1, 2\n"))
      .toBe("erro: o valor 'abc' é inválido para a opção '--port <number>'. Valores permitidos: 1, 2\n");
  });

  it("plugs into Commander output without changing parse failure exit codes", () => {
    setCliLocale("pt-BR");
    let stderr = "";
    const command = new Command()
      .exitOverride()
      .configureOutput({ outputError: (output) => { stderr += localizeCommanderErrorOutput(output); } });
    command.command("check").requiredOption("--file <path>").action(() => {});
    expect(() => command.parse(["node", "paperclipai", "check"], { from: "node" }))
      .toThrow(expect.objectContaining({ code: "commander.missingMandatoryOptionValue", exitCode: 1 }));
    expect(stderr).toBe("erro: a opção obrigatória '--file <path>' não foi informada\n");

    stderr = "";
    expect(() => command.parse(["node", "paperclipai", "mystery"], { from: "node" }))
      .toThrow(expect.objectContaining({ code: "commander.unknownCommand", exitCode: 1 }));
    expect(stderr).toBe("erro: comando desconhecido 'mystery'\n");
  });

  it("keeps English and unrecognized Commander/application output unchanged", () => {
    setCliLocale("en");
    expect(localizeCommanderErrorOutput("error: unknown option '--nope'\n")).toBe("error: unknown option '--nope'\n");
    setCliLocale("pt-BR");
    const custom = "error: option '--port' argument 'not-a-number' is invalid. Cannot parse port";
    expect(localizeCommanderErrorOutput(custom))
      .toBe("erro: o valor 'not-a-number' é inválido para a opção '--port'. Cannot parse port");
  });
});
