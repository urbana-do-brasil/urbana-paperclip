import { afterEach, describe, expect, it } from "vitest";
import { adminOperationMessage, localizeDoctorCheckName } from "../localization/admin-operations.js";
import { setCliLocale } from "../localization/index.js";

afterEach(() => setCliLocale("pt-BR"));

describe("administrator operation messages", () => {
  it("localizes install progress and preserves commands and identifiers", () => {
    setCliLocale("pt-BR");
    expect(adminOperationMessage("installNpmInstalling", { version: "1.2.3" })).toBe("Instalando paperclipai@1.2.3...");
    expect(adminOperationMessage("installVerify", { command: "paperclipai --version" })).toContain("paperclipai --version");
    setCliLocale("en");
    expect(adminOperationMessage("installNpmInstalling", { version: "1.2.3" })).toBe("Installing paperclipai@1.2.3...");
  });

  it("localizes update messages without translating stable flags or JSON fields", () => {
    setCliLocale("pt-BR");
    expect(adminOperationMessage("updateDatabaseUnavailable")).toContain("paperclipai update --no-backup");
    expect(adminOperationMessage("updateRollbackManagedOnly")).toContain("--rollback");
    setCliLocale("en");
    expect(adminOperationMessage("updateDatabaseUnavailable")).toContain("paperclipai service start");
  });

  it("localizes service and doctor labels while preserving raw diagnostic details", () => {
    setCliLocale("pt-BR");
    expect(adminOperationMessage("serviceNotHealthy", { detail: "ECONNREFUSED" })).toBe("O serviço do Paperclip não ficou saudável: ECONNREFUSED");
    expect(localizeDoctorCheckName("Database")).toBe("Banco de dados");
    setCliLocale("en");
    expect(localizeDoctorCheckName("Database")).toBe("Database");
    expect(adminOperationMessage("doctorSomeFailed")).toContain("re-run doctor");
  });
});
