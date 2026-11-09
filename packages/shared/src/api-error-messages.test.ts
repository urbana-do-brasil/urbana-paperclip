import { describe, expect, it } from "vitest";
import { apiErrorMessageFields, formatApiErrorMessage, parseApiErrorMessage } from "./api-error-messages.js";

describe("safe API error presentation", () => {
  it("localizes explicit, owned identities without changing arbitrary provider details", () => {
    const metadata = parseApiErrorMessage({ messageKey: "validation" });
    expect(formatApiErrorMessage(metadata, "Validation error", "pt-BR")).toBe("Os dados enviados são inválidos. Revise os campos e tente novamente.");
    expect(formatApiErrorMessage(metadata, "Validation error", "en")).toBe("The submitted data is invalid. Check the fields and try again.");
    expect(formatApiErrorMessage(undefined, "Vendor rejected customer data", "pt-BR")).toBe("Não foi possível concluir a solicitação. Detalhes: Vendor rejected customer data");
    expect(formatApiErrorMessage(undefined, "Vendor rejected customer data", "en")).toBe("The request could not be completed. Details: Vendor rejected customer data");
  });
  it("accepts only bounded numeric parameters and rejects strings, secrets and unknown identities", () => {
    const good = parseApiErrorMessage({ messageKey: "retry_after_seconds", messageParams: { seconds: 2 } });
    expect(formatApiErrorMessage(good, "original", "pt-BR")).toBe("Tente novamente em 2 segundos.");
    expect(formatApiErrorMessage(good, "original", "en")).toBe("Try again in 2 seconds.");
    for (const bad of [
      { messageKey: "unknown", messageParams: { token: "sensitive-canary" } },
      { messageKey: "validation", messageParams: { token: "sensitive-canary" } },
      { messageKey: "retry_after_seconds", messageParams: { seconds: 1, token: "sensitive-canary" } },
      { messageKey: "retry_after_seconds", messageParams: { seconds: "1" } },
      { messageKey: "retry_after_seconds", messageParams: { seconds: -1 } },
      { messageKey: "retry_after_seconds", messageParams: { seconds: 86_401 } },
    ]) expect(parseApiErrorMessage(bad)).toBeUndefined();
    expect(apiErrorMessageFields({ key: "retry_after_seconds", params: { seconds: Number.NaN } })).toEqual({});
  });
});
