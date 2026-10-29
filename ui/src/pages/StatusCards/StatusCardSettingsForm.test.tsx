// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";
import { StatusCardSettingsForm, defaultSettingsValue, type StatusCardSettingsValue } from "./StatusCardSettingsForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let previousLanguage = "en";

beforeAll(() => { previousLanguage = i18n.language; });
beforeEach(async () => { await act(async () => { await i18n.changeLanguage("en"); }); });
afterAll(async () => { await i18n.changeLanguage(previousLanguage); });

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(value: StatusCardSettingsValue, onChange: (next: StatusCardSettingsValue) => void = () => {}) {
  act(() =>
    root.render(
      <TooltipProvider>
        <StatusCardSettingsForm value={value} onChange={onChange} />
      </TooltipProvider>,
    ),
  );
}

describe("StatusCardSettingsForm cost preview", () => {
  it("renders a one-line manual estimate by default", () => {
    render(defaultSettingsValue());
    // The label + bare cost render inline; the descriptive detail moves to a
    // hover tooltip (portalled, only mounted while open) so it is not in the DOM.
    expect(container.textContent).toContain("Auto-update policy");
    expect(container.textContent).toContain("Manual only — updates when I press refresh");
    expect(container.textContent).toContain("Estimated cost");
    expect(container.textContent).toContain("4.5k tok");
    expect(container.textContent).not.toContain("per refresh");
  });

  it("shows the bare cost for an interval policy", () => {
    render({
      ...defaultSettingsValue(),
      refreshPolicy: { mode: "interval", intervalMinutes: 30, triggers: defaultSettingsValue().refreshPolicy.triggers },
    });
    // "updates/day" / "every 30 min" now live in the tooltip; only the cost shows inline.
    expect(container.textContent).toContain("Estimated cost");
    expect(container.textContent).toContain("tok");
    expect(container.textContent).not.toContain("updates/day");
  });

  it("localizes policy labels and trigger settings in English and Brazilian Portuguese", async () => {
    const settings: StatusCardSettingsValue = {
      refreshPolicy: {
        ...defaultSettingsValue().refreshPolicy,
        mode: "interval",
        intervalMinutes: 30,
        activeHours: { start: "08:00", end: "19:00", timezone: "America/Sao_Paulo" },
      },
    };

    render(settings);
    expect(container.textContent).toContain("On a schedule, only if something changed");
    expect(container.textContent).toContain("Estimated cost");

    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    render(settings);
    expect(container.textContent).toContain("Política de atualização automática");
    expect(container.textContent).toContain("Em intervalos, somente se algo tiver mudado");
    expect(container.textContent).toContain("Custo estimado");
    const advanced = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Avançado"));
    expect(advanced).toBeDefined();
    act(() => advanced!.click());
    expect(container.textContent).toContain("Contar como alteração");
    expect(container.textContent).toContain("Novo item corresponde à consulta");
    expect(container.textContent).toContain("Limite diário de tokens");
    expect(container.querySelector<HTMLInputElement>(`input[aria-label="${i18n.t("statusCards.settings.timezone")}"]`)?.value)
      .toBe("America/Sao_Paulo");
  });

  it("preserves timezone, cap and policy values in settings callbacks", () => {
    const value: StatusCardSettingsValue = {
      refreshPolicy: {
        ...defaultSettingsValue().refreshPolicy,
        mode: "interval",
        intervalMinutes: 30,
        dailyTokenCap: 12000,
        activeHours: { start: "07:30", end: "18:45", timezone: "America/Sao_Paulo" },
      },
    };
    const onChange = vi.fn();
    render(value, onChange);
    const advanced = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Advanced"));
    act(() => advanced!.click());

    const timezoneInput = container.querySelector<HTMLInputElement>(`input[aria-label="${i18n.t("statusCards.settings.timezone")}"]`)!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(timezoneInput, "America/Recife");
      timezoneInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenNthCalledWith(1, {
      ...value,
      refreshPolicy: {
        ...value.refreshPolicy,
        activeHours: { start: "07:30", end: "18:45", timezone: "America/Recife" },
      },
    });

    const capInput = container.querySelector<HTMLInputElement>(`input[aria-label="${i18n.t("statusCards.settings.dailyTokenCap")}"]`)!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(capInput, "9000");
      capInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      ...value,
      refreshPolicy: { ...value.refreshPolicy, dailyTokenCap: 9000 },
    });
  });

  it("emits the selected refresh mode with its default values and existing triggers", () => {
    const value = defaultSettingsValue();
    const onChange = vi.fn();
    render(value, onChange);
    const reactive = Array.from(container.querySelectorAll('[role="radio"]')).find((button) =>
      button.textContent?.includes("As soon as something changes"),
    );

    act(() => (reactive as HTMLButtonElement).click());

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      refreshPolicy: {
        ...value.refreshPolicy,
        mode: "reactive",
        debounceSeconds: 60,
        maxUpdatesPerHour: 6,
      },
    });
  });
});

describe("StatusCardSettingsForm advanced group", () => {
  it("hides the Advanced group in manual mode", () => {
    render(defaultSettingsValue());
    expect(container.textContent).not.toContain("Advanced");
    expect(container.textContent).not.toContain("Count as a change");
  });

  it("reveals the collapsed Advanced group when auto-updating", () => {
    render({
      ...defaultSettingsValue(),
      refreshPolicy: { mode: "interval", intervalMinutes: 30, triggers: defaultSettingsValue().refreshPolicy.triggers },
    });
    // The disclosure trigger is present; its contents stay collapsed until opened.
    expect(container.textContent).toContain("Advanced");
    expect(container.textContent).not.toContain("Count as a change");
  });
});
