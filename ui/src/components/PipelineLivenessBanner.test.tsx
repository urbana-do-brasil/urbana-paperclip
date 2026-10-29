// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import type { PipelineCaseLiveness } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { PipelineLivenessBanner } from "./PipelineLivenessBanner";

describe("PipelineLivenessBanner localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("localizes the no-action banner in PT-BR without exposing server copy", async () => {
    await i18n.changeLanguage("pt-BR");
    const markup = renderToStaticMarkup(
      <PipelineLivenessBanner
        liveness={{
          state: "attention",
          reason: "no_action_path",
          message: "Untranslated server-owned liveness text.",
        }}
      />,
    );

    expect(markup).toContain("Este item está parado");
    expect(markup).toContain("O Paperclip não consegue identificar o próximo trabalho neste item");
    expect(markup).not.toContain("Untranslated server-owned liveness text.");
    expect(markup).toContain("aria-label=\"Este item está parado\"");
  });

  it("preserves dynamic liveness messages and localizes the missing-piece count", async () => {
    const liveness: PipelineCaseLiveness = {
      state: "blocked",
      reason: "breakdown_incomplete",
      message: "The request is missing supporting material.",
      breakdown: { missingRequestKeys: ["source", "approval"] },
    };

    const englishMarkup = renderToStaticMarkup(<PipelineLivenessBanner liveness={liveness} />);
    expect(englishMarkup).toContain("The request is missing supporting material. 2 expected pieces are still missing.");

    await i18n.changeLanguage("pt-BR");
    const portugueseMarkup = renderToStaticMarkup(<PipelineLivenessBanner liveness={liveness} />);
    expect(portugueseMarkup).toContain("The request is missing supporting material.");
    expect(portugueseMarkup).toContain("2 peças esperadas ainda estão faltando.");
    expect(portugueseMarkup).toContain("A divisão está incompleta");
  });

  it("localizes permission preflight failures and keeps the retry action unavailable", async () => {
    const liveness: PipelineCaseLiveness = {
      state: "blocked",
      reason: "permission_preflight_failed",
      message: "The configured responsible is missing pipeline access.",
      automation: { fingerprint: "company:company-1:pipeline:pipeline-1:pipelines:write" },
    };

    const englishMarkup = renderToStaticMarkup(
      <PipelineLivenessBanner liveness={liveness} onRetry={() => {}} />,
    );
    expect(englishMarkup).toContain("Permission needed before this can run");
    expect(englishMarkup).toContain("The configured responsible is missing pipeline access.");
    expect(englishMarkup).toContain("Required permission:");
    expect(englishMarkup).toContain("pipelines:write");
    expect(englishMarkup).toContain("on the target pipeline.");
    expect(englishMarkup).toContain("Grant the access above to the configured responsible");
    expect(englishMarkup).not.toContain("Re-run stage automation");

    await i18n.changeLanguage("pt-BR");
    const portugueseMarkup = renderToStaticMarkup(
      <PipelineLivenessBanner liveness={liveness} onRetry={() => {}} />,
    );
    expect(portugueseMarkup).toContain("Permissão necessária antes de executar");
    expect(portugueseMarkup).toContain("The configured responsible is missing pipeline access.");
    expect(portugueseMarkup).toContain("Permissão necessária:");
    expect(portugueseMarkup).toContain("pipelines:write");
    expect(portugueseMarkup).toContain("no pipeline de destino.");
    expect(portugueseMarkup).toContain("Conceda o acesso acima ao responsável configurado");
    expect(portugueseMarkup).not.toContain("Executar automação da etapa novamente");
  });
});
