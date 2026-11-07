// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineDetail as RoutineDetailData } from "@paperclipai/shared";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { ToastProvider } from "@/context/ToastContext";
import { i18n } from "@/i18n";
import { RoutineDetail } from "./RoutineDetail.production";

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-disposable",
    selectedCompany: { id: "company-disposable", issuePrefix: "TEST" },
  }),
}));

vi.mock("@/hooks/useManagedPluginResourceDisplayNames", () => ({
  useManagedPluginResourceDisplayName: (_companyId: string, _kind: string, resource?: { name: string } | null) =>
    resource?.name ?? null,
}));

vi.mock("../components/RoutineSubSidebar", () => ({
  RoutineSubSidebar: () => null,
  RoutineSectionPicker: () => null,
}));

vi.mock("../components/RoutineRunVariablesDialog", () => ({
  RoutineRunVariablesDialog: () => null,
}));

vi.mock("../components/MarkdownEditor", () => ({
  MarkdownEditor: () => null,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

type CapturedRequest = {
  path: string;
  method: string;
  body: unknown;
  locale: string | null;
};

const companyId = "company-disposable";
const routineId = "routine-disposable";
let routine: RoutineDetailData;
let requests: CapturedRequest[];
let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function disposableFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input), window.location.origin);
  const method = (init?.method ?? "GET").toUpperCase();
  const body = typeof init?.body === "string" ? JSON.parse(init.body) as unknown : init?.body ?? null;
  requests.push({
    path: `${url.pathname}${url.search}`,
    method,
    body,
    locale: new Headers(init?.headers).get("X-Paperclip-Communication-Locale"),
  });

  if (method === "POST" && url.pathname === `/api/routines/${routineId}/triggers`) {
    const inputBody = body as Record<string, unknown>;
    const trigger = {
      id: `trigger-disposable-${routine.triggers.length + 1}`,
      enabled: true,
      ...inputBody,
    };
    routine = { ...routine, triggers: [...routine.triggers, trigger] } as RoutineDetailData;
    return Promise.resolve(response({
      trigger,
      secretMaterial: inputBody.kind === "webhook"
        ? {
            webhookUrl: "https://paperclip.invalid/api/routine-triggers/disposable/fire",
            webhookSecret: "discardable-secret",
          }
        : null,
    }));
  }

  if (method === "GET") {
    if (url.pathname === `/api/routines/${routineId}`) return Promise.resolve(response(routine));
    if (url.pathname === `/api/routines/${routineId}/runs`) return Promise.resolve(response([]));
    if (url.pathname === `/api/companies/${companyId}/activity`) return Promise.resolve(response([]));
    if (url.pathname === `/api/companies/${companyId}/agents`) return Promise.resolve(response([]));
    if (url.pathname === `/api/companies/${companyId}/projects`) return Promise.resolve(response([]));
    if (url.pathname === `/api/companies/${companyId}/user-directory`) {
      return Promise.resolve(response({ users: [] }));
    }
    if (url.pathname === `/api/companies/${companyId}/secrets`) return Promise.resolve(response([]));
  }

  return Promise.reject(new Error(`Unexpected disposable test request: ${method} ${url.pathname}${url.search}`));
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent?.trim() === label);
}

async function clickButton(label: string) {
  const button = findButton(label);
  expect(button, `button not found: ${label}`).toBeTruthy();
  await act(async () => button!.click());
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  routine = {
    id: routineId,
    companyId,
    title: "Disposable routine",
    description: "",
    status: "paused",
    assigneeAgentId: null,
    projectId: null,
    priority: "medium",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
    activityGatePolicy: "always",
    activityGateScope: "company",
    variables: [],
    env: null,
    triggers: [],
  } as unknown as RoutineDetailData;
  requests = [];
  vi.stubGlobal("fetch", vi.fn(disposableFetch));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  container.remove();
  vi.unstubAllGlobals();
  await i18n.changeLanguage("en");
});

async function mount(locale: "en" | "pt-BR") {
  await i18n.changeLanguage(locale);
  await act(async () => root.render(
    <QueryClientProvider client={queryClient}>
      <BreadcrumbProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/routines/${routineId}/triggers`]}>
            <Routes>
              <Route path="/routines/:routineId/:section" element={<RoutineDetail />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </BreadcrumbProvider>
    </QueryClientProvider>,
  ));
  await vi.waitFor(() => {
    expect(container.querySelector("#routine-section-title")?.textContent)
      .toBe(locale === "en" ? "Triggers" : "Gatilhos");
  });
}

describe.each(["en", "pt-BR"] as const)("production trigger creation over the API (%s)", (locale) => {
  it("posts the schedule created from the production form with unchanged schedule data", async () => {
    await mount(locale);
    const add = locale === "en" ? "New trigger" : "Novo gatilho";
    const confirm = locale === "en" ? "Add trigger" : "Adicionar gatilho";
    await clickButton(add);
    await clickButton(confirm);

    await vi.waitFor(() => {
      expect(requests.some((request) => request.method === "POST" && request.path === `/api/routines/${routineId}/triggers`))
        .toBe(true);
    });

    const createRequest = requests.find((request) => request.method === "POST" && request.path === `/api/routines/${routineId}/triggers`);
    expect(createRequest?.body).toEqual({
      kind: "schedule",
      label: "schedule",
      cronExpression: "0 10 * * *",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    expect(createRequest?.locale).toBe(locale);
    await vi.waitFor(() => expect(findButton(add)).toBeTruthy());
    expect(routine.triggers).toHaveLength(1);
  });

  it("posts the webhook created from the production form with numeric replay data", async () => {
    await mount(locale);
    const add = locale === "en" ? "New trigger" : "Novo gatilho";
    const confirm = locale === "en" ? "Add trigger" : "Adicionar gatilho";
    await clickButton(add);

    const kindSelect = container.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]');
    expect(kindSelect).toBeTruthy();
    await act(async () => kindSelect!.click());
    await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(0));
    const webhookOption = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === "Webhook");
    expect(webhookOption).toBeTruthy();
    await act(async () => webhookOption!.click());
    await clickButton(confirm);

    await vi.waitFor(() => {
      expect(requests.some((request) => request.method === "POST" && request.path === `/api/routines/${routineId}/triggers`))
        .toBe(true);
    });

    const createRequest = requests.find((request) => request.method === "POST" && request.path === `/api/routines/${routineId}/triggers`);
    expect(createRequest?.body).toEqual({
      kind: "webhook",
      label: "webhook",
      signingMode: "bearer",
      replayWindowSec: 300,
    });
    expect(createRequest?.locale).toBe(locale);
    const secretLabel = locale === "en" ? "New webhook secret" : "Novo segredo do webhook";
    await vi.waitFor(() => {
      expect(container.querySelector<HTMLInputElement>(`input[aria-label="${secretLabel}"]`)?.value)
        .toBe("discardable-secret");
    });
    expect(routine.triggers).toHaveLength(1);
  });
});
