// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { act as reactAct } from "react";
import { createRoot } from "react-dom/client";
import type { AnchorHTMLAttributes } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseDocumentRevisions } from "@/api/cases";
import { i18n } from "@/i18n";
import { CaseRevisionRail } from "./CaseRevisionRail";

function act(callback: () => void) {
  flushSync(callback);
}

const mockCasesApi = vi.hoisted(() => ({ listRevisions: vi.fn() }));

vi.mock("@/api/cases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/cases")>()),
  casesApi: mockCasesApi,
}));
vi.mock("@/components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: string }) => <div data-testid="md">{children}</div>,
}));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let previousLanguage = "en";
beforeAll(() => { previousLanguage = i18n.language; });
afterAll(async () => { await i18n.changeLanguage(previousLanguage); });

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
}

const revisions: CaseDocumentRevisions = {
  key: "body",
  document: { id: "doc-1", title: "body", format: "markdown", latestRevisionId: "r2", latestRevisionNumber: 2 },
  revisions: [
    {
      id: "r2",
      revisionNumber: 2,
      title: "body",
      format: "markdown",
      body: "# Second version",
      changeSummary: "polish wording",
      createdAt: "2026-07-07T02:00:00.000Z",
      createdByAgentId: "agent-1",
      createdByUserId: null,
      createdByRunId: "run-2",
      actorAgentName: "Cases Agent",
      issue: { id: "i1", identifier: "PAP-42", title: "Task", status: "in_progress" },
    },
    {
      id: "r1",
      revisionNumber: 1,
      title: "body",
      format: "markdown",
      body: "# First version",
      changeSummary: null,
      createdAt: "2026-07-07T01:00:00.000Z",
      createdByAgentId: "agent-1",
      createdByUserId: null,
      createdByRunId: "run-1",
      actorAgentName: "Cases Agent",
      issue: null,
    },
  ],
};

describe("CaseRevisionRail", () => {
  let container: HTMLDivElement;
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    mockCasesApi.listRevisions.mockReset();
  });
  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  async function render() {
    const root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CaseRevisionRail caseIdentifier="PAP-C7" documentKey="body" />
        </QueryClientProvider>,
      );
    });
    await flush();
    return root;
  }

  it("renders both revisions and shows the latest body by default", async () => {
    mockCasesApi.listRevisions.mockResolvedValue(revisions);
    const root = await render();
    const text = container.textContent ?? "";
    expect(text).toContain("rev 2");
    expect(text).toContain("rev 1");
    expect(text).toContain("latest");
    expect(text).toContain("polish wording");
    expect(text).toContain("Cases Agent");
    // Latest (rev 2) selected → its body renders; via-issue attribution shown.
    expect(container.querySelector('[data-testid="md"]')?.textContent).toBe("# Second version");
    expect(container.querySelector('a[href="/issues/PAP-42"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it.each([
    { locale: "en", heading: "Revisions", latest: "latest", compare: "Compare", dialog: "Compare revisions for body", content: "Content" },
    { locale: "pt-BR", heading: "Revisões", latest: "mais recente", compare: "Comparar", dialog: "Comparar revisões de body", content: "Conteúdo" },
  ])("localizes revision history and comparison in $locale while preserving user content", async ({ locale, heading, latest, compare, dialog, content }) => {
    await i18n.changeLanguage(locale);
    mockCasesApi.listRevisions.mockResolvedValue(revisions);
    const root = await render();
    expect(container.textContent).toContain(heading);
    expect(container.textContent).toContain(latest);
    expect(container.textContent).toContain("polish wording");
    expect(container.textContent).toContain("Cases Agent");
    expect(container.textContent).toContain("# Second version");
    expect(container.querySelector('a[href="/issues/PAP-42"]')?.textContent).toBe("PAP-42");

    const compareButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === compare);
    expect(compareButton).toBeDefined();
    await reactAct(async () => {
      compareButton!.click();
      await flush();
    });
    expect(document.body.textContent).toContain(dialog);
    expect(document.body.textContent).toContain(content);
    expect(document.body.textContent).toContain("# First version");
    act(() => root.unmount());
  });

  it.each([
    { locale: "en", loading: "Loading revisions…", failed: "Could not load revisions.", empty: "No revisions yet." },
    { locale: "pt-BR", loading: "Carregando revisões…", failed: "Não foi possível carregar as revisões.", empty: "Ainda não há revisões." },
  ])("localizes loading, error, and empty revision states in $locale", async ({ locale, loading, failed, empty }) => {
    await i18n.changeLanguage(locale);
    mockCasesApi.listRevisions.mockReturnValue(new Promise(() => {}));
    let root = await render();
    expect(container.textContent).toContain(loading);
    act(() => root.unmount());

    mockCasesApi.listRevisions.mockRejectedValue(new Error("private server detail"));
    root = await render();
    expect(container.textContent).toContain(failed);
    expect(container.textContent).not.toContain("private server detail");
    act(() => root.unmount());

    mockCasesApi.listRevisions.mockResolvedValue({ ...revisions, revisions: [] });
    root = await render();
    expect(container.textContent).toContain(empty);
    act(() => root.unmount());
  });

  it("switches the rendered body when an older revision is picked", async () => {
    mockCasesApi.listRevisions.mockResolvedValue(revisions);
    const root = await render();
    const rev1Button = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("rev 1"),
    );
    expect(rev1Button).toBeTruthy();
    act(() => rev1Button!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(container.querySelector('[data-testid="md"]')?.textContent).toBe("# First version");
    act(() => root.unmount());
  });
});
