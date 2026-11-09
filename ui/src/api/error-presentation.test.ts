import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import { ApiError } from "./client";
import { AuthApiError } from "./auth";
import { formatUiError } from "./error-presentation";
import { ApiUnavailableError } from "./response";

afterEach(async () => { await i18n.changeLanguage("pt-BR"); });
describe("human-facing API errors", () => {
  it("changes presentation with locale while preserving the original message, status and body", async () => {
    const body = { error: "Validation error", messageKey: "validation", details: [{ path: ["name"] }] };
    const error = new ApiError(body.error, 400, body);
    await i18n.changeLanguage("pt-BR");
    expect(formatUiError(error)).toBe("Os dados enviados são inválidos. Revise os campos e tente novamente.");
    await i18n.changeLanguage("en");
    expect(formatUiError(error)).toBe("The submitted data is invalid. Check the fields and try again.");
    expect(error.message).toBe("Validation error");
    expect(error.status).toBe(400);
    expect(error.body).toEqual(body);
  });
  it("shows unknown provider text as original detail, and does not trust injected keys or params", async () => {
    await i18n.changeLanguage("pt-BR");
    const body = { error: "Vendor: unavailable", messageKey: "validation", messageParams: { token: "not-displayed-as-param" } };
    const error = new ApiError(body.error, 502, body);
    expect(error.presentation).toBeUndefined();
    expect(formatUiError(error)).toBe("Não foi possível concluir a solicitação. Detalhes: Vendor: unavailable");
    expect(formatUiError(new AuthApiError("Raw identity diagnostic", 403, null))).toContain("Raw identity diagnostic");
    expect(formatUiError(error)).not.toContain("not-displayed-as-param");
  });
  it("identifies a locally known outage without translating by matching error prose", async () => {
    await i18n.changeLanguage("pt-BR");
    const error = new ApiUnavailableError(503);
    expect(formatUiError(error)).toBe("O Paperclip está temporariamente indisponível. Tente novamente em instantes.");
    expect(error.message).toBe("Paperclip is temporarily unavailable. Please try again in a moment.");
  });
});
