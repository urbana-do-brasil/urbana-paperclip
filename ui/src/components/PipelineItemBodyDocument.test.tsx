// @vitest-environment jsdom

import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { i18n } from "@/i18n";
import { queryKeys } from "../lib/queryKeys";
import { PipelineItemBodyDocument } from "./PipelineItemBodyDocument";

vi.mock("../context/ToastContext", () => ({
  useToastActions: () => ({ pushToast: vi.fn() }),
}));

vi.mock("./MarkdownEditor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <textarea
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PipelineItemBodyDocument localization", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.pipelines.caseDocument("case-id", "body"), null);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes the empty body state, accessible section label, and editor controls in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PipelineItemBodyDocument
            caseId="case-id"
            legacySummary={null}
            hasLegacyLongFields={false}
            conversationIssueId={null}
            conversationIssue={null}
            locationHash=""
            onStartConversation={async () => null}
          />
        </QueryClientProvider>,
      );
    });

    const section = container.querySelector('[data-testid="pipeline-item-body-document"]');
    expect(section?.getAttribute("aria-label")).toBe("Corpo do item");
    expect(container.textContent).toContain("Documento do corpo do item");
    expect(container.textContent).toContain("Ainda não há corpo. Registre aqui os detalhes do item.");

    const addBody = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Adicionar corpo do item"),
    );
    expect(addBody).not.toBeNull();
    await act(async () => {
      addBody?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector('textarea[placeholder="Escreva o corpo do item em Markdown…"]')).not.toBeNull();
    expect(container.textContent).toContain("Salvar criará a revisão 1 · ⌘↵ para salvar · Esc para cancelar");
    expect(container.textContent).toContain("Cancelar");
    expect(container.textContent).toContain("Salvar");
  });
});
