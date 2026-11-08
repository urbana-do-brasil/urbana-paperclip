import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createCommunicationLocalePromptFixture } from "@paperclipai/adapter-utils/test-fixtures/prompt-context";
import { execute } from "./execute.js";
import { parseOpenCodeJsonl } from "./parse.js";

/**
 * Opt-in real-model qualification for task 6.4. It is skipped in normal test
 * runs; run it explicitly with PAPERCLIP_RUN_OPENCODE_QUALIFICATION=1.
 *
 * The test uses the authenticated local OpenCode CLI and the OpenCode Go model
 * already configured on this machine. It qualifies adapter + model + locale,
 * not every external runtime in the support matrix.
 */
const enabled = process.env.PAPERCLIP_RUN_OPENCODE_QUALIFICATION === "1";
const MODEL = "opencode-go/deepseek-v4.1-flash";
const TECHNICAL_TOKENS = [
  "curl --fail --silent https://example.invalid/health",
  "X-Trace-Mode: RAW",
  "WAITING_FOR_REVIEW",
];

const PROMPTS = {
  "pt-BR": [
    "Responda à pessoa em português brasileiro.",
    "Inclua: (1) uma frase curta de confirmação; (2) uma pergunta de confirmação; (3) duas opções curtas em linhas separadas.",
    "Não traduza nem altere os marcadores técnicos abaixo; copie-os exatamente:",
    ...TECHNICAL_TOKENS.map((token) => `- ${token}`),
  ].join("\n"),
  en: [
    "Reply to the person in English.",
    "Include: (1) a short confirmation sentence; (2) one confirmation question; (3) two short options on separate lines.",
    "Do not translate or alter the technical markers below; copy them exactly:",
    ...TECHNICAL_TOKENS.map((token) => `- ${token}`),
  ].join("\n"),
} as const;

describe.skipIf(!enabled)("OpenCode real-model locale qualification", () => {
  it.each(["pt-BR", "en"] as const)(
    "qualifies the real OpenCode runtime and %s human communication",
    async (locale) => {
      const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `paperclip-opencode-qual-${locale}-`));
      try {
        const context = createCommunicationLocalePromptFixture(locale);
        const result = await execute({
          runId: `opencode-qualification-${locale}-${Date.now()}`,
          agent: {
            id: "qualification-agent",
            companyId: "qualification-company",
            name: "Qualification Agent",
            adapterType: "opencode_local",
            adapterConfig: {},
          },
          runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
          config: {
            command: "opencode",
            cwd: workspace,
            model: MODEL,
            env: { OPENCODE_ALLOW_ALL_MODELS: "1" },
            timeoutSec: 180,
            graceSec: 20,
          },
          context: {
            ...context,
            paperclipTaskMarkdownAssignment: `## Owned assignment\n\n${PROMPTS[locale]}`,
            paperclipTaskMarkdownAssignmentCompact: `## Compact assignment\n\n${PROMPTS[locale]}`,
            paperclipTaskMarkdown: `## Owned assignment\n\n${PROMPTS[locale]}`,
          },
          onLog: async () => {},
          onMeta: async () => {},
        });

        const raw = String((result.resultJson as Record<string, unknown> | undefined)?.stdout ?? "");
        await fs.writeFile(
          `/tmp/opencode/opencode-qualification-${locale}.jsonl`,
          raw,
          "utf8",
        );
        const parsed = parseOpenCodeJsonl(raw);
        const text = parsed.summary.trim();

        expect(result.exitCode, `OpenCode ${locale} exit code; stderr: ${
          String((result.resultJson as Record<string, unknown> | undefined)?.stderr ?? "")
        }`).toBe(0);
        expect(text, `${locale} response text`).not.toBe("");

        for (const token of TECHNICAL_TOKENS) {
          expect(text, `${locale} preserved ${token}`).toContain(token);
        }
        expect(text, `${locale} confirmation question`).toContain("?");
        const optionLines = text
          .split("\n")
          .filter((line) => /^\s*(?:\d+[.)]|[-*])\s+\S/.test(line));
        expect(optionLines.length, `${locale} option lines`).toBeGreaterThanOrEqual(2);

        if (locale === "pt-BR") {
          expect(text, "pt-BR accented prose").toMatch(/[áàâãéêíóôõúç]/i);
          expect(text, "pt-BR human words").toMatch(/\b(?:você|confirma|opção|opções|português|sim|não)\b/i);
        } else {
          expect(text, "English human words").toMatch(/\b(?:the|please|confirm|option|reply|yes)\b/i);
        }
      } finally {
        await fs.rm(workspace, { recursive: true, force: true });
      }
    },
    240_000,
  );
});
