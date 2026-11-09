import { describe, expect, it } from "vitest";

import { i18n } from "@/i18n";
import {
  routineSecretCopyFailureToast,
  routineSecretCopySuccessTitle,
} from "./routine-secret-copy-toast";

describe("routine secret copy feedback", () => {
  it("localizes success and fallback failure in Portuguese and English", () => {
    const pt = i18n.getFixedT("pt-BR");
    const en = i18n.getFixedT("en");

    expect(routineSecretCopySuccessTitle(pt, "URL do webhook")).toBe(
      "Copiado para a área de transferência: URL do webhook.",
    );
    expect(routineSecretCopyFailureToast(pt, "chave do webhook", "denied")).toEqual({
      title: "Não foi possível copiar chave do webhook.",
      body: "O acesso à área de transferência foi negado.",
    });

    expect(routineSecretCopySuccessTitle(en, "Webhook URL")).toBe(
      "Copied to clipboard: Webhook URL.",
    );
    expect(routineSecretCopyFailureToast(en, "webhook key", "denied")).toEqual({
      title: "Failed to copy webhook key.",
      body: "Clipboard access was denied.",
    });
  });

  it("preserves the original clipboard error message", () => {
    const upstreamMessage = "Clipboard permission denied by browser policy";

    expect(
      routineSecretCopyFailureToast(i18n.getFixedT("pt-BR"), "chave", new Error(upstreamMessage)),
    ).toEqual({
      title: "Não foi possível copiar chave.",
      body: upstreamMessage,
    });
  });
});
