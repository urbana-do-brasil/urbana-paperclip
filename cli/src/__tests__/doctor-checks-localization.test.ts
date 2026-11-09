import { afterEach, describe, expect, it } from "vitest";
import { localizeDoctorCheckPresentation } from "../localization/doctor-checks.js";
import { setCliLocale } from "../localization/index.js";

afterEach(() => setCliLocale("pt-BR"));

describe("doctor check presentation localization", () => {
  it("localizes checker messages and hints while leaving the result object untouched", () => {
    setCliLocale("pt-BR");
    const result = {
      name: "Config file",
      status: "fail" as const,
      message: "Config file not found at /tmp/paperclip/config.json",
      canRepair: false,
      repairHint: "Run `paperclipai onboard` to create one",
    };

    expect(localizeDoctorCheckPresentation(result)).toEqual({
      ...result,
      message: "Arquivo de configuração não encontrado em /tmp/paperclip/config.json.",
      repairHint: "Execute `paperclipai onboard` para criar o arquivo.",
    });
    expect(result.message).toBe("Config file not found at /tmp/paperclip/config.json");
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      name: "Config file",
      status: "fail",
      message: "Config file not found at /tmp/paperclip/config.json",
      canRepair: false,
      repairHint: "Run `paperclipai onboard` to create one",
    });
  });

  it("localizes dynamic service-manager reasons and preserves command names", () => {
    setCliLocale("pt-BR");
    const result = {
      name: "Background service",
      status: "pass" as const,
      message: "Service management is not supported on aix. Use paperclipai run instead.",
    };

    expect(localizeDoctorCheckPresentation(result).message).toBe(
      "O gerenciamento de serviços não é compatível com aix. Use paperclipai run.",
    );
  });

  it("translates diagnostic text but keeps raw connection details intact", () => {
    setCliLocale("pt-BR");
    const result = {
      name: "Database",
      status: "fail" as const,
      message: "Cannot connect to PostgreSQL: ECONNREFUSED 127.0.0.1:5432",
      repairHint: "Check your connection string and ensure PostgreSQL is running",
    };

    expect(localizeDoctorCheckPresentation(result)).toEqual({
      ...result,
      message: "Não foi possível conectar ao PostgreSQL: ECONNREFUSED 127.0.0.1:5432",
      repairHint: "Verifique a string de conexão e confirme que o PostgreSQL está em execução.",
    });
  });

  it("localizes strict-mode notes while retaining key paths and stable options", () => {
    setCliLocale("pt-BR");
    const result = {
      name: "Secrets adapter",
      status: "warn" as const,
      message: "Local encrypted provider configured with key file /tmp/paperclip/master.key; strict secret mode is disabled for postgres deployment",
      repairHint: "Consider enabling secrets.strictMode",
    };

    expect(localizeDoctorCheckPresentation(result)).toEqual({
      ...result,
      message: "Provedor de criptografia local configurado com o arquivo de chave /tmp/paperclip/master.key; o modo estrito de segredos está desativado para a implantação PostgreSQL",
      repairHint: "Considere ativar secrets.strictMode.",
    });
  });

  it("preserves unknown runtime details and returns the original English presentation", () => {
    const result = {
      name: "Service health",
      status: "fail" as const,
      message: "fetch failed: ECONNREFUSED 127.0.0.1:3100",
      repairHint: "Inspect `paperclipai service status` and `paperclipai service logs`",
    };

    setCliLocale("pt-BR");
    expect(localizeDoctorCheckPresentation(result)).toEqual({
      ...result,
      repairHint: "Consulte `paperclipai service status` e `paperclipai service logs`.",
    });

    setCliLocale("en");
    expect(localizeDoctorCheckPresentation(result)).toBe(result);
  });
});
