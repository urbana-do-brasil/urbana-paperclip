// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { HermesGatewayConfigFields } from "./config-fields";
import type { AdapterConfigFieldsProps } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function renderFields(overrides: Partial<AdapterConfigFieldsProps> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const mark = vi.fn();
  const set = vi.fn();
  const props: AdapterConfigFieldsProps = {
    mode: "edit",
    isCreate: false,
    adapterType: "hermes_gateway",
    values: null,
    set: null,
    config: {},
    eff: (_group, _field, original) => original,
    mark,
    models: [],
    ...overrides,
  };

  act(() => {
    root.render(
      <TooltipProvider>
        <HermesGatewayConfigFields {...props} />
      </TooltipProvider>,
    );
  });

  return { container, root, mark, set };
}

describe("HermesGatewayConfigFields", () => {
  const roots: Root[] = [];

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      act(() => root.unmount());
    }
    document.body.innerHTML = "";
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("shows gateway fields in English while preserving saved values", async () => {
    await i18n.changeLanguage("en");
    const result = renderFields({
      config: {
        apiBaseUrl: "http://127.0.0.1:8642",
        apiKey: { type: "secret_ref", secretId: "11111111-1111-4111-8111-111111111111", version: "latest" },
        paperclipApiUrl: "http://127.0.0.1:3100",
        sessionKeyStrategy: "issue",
      },
    });
    roots.push(result.root);

    const text = result.container.textContent ?? "";
    expect(text).toContain("API base URL");
    expect(text).toContain("API key");
    expect(text).toContain("Paperclip API URL");
    expect(text).toContain("Session key strategy");
    expect(text).toContain("Timeout seconds");
    expect(text).toContain("Event reconnect ms");
    expect(text).toContain("Dangerously allow remote HTTP");
    expect(text).toContain("Extra headers");
    expect(text).toContain("Instructions");

    const urlInput = result.container.querySelector<HTMLInputElement>('input[value="http://127.0.0.1:8642"]');
    expect(urlInput).toBeTruthy();

    const apiKeyInput = Array.from(result.container.querySelectorAll<HTMLInputElement>('input[type="password"]'))
      .find((input) => input.placeholder.includes("Stored secret"));
    expect(apiKeyInput).toBeTruthy();

    expect(result.container.querySelector('button[aria-label="Show API key"]')).toBeTruthy();
    expect(result.container.querySelector<HTMLSelectElement>("select")?.value).toBe("issue");
  });

  it("shows Portuguese labels and keeps the configured session strategy", async () => {
    await i18n.changeLanguage("pt-BR");
    const result = renderFields({ config: { sessionKeyStrategy: "issue" } });
    roots.push(result.root);

    const text = result.container.textContent ?? "";
    expect(text).toContain("URL base da API");
    expect(text).toContain("Chave de API");
    expect(text).toContain("Estratégia da chave de sessão");
    expect(text).toContain("Permitir HTTP remoto (inseguro)");
    expect(result.container.querySelector<HTMLSelectElement>("select")?.value).toBe("issue");
    expect(result.container.querySelector('button[aria-label="Mostrar Chave de API"]')).toBeTruthy();
  });
});
