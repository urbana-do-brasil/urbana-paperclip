// @vitest-environment jsdom

import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineDetail, RoutineTrigger } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { RoutineTriggerCard } from "./RoutineTriggerCard";
import { ScheduleEditor } from "./ScheduleEditor";
import { TriggersSection } from "./routine-sections/editable-sections.production";
import { RoutineDetailContext, type RoutineDetailContextValue } from "./routine-sections/context";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

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
  await i18n.changeLanguage("en");
  container.remove();
});

async function render(node: ReactNode) {
  await act(async () => root.render(node));
}

describe("routine trigger editor localization", () => {
  it("localizes schedule presets, cron labels, and validation in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(<ScheduleEditor value="0 10 * * *" onChange={vi.fn()} />);

    expect(container.querySelector('[aria-label="Frequência do agendamento"]')?.textContent).toContain("Todos os dias");
    expect(container.textContent).toContain("às");

    await act(async () => root.render(<ScheduleEditor value="" onChange={vi.fn()} />));
    const frequency = container.querySelector<HTMLButtonElement>('[aria-label="Frequência do agendamento"]');
    expect(frequency).not.toBeNull();
    await act(async () => frequency!.click());
    const custom = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.includes("Personalizado (cron)"));
    expect(custom).toBeTruthy();
    await act(async () => custom!.click());
    expect(container.querySelector('[aria-label="Expressão cron"]')).not.toBeNull();
    expect(container.textContent).toContain("Informe uma expressão cron com 5 campos.");
  });

  it("localizes the production create form and existing trigger editor", async () => {
    await i18n.changeLanguage("pt-BR");
    const routine = {
      id: "routine-1",
      companyId: "company-1",
      title: "Daily report",
      status: "active",
      triggers: [],
    } as unknown as RoutineDetail;
    const context = {
      routine,
      newTrigger: { kind: "schedule", cronExpression: "0 10 * * *", signingMode: "bearer", replayWindowSec: "300" },
      setNewTrigger: vi.fn(),
      createTrigger: { isPending: false, mutate: vi.fn() },
      updateTrigger: { mutate: vi.fn() },
      deleteTrigger: { mutate: vi.fn() },
      rotateTrigger: { mutate: vi.fn() },
      secretMessage: null,
      copySecretValue: vi.fn(),
      setSecretMessage: vi.fn(),
    } as unknown as RoutineDetailContextValue;

    function Harness() {
      const [newTrigger, setNewTrigger] = useState(context.newTrigger);
      return <RoutineDetailContext.Provider value={{ ...context, newTrigger, setNewTrigger }}>
        <TriggersSection />
      </RoutineDetailContext.Provider>;
    }

    await render(<Harness />);
    const add = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.trim() === "Novo gatilho");
    expect(add).toBeTruthy();
    await act(async () => add!.click());
    expect(container.textContent).toContain("Tipo");
    expect(container.querySelector('[aria-label="Frequência do agendamento"]')).not.toBeNull();
    expect(container.textContent).toContain("Adicionar gatilho");

    const trigger = {
      id: "webhook-1",
      kind: "webhook",
      enabled: true,
      label: null,
      signingMode: "bearer",
      lastResult: "Created execution issue 123",
    } as unknown as RoutineTrigger;
    await act(async () => root.render(<RoutineTriggerCard
      trigger={trigger}
      onSave={vi.fn()}
      onRotate={vi.fn()}
      onDelete={vi.fn()}
    />));
    expect(container.textContent).toContain("Tarefa criada");
    expect(container.textContent).toContain("Excluir");
    expect(container.textContent).toContain("Salvar gatilho");
    expect(container.querySelector('[aria-label="Gatilho: Webhook"]')).not.toBeNull();
  });
});
