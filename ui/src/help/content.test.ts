import { describe, expect, it } from "vitest";
import { HELP_TOPICS, collectHelpHeadings, findHelpTopic, hasHelpTranslation, helpHref, loadHelpTopic, normalizeDocumentationMarkdown, parseHelpPath, safeHelpAsset, safeHelpLink, splitFrontmatter } from "./content";

describe("public help mapping", () => {
  it("contains unique source-backed public topics, including linked pages outside navigation", () => {
    const slugs = HELP_TOPICS.map((topic) => topic.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(expect.arrayContaining([
      "start/quickstart",
      "guides/board-operator/language",
      "guides/execution-policy",
      "guides/openclaw-docker-setup",
      "companies/companies-spec",
      "deploy/aws-ecs",
      "adapters/gemini-local",
    ]));
    for (const topic of HELP_TOPICS) {
      expect(hasHelpTranslation(topic, "en"), `${topic.slug} English`).toBe(true);
      expect(hasHelpTranslation(topic, "pt-BR"), `${topic.slug} PT-BR`).toBe(true);
    }
  });

  it("accepts only canonical explicit languages and mapped slugs", () => {
    expect(parseHelpPath("/help/en/start/quickstart")).toEqual({ locale: "en", slug: "start/quickstart", valid: true });
    expect(parseHelpPath("/help/pt-BR/guides/board-operator/language").valid).toBe(true);
    expect(parseHelpPath("/help")).toEqual({ locale: "pt-BR", slug: "start/what-is-paperclip", valid: true });
    expect(parseHelpPath("/help/es/start/quickstart").valid).toBe(false);
    expect(parseHelpPath("/help/pt-BR/%2e%2e/private").valid).toBe(false);
    expect(parseHelpPath("/help/pt-BR/%ZZ").valid).toBe(false);
  });

  it("loads translated guides and identifies English fallback separately from coverage", async () => {
    const language = findHelpTopic("guides/board-operator/language")!;
    const pt = await loadHelpTopic(language, "pt-BR");
    expect(pt.language).toBe("pt-BR"); expect(pt.fallback).toBe(false);
    expect(splitFrontmatter(pt.content).title).toBe("Escolha seu idioma");
    // A synthetic missing translation keeps this contract valid after the
    // actual documentation reaches full source coverage.
    const untranslated = { ...findHelpTopic("api/costs")!, portugueseSource: "docs/pt-BR/__missing-fixture__.md" };
    expect(hasHelpTranslation(untranslated, "pt-BR")).toBe(false);
    const fallback = await loadHelpTopic(untranslated, "pt-BR");
    expect(fallback.language).toBe("en"); expect(fallback.fallback).toBe(true);
    expect(splitFrontmatter(fallback.content).title).toBe("Costs");
  });

  it("loads the newly mapped root-level guides in PT-BR without changing technical examples or URLs", async () => {
    const technicalTokens = (markdown: string) => {
      const withoutFences = markdown.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, "");
      return [...new Set([...withoutFences.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]))].sort();
    };
    const exampleBlocks = (markdown: string, slug: string) =>
      [...markdown.matchAll(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm)].map((match) => {
        let block = match[0].replace(/^\s*#.*$/gm, "").replace(/\s+#.*$/gm, "");
        if (slug === "guides/execution-policy") {
          // Example titles/comments are human prose, not API fields or protocol
          // values, so the PT-BR guide may localize their contents.
          block = block
            .replace(/("title":\s*")[^"]*(")/g, '$1<localized example>$2')
            .replace(/("comment":\s*")[^"]*(")/g, '$1<localized example>$2')
            .replace(/(\s+\/\/).*$/gm, '$1<localized comment>');
        }
        if (slug === "guides/openclaw-docker-setup") {
          // The label printed to the operator may be translated; retain the
          // command, quoting, and gateway-token variable in the comparison.
          block = block.replace(/echo "(?:Your gateway token|Token do gateway): (\$OPENCLAW_GATEWAY_TOKEN)"/g, 'echo "<localized label>: $1"');
        }
        if (slug === "feedback-voting") {
          block = block.replace(/\.\.\.(?:raw adapter files|arquivos brutos dos adapters)/g, "...<localized description>");
        }
        if (!block.includes("┌")) return { kind: "code", source: block };

        // Presentational ASCII workflows may translate their labels while the
        // status values and graph shape must remain identical between guides.
        const drawingRows = block.split("\n").filter((line) => /[┌└│]/.test(line));
        return {
          kind: "workflow-diagram",
          rows: drawingRows.map((line) => ({
            topBoxes: (line.match(/┌/g) ?? []).length,
            bottomBoxes: (line.match(/└/g) ?? []).length,
            verticalEdges: (line.match(/│/g) ?? []).length,
            transitions: (line.match(/▶/g) ?? []).length,
            states: [...line.matchAll(/\b(?:todo|in_review|in_progress|done)\b/g)].map(([state]) => state),
          })),
        };
      });
    const linkTargets = (markdown: string) => [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);

    const translatedHeadings: Record<string, string> = {
      "guides/execution-policy": "## Visão geral",
      "guides/openclaw-docker-setup": "## Teste automatizado de entrada (recomendado para começar)",
      "agents/runtime": "## 1. O que este sistema faz",
      "feedback-voting": "## Como funciona a votação",
    };
    for (const slug of Object.keys(translatedHeadings)) {
      const topic = findHelpTopic(slug)!;
      expect(parseHelpPath(`/help/pt-BR/${slug}`).valid).toBe(true);
      const english = await loadHelpTopic(topic, "en");
      const portuguese = await loadHelpTopic(topic, "pt-BR");
      expect(portuguese.language).toBe("pt-BR");
      expect(portuguese.fallback).toBe(false);
      expect(portuguese.content).not.toBe(english.content);
      expect(portuguese.content).toContain(translatedHeadings[slug]);
      expect(technicalTokens(portuguese.content)).toEqual(technicalTokens(english.content));
      expect(exampleBlocks(portuguese.content, slug)).toEqual(exampleBlocks(english.content, slug));
      expect(linkTargets(portuguese.content)).toEqual(linkTargets(english.content));
      if (slug === "guides/openclaw-docker-setup") {
        expect(portuguese.content).toContain('echo "Token do gateway: $OPENCLAW_GATEWAY_TOKEN"');
        expect(english.content).toContain('echo "Your gateway token: $OPENCLAW_GATEWAY_TOKEN"');
      }
      if (slug === "guides/execution-policy") {
        expect(portuguese.content).toContain('"title": "Implementar recurso X"');
        expect(portuguese.content).toContain("Decisão de revisão: aprovado — a implementação está correta e os testes passaram.");
        expect(portuguese.content).toContain("Decisão de revisão: solicitar alterações — cubra o caso limite de nova tentativa.");
        expect(portuguese.content).toContain("Revisado — a implementação está correta e os testes passaram.");
        expect(portuguese.content).toContain("O alinhamento do botão está incorreto em telas móveis. Ajuste o contêiner flex.");
        expect(portuguese.content).toContain("// sempre true, aplicado pelo runtime");
        expect(portuguese.content).toContain("// lista ordenada de etapas de revisão/aprovação");
        expect(portuguese.content).toContain("// UUID gerado automaticamente");
        expect(portuguese.content).toContain("// tipo de etapa");
        expect(portuguese.content).toContain("// aprovações múltiplas ainda não são compatíveis");
        expect(portuguese.content).toContain('// definido quando type é "agent"');
        expect(portuguese.content).toContain('// definido quando type é "user"');
        expect(portuguese.content).toContain("// comentário obrigatório explicando a decisão");
        expect(portuguese.content).not.toContain("Implement feature X");
        expect(portuguese.content).not.toContain("Reviewer decision");
        expect(portuguese.content).not.toContain("Button alignment");
        expect(portuguese.content).not.toContain("auto-generated UUID");
        expect(portuguese.content).not.toContain("stage kind");
        expect(portuguese.content).not.toContain("multi-approval is not supported yet");
        const workflowDiagrams = [...portuguese.content.matchAll(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm)]
          .map((match) => match[0])
          .filter((block) => block.includes("┌"));
        expect(workflowDiagrams).toHaveLength(2);
        expect(workflowDiagrams.join("\n")).toContain("solicita ajustes");
        expect(workflowDiagrams.join("\n")).toContain("aprovadora");
        expect(workflowDiagrams.join("\n")).not.toMatch(/\b(?:executor|reviewer|approver|completes|approves|changes|resubmits)\b/i);
      }
      if (slug === "feedback-voting") {
        expect(portuguese.content).toContain("...arquivos brutos dos adapters");
        expect(portuguese.content).not.toContain("...raw adapter files");
        expect(portuguese.content).not.toContain("session artifacts when available");
        expect(english.content).toContain('Votes marked "keep local" are never queued for remote delivery.');
        expect(portuguese.content).toContain("Votos marcados como **Manter local** nunca são colocados na fila de envio remoto.");
        expect(portuguese.content).not.toContain("fila de exportação");
      }
    }
  });

  it("loads the translated public pipelines tutorial", async () => {
    const topic = findHelpTopic("pipelines/tutorial")!;
    const english = await loadHelpTopic(topic, "en");
    const portuguese = await loadHelpTopic(topic, "pt-BR");
    expect(portuguese.language).toBe("pt-BR");
    expect(portuguese.fallback).toBe(false);
    expect(portuguese.content).not.toBe(english.content);
    expect(portuguese.content).toContain("## Pré-requisitos");
    expect(portuguese.content).toContain("## Etapa 12: Feed de reflexão");
  });

  it("preserves technical code, converts known cards safely, and never routes unknown or unsafe links", () => {
    const example = '<Card title="Conceitos" href="/start/core-concepts">\nVeja o guia.\n</Card>\n\n```html\n<Card title="Example" href="/start/quickstart">example</Card>\n```';
    const normalized = normalizeDocumentationMarkdown(example);
    expect(normalized).toContain("[Conceitos](/start/core-concepts)");
    expect(normalized).toContain('<Card title="Example" href="/start/quickstart">example</Card>');
    expect(safeHelpLink("/start/core-concepts#models", "start/quickstart", "pt-BR")).toBe("/help/pt-BR/start/core-concepts#models");
    expect(safeHelpLink("../../deploy/secrets.md#provider-vaults", "guides/board-operator/example", "en")).toBe("/help/en/deploy/secrets#provider-vaults");
    expect(safeHelpLink("/companies/companies-spec", "start/quickstart", "en")).toBe("/help/en/companies/companies-spec");
    expect(safeHelpLink("javascript:alert(1)", "start/quickstart", "en")).toBeNull();
    expect(safeHelpLink("//attacker.example/a", "start/quickstart", "en")).toBeNull();
    expect(safeHelpLink("/api/private-user-data", "start/quickstart", "en")).toBeNull();
    expect(safeHelpLink("https://example.org/docs", "start/quickstart", "en")).toBe("https://example.org/docs");
    expect(safeHelpAsset("/images/logo-light.svg", "start/quickstart")).toBeTruthy();
    expect(safeHelpAsset("/api/companies", "start/quickstart")).toBeNull();
    expect(safeHelpAsset("https://attacker.example/pixel.png", "start/quickstart")).toBeNull();
    expect(helpHref("pt-BR", "start/quickstart")).toBe("/help/pt-BR/start/quickstart");
  });

  it("maps heading anchors while ignoring fenced examples", () => {
    expect(collectHelpHeadings("# Início\n## Opções de acesso\n```md\n## Not a heading\n```\n## Opções de acesso")).toEqual([
      { line: 1, slug: "início" }, { line: 2, slug: "opções-de-acesso" }, { line: 6, slug: "opções-de-acesso-1" },
    ]);
  });
});
