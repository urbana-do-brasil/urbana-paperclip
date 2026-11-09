// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { i18n } from "@/i18n";
import { SourceResolvedFoldBadge } from "./SourceResolvedFoldBadge";

describe("SourceResolvedFoldBadge", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it("uses localized default text and title in Portuguese", () => {
    const html = renderToStaticMarkup(<SourceResolvedFoldBadge />);
    expect(html).toContain("Resolvido pela origem");
    expect(html).toContain("O sistema agrupou esta execução como um falso positivo resolvido pela origem.");
  });

  it("uses localized default text and title in English", async () => {
    await i18n.changeLanguage("en");
    const html = renderToStaticMarkup(<SourceResolvedFoldBadge />);
    expect(html).toContain("Source-resolved");
    expect(html).toContain("The system folded this run as a source-resolved false positive.");
  });
});
