// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AdapterModel } from "@paperclipai/adapter-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { AdapterTypeDropdown, ModelDropdown } from "./AgentConfigForm";

const roots: Root[] = [];
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
});

afterEach(async () => {
  for (const root of roots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.innerHTML = "";
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

function renderOpenDropdown(
  models: AdapterModel[],
  { groupByProvider = false, preserveOrder = false }: { groupByProvider?: boolean; preserveOrder?: boolean } = {},
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => {
    root.render(
      <TooltipProvider>
        <ModelDropdown
          models={models}
          value=""
          onChange={() => {}}
          open
          onOpenChange={() => {}}
          allowDefault={false}
          required
          groupByProvider={groupByProvider}
          preserveOrder={preserveOrder}
        />
      </TooltipProvider>,
    );
  });
}

function shownModelIds(): string[] {
  return Array.from(document.body.querySelectorAll("span[title]")).map((span) => span.getAttribute("title") ?? "");
}

function renderAdapterDropdown() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => {
    root.render(
      <TooltipProvider>
        <AdapterTypeDropdown value="paperclip_runner" onChange={() => {}} disabledTypes={new Set()} />
      </TooltipProvider>,
    );
  });
}

const curated = [
  { id: "claude-fable-5-1", label: "Claude Fable 5.1" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
];

describe("ModelDropdown", () => {
  it("localizes searchable model controls and empty states in Brazilian Portuguese", () => {
    renderOpenDropdown([]);

    expect(document.body.textContent).toContain("Modelo");
    expect(document.body.querySelector('input[placeholder="Buscar modelos…"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Nenhum modelo encontrado.");
    expect(document.body.textContent).toContain("Selecione um modelo (obrigatório)");
  });

  it("uses English searchable model labels when English is selected", async () => {
    await i18n.changeLanguage("en");
    renderOpenDropdown([]);

    expect(document.body.textContent).toContain("Model");
    expect(document.body.querySelector('input[placeholder="Search models…"]')).toBeTruthy();
    expect(document.body.textContent).toContain("No models found.");
  });

  it("localizes adapter status labels while keeping product names intact", () => {
    renderAdapterDropdown();
    expect(document.body.textContent).toContain("Paperclip Runner");
    expect(document.body.textContent).toContain("Experimental");

    const trigger = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Paperclip Runner"))!;
    act(() => trigger.click());
    expect(document.body.textContent).toContain("Em breve");
  });

  it("provides the adapter status labels in English too", async () => {
    await i18n.changeLanguage("en");
    renderAdapterDropdown();
    expect(document.body.textContent).toContain("Experimental");

    const trigger = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Paperclip Runner"))!;
    act(() => trigger.click());
    expect(document.body.textContent).toContain("Coming soon");
  });

  it("keeps a hand-ordered list in the adapter's order when preserveOrder is set", () => {
    renderOpenDropdown(curated, { preserveOrder: true });

    expect(shownModelIds()).toEqual(curated.map((model) => model.id));
  });

  it("still sorts a discovered list by id by default", () => {
    renderOpenDropdown(curated);

    expect(shownModelIds()).toEqual(["claude-fable-5-1", "claude-haiku-4-5", "claude-opus-4-8", "claude-opus-5-5"]);
  });

  it("still sorts provider groups by id", () => {
    renderOpenDropdown(
      [
        { id: "openai/gpt-6-sol", label: "gpt-6-sol" },
        { id: "openai/gpt-6-astra", label: "gpt-6-astra" },
      ],
      { groupByProvider: true },
    );

    expect(shownModelIds()).toEqual(["openai/gpt-6-astra", "openai/gpt-6-sol"]);
  });
});
