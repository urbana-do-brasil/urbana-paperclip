// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelDropdown } from "./AgentConfigForm";
import { i18n } from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <TooltipProvider>
        <ModelDropdown
          models={[]}
          value=""
          onChange={vi.fn()}
          open={false}
          onOpenChange={vi.fn()}
          allowDefault={false}
          required={false}
          groupByProvider={false}
          loadingModels
          presentation="native"
        />
      </TooltipProvider>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await i18n.changeLanguage("en");
});

describe("ModelDropdown onboarding labels", () => {
  it("localizes the model field and loading state in Brazilian Portuguese", () => {
    expect(container.querySelector('[aria-label="Modelo"]')).toBeTruthy();
    expect(container.textContent).toContain("Modelo");
    expect(container.textContent).toContain("Carregando modelos…");
  });

  it("localizes the required model placeholder in Brazilian Portuguese", async () => {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <ModelDropdown
            models={[]}
            value=""
            onChange={vi.fn()}
            open={false}
            onOpenChange={vi.fn()}
            allowDefault={false}
            required
            groupByProvider={false}
            loadingModels={false}
            presentation="native"
          />
        </TooltipProvider>,
      );
    });
    expect(container.textContent).toContain("Selecione um modelo (obrigatório)");
  });
});
