// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { RoutineDetailPlaceholder } from "./RoutineDetailPlaceholder";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("RoutineDetailPlaceholder", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes missing-organization and fallback load errors in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    await act(async () => root.render(<RoutineDetailPlaceholder reason="no-organization" />));
    expect(container.textContent).toContain("Selecione uma organização para ver as rotinas.");

    await act(async () => root.render(<RoutineDetailPlaceholder reason="load-error" />));
    expect(container.textContent).toContain("Não foi possível carregar esta rotina.");

    const serverError = new Error("server-owned detail");
    await act(async () => root.render(<RoutineDetailPlaceholder reason="load-error" error={serverError} />));
    expect(container.textContent).toContain("server-owned detail");
  });
});
