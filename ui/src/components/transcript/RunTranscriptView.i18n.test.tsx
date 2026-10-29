// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TranscriptEntry } from "../../adapters";
import { i18n } from "../../i18n";
import { RunTranscriptView } from "./RunTranscriptView";

describe("RunTranscriptView localized tool details", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    flushSync(() => root.unmount());
    container.remove();
    await i18n.changeLanguage("pt-BR");
  });

  it("localizes result states and tool detail labels while preserving payloads", () => {
    const entries: TranscriptEntry[] = [
      {
        kind: "tool_call",
        ts: "2026-08-21T12:00:00.000Z",
        name: "read",
        toolUseId: "tool-1",
        input: { query: "private/README.md" },
      },
      {
        kind: "tool_result",
        ts: "2026-08-21T12:00:01.000Z",
        toolUseId: "tool-1",
        toolName: "read",
        content: "RAW_TOOL_RESULT",
        isError: true,
      },
    ];

    flushSync(() => root.render(<RunTranscriptView entries={entries} />));
    const summary = container.querySelector<HTMLDivElement>('[role="button"]');
    expect(summary).not.toBeNull();
    flushSync(() => summary?.click());

    expect(container.textContent).toContain("Com erro");
    expect(container.textContent).toContain("Entrada");
    expect(container.textContent).toContain("Resultado");
    expect(container.textContent).toContain("private/README.md");
    expect(container.textContent).toContain("RAW_TOOL_RESULT");
    expect(container.textContent).toContain("Read");
  });
});
