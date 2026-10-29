// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import type { WorkReference } from "../lib/pipeline-references";
import { PipelineWorkReferences } from "./PipelineWorkReferences";

describe("PipelineWorkReferences localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("localizes the empty state and folder label in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    const references: WorkReference[] = [
      {
        id: "workspace-ref-id",
        kind: "workspace",
        label: "Campaign files",
        path: "/work/campaigns/spring",
        branch: "feature/spring-launch",
      },
    ];

    const emptyMarkup = renderToStaticMarkup(<PipelineWorkReferences references={[]} />);
    const folderMarkup = renderToStaticMarkup(<PipelineWorkReferences references={references} />);

    expect(emptyMarkup).toContain("Ainda não há trabalho vinculado.");
    expect(folderMarkup).toContain("Pasta");
    expect(folderMarkup).toContain("Campaign files");
    expect(folderMarkup).toContain("/work/campaigns/spring");
    expect(folderMarkup).toContain("feature/spring-launch");
  });

  it("localizes the accessible label while preserving the external URL", async () => {
    await i18n.changeLanguage("pt-BR");
    const url = "https://example.test/briefing?source=paperclip";
    const markup = renderToStaticMarkup(
      <PipelineWorkReferences
        references={[{ id: "reference-id", kind: "url", label: "Campaign brief", url }]}
      />,
    );

    expect(markup).toContain("aria-label=\"Abrir referência externa: Campaign brief\"");
    expect(markup).toContain(`href=\"${url}\"`);
    expect(markup).toContain(url);
    expect(markup).toContain("Campaign brief");
  });
});
