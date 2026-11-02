// @vitest-environment jsdom

import { createRoot } from "react-dom/client";
import type { AnchorHTMLAttributes } from "react";
import { act as reactAct } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { CaseFieldValue, CaseFieldsPanel } from "./CaseFieldsPanel";

function act(callback: () => void) {
  reactAct(callback);
}

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useCaseHref: () => (...segments: string[]) =>
    `/PAP/${["cases", ...segments].filter(Boolean).join("/")}`,
}));
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: vi.fn().mockResolvedValue(undefined) }));

let previousLanguage = "en";
beforeAll(() => { previousLanguage = i18n.language; });
afterAll(async () => { await i18n.changeLanguage(previousLanguage); });

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CaseFieldsPanel", () => {
  let container: HTMLDivElement;
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => {
    container.remove();
  });

  function render(fields: Record<string, unknown>) {
    const root = createRoot(container);
    act(() => {
      root.render(<CaseFieldsPanel fields={fields} />);
    });
    return root;
  }

  it.each([
    { locale: "en", heading: "Fields", empty: "No fields set." },
    { locale: "pt-BR", heading: "Campos", empty: "Nenhum campo definido." },
  ])("localizes the field panel empty state in $locale", async ({ locale, heading, empty }) => {
    await i18n.changeLanguage(locale);
    const root = render({});
    expect(container.textContent).toContain(heading);
    expect(container.textContent).toContain(empty);
    act(() => root.unmount());
  });

  it("updates own labels and boolean accessibility across PT-BR/en while preserving field data", async () => {
    const root = render({ launch_name: "Paperclip launch", enabled: true });
    expect(container.textContent).toContain("Fields");
    expect(container.textContent).toContain("Field names come from the skill schema; values are rendered by type.");
    expect(container.textContent).toContain("Paperclip launch");
    expect(container.querySelector('[aria-label="True"]')).not.toBeNull();

    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    expect(container.textContent).toContain("Campos");
    expect(container.textContent).toContain("Os nomes dos campos vêm do esquema da competência; os valores são exibidos conforme o tipo.");
    expect(container.textContent).toContain("Paperclip launch");
    expect(container.querySelector('[aria-label="Verdadeiro"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it.each([
    { locale: "en", copied: "Copied" },
    { locale: "pt-BR", copied: "Copiado" },
  ])("localizes compact value copy feedback in $locale", async ({ locale, copied }) => {
    await i18n.changeLanguage(locale);
    const root = createRoot(container);
    act(() => root.render(<CaseFieldValue value="release-note" variant="compact" />));
    const copyButton = container.querySelector("button");
    expect(copyButton).not.toBeNull();
    await reactAct(async () => {
      copyButton!.click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain(copied);
    expect(container.textContent).toContain("release-note");
    act(() => root.unmount());
  });

  it("renders all four generic value types per spec", () => {
    const root = render({
      slug: "hermes-agent-post",
      word_count: 1850,
      published: true,
      draft_only: false,
      tags: ["ai", "launch"],
      publish_url: "https://example.com/post",
      related_case: "PAP-C12",
      missing: null,
      config: { nested: "x" },
    });

    // string
    expect(container.textContent).toContain("hermes-agent-post");
    // number — locale grouped, tabular
    expect(container.textContent).toContain("1,850");
    // string[] — chips
    expect(container.textContent).toContain("ai");
    expect(container.textContent).toContain("launch");
    // url → external link
    const urlLink = [...container.querySelectorAll("a")].find(
      (a) => a.getAttribute("href") === "https://example.com/post",
    );
    expect(urlLink).toBeTruthy();
    expect(urlLink?.getAttribute("target")).toBe("_blank");
    // case identifier → case link chip
    const caseLink = [...container.querySelectorAll("a")].find(
      (a) => a.getAttribute("href") === "/PAP/cases/PAP-C12",
    );
    expect(caseLink).toBeTruthy();
    // boolean never renders raw "true"/"false"
    expect(container.textContent).not.toContain("true");
    expect(container.textContent).not.toContain("false");
    // null → em-dash present
    expect(container.textContent).toContain("—");
    // object fallback → pretty-printed mono JSON block
    expect(container.textContent).toContain('"nested": "x"');
    // key insertion order preserved (slug before word_count)
    const text = container.textContent ?? "";
    expect(text.indexOf("slug")).toBeLessThan(text.indexOf("word_count"));

    act(() => root.unmount());
  });
});
