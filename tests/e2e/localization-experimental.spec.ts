import { randomUUID } from "node:crypto";
import { expect, request as playwrightRequest, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

/**
 * Real-server browser coverage for the experimental localization journeys.
 *
 * Unlike tests/localization-browser (which uses a disposable authenticated
 * fixture for the preference journey), this spec boots the shipped UI against
 * the throwaway e2e instance and exercises routines, pipelines, cases and
 * status cards with real API data. It also performs real trigger mutations
 * through the UI: create, label update, secret rotation and archive.
 */

const LOCALES = ["pt-BR", "en"] as const;
type Locale = (typeof LOCALES)[number];

const copy = {
  "pt-BR": {
    routines: "Rotinas",
    cases: "Casos",
    status: "Status",
    addTrigger: "Adicionar gatilho",
    newTrigger: "Novo gatilho",
    noTriggersStreamlined: "Execute esta rotina em um horário programado ou quando outro app enviar um webhook.",
    noTriggersProduction: "Ainda não há gatilhos",
    saveSecret: "Salve agora.",
    webhookUrl: "Nova URL do webhook",
    webhookSecret: "Novo segredo do webhook",
    done: "Concluído",
    triggerAria: "Gatilho: webhook",
    label: "Rótulo",
    saveTrigger: "Salvar gatilho",
    rotateSecret: "Trocar segredo",
    delete: "Excluir",
    removed: "foi removido.",
    undo: "Desfazer",
    enableTrigger: "Ativar gatilho",
    pauseTrigger: "Pausar gatilho",
    deletedToast: "Gatilho excluído",
    noStatusCards: "Ainda não há cartões de status",
  },
  en: {
    routines: "Routines",
    cases: "Cases",
    status: "Status",
    addTrigger: "Add trigger",
    newTrigger: "New trigger",
    noTriggersStreamlined: "Run this routine on a schedule or when another app sends a webhook.",
    noTriggersProduction: "No triggers yet",
    saveSecret: "Save this now.",
    webhookUrl: "New webhook URL",
    webhookSecret: "New webhook secret",
    done: "Done",
    triggerAria: "Trigger: webhook",
    label: "Label",
    saveTrigger: "Save trigger",
    rotateSecret: "Rotate secret",
    delete: "Delete",
    removed: "was removed.",
    undo: "Undo",
    enableTrigger: "Enable trigger",
    pauseTrigger: "Pause trigger",
    deletedToast: "Trigger deleted",
    noStatusCards: "No status cards yet",
  },
} satisfies Record<Locale, Record<string, string>>;

type Company = { id: string; issuePrefix: string };
type Routine = { id: string; title: string };
type Pipeline = { id: string; name: string };
type Case = { id: string; identifier: string; title: string };
type Trigger = { id: string; label: string | null; archived: boolean; webhookUrl: string | null };
type ExperimentalSettings = Record<string, boolean | undefined>;

let board: APIRequestContext;
let company: Company;
let routine: Routine;
let pipeline: Pipeline;
let caseRow: Case;
let originalSettings: ExperimentalSettings;

async function expectOk(response: Awaited<ReturnType<APIRequestContext["get"]>>, label: string) {
  if (!response.ok()) throw new Error(`${label} failed: ${response.status()} ${await response.text()}`);
  return response;
}

async function patchExperimental(data: ExperimentalSettings) {
  await expectOk(await board.patch("/api/instance/settings/experimental", { data }), "patch experimental settings");
}

async function newLocalePage(
  browser: Browser,
  baseURL: string,
  locale: Locale,
  viewport = { width: 1440, height: 1000 },
  colorScheme: "light" | "dark" = "light",
) {
  const context = await browser.newContext({
    baseURL,
    locale: locale === "pt-BR" ? "pt-BR" : "en-US",
    viewport,
    colorScheme,
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: "paperclip.locale.local", value: locale }] }],
    },
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { context, page, pageErrors };
}

async function expectNoOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(metrics.document, `document width ${metrics.document}px exceeds viewport ${metrics.viewport}px`).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function waitForPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[/?#])`), { timeout: 20_000 });
}

async function readTriggers(): Promise<Trigger[]> {
  const detail = await (await expectOk(await board.get(`/api/routines/${routine.id}`), "get routine")).json();
  return (detail.triggers ?? []) as Trigger[];
}

async function waitForTrigger(match: (trigger: Trigger) => boolean, label: string): Promise<Trigger> {
  let latest: Trigger[] = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    latest = await readTriggers();
    const found = latest.find(match);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not persist. Triggers: ${JSON.stringify(latest)}`);
}

async function waitForTriggerActivity(action: string, triggerId: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const events = await (await expectOk(
      await board.get(`/api/companies/${company.id}/activity?entityType=routine_trigger&entityId=${triggerId}&limit=50`),
      "get trigger activity",
    )).json() as Array<{ action?: string }>;
    if (events.some((event) => event.action === action)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`activity ${action} for trigger ${triggerId} did not persist`);
}

async function waitForRoutineTriggerActivity(action: string, triggerId: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const events = await (await expectOk(
      await board.get(`/api/companies/${company.id}/activity?entityType=routine&entityId=${routine.id}&limit=100`),
      "get routine activity",
    )).json() as Array<{ action?: string; details?: { triggerId?: string } }>;
    if (events.some((event) => event.action === action && event.details?.triggerId === triggerId)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`routine activity ${action} for trigger ${triggerId} did not persist`);
}

test.beforeAll(async ({ baseURL }) => {
  board = await playwrightRequest.newContext({ baseURL });
  originalSettings = await (await expectOk(await board.get("/api/instance/settings/experimental"), "read experimental settings")).json();
  await patchExperimental({
    enableStreamlinedUi: true,
    enablePipelines: true,
    enableCases: true,
    enableStatusCards: true,
    enableSummaries: true,
  });

  company = await (await expectOk(await board.post("/api/companies", {
    data: { name: `Localized Experimental ${Date.now()}` },
  }), "create company")).json();

  routine = await (await expectOk(await board.post(`/api/companies/${company.id}/routines`, {
    data: {
      title: "Rotina de localização E2E",
      description: "Descrição preservada da rotina de localização.",
      status: "active",
    },
  }), "create routine")).json();

  pipeline = await (await expectOk(await board.post(`/api/companies/${company.id}/pipelines`, {
    data: {
      key: `localization-${randomUUID().slice(0, 8)}`,
      name: "Pipeline de localização E2E",
      description: "Descrição preservada do pipeline.",
      stages: [
        { key: "drafting", name: "Drafting", kind: "working", position: 0 },
        { key: "published", name: "Published", kind: "done", position: 1 },
        { key: "dropped", name: "Dropped", kind: "cancelled", position: 2 },
      ],
    },
  }), "create pipeline")).json();

  caseRow = await (await expectOk(await board.post(`/api/companies/${company.id}/cases`, {
    data: {
      caseType: "general",
      title: "Caso de localização E2E",
      summary: "Resumo preservado do caso.",
      status: "in_progress",
    },
  }), "create case")).json();

});

test.afterAll(async () => {
  await patchExperimental(originalSettings).catch(() => undefined);
  await board?.dispose();
});

for (const shell of [
  { name: "streamlined", enableStreamlinedUi: true },
  { name: "production", enableStreamlinedUi: false },
] as const) {
  for (const locale of LOCALES) {
    test(`${locale} ${shell.name}: experimental collections and detail triggers stay localized with preserved data`, async ({ browser, baseURL }) => {
      await patchExperimental({
        enableStreamlinedUi: shell.enableStreamlinedUi,
        enablePipelines: true,
        enableCases: true,
        enableStatusCards: true,
        enableSummaries: true,
      });
      const labels = copy[locale];
      const { context, page, pageErrors } = await newLocalePage(browser, baseURL!, locale);
      try {
        const prefix = company.issuePrefix;

        await page.goto(`/${prefix}/routines`);
        await waitForPath(page, `/${prefix}/routines`);
        await expect(page.locator("#main-content").getByRole("heading", { name: labels.routines, exact: true })).toBeVisible();
        await expect(page.getByText(routine.title, { exact: true })).toBeVisible();
        await expectNoOverflow(page);

        await page.goto(`/${prefix}/routines/${routine.id}/triggers`);
        await waitForPath(page, `/${prefix}/routines/${routine.id}/triggers`);
        const emptyTriggers = shell.enableStreamlinedUi ? labels.noTriggersStreamlined : labels.noTriggersProduction;
        await expect(page.getByText(emptyTriggers, { exact: true })).toBeVisible();
        await expectNoOverflow(page);

        await page.goto(`/${prefix}/pipelines`);
        await waitForPath(page, `/${prefix}/pipelines`);
        await expect(page.locator("#main-content").getByRole("heading", { name: "Pipelines", exact: true })).toBeVisible();
        await expect(page.getByText(pipeline.name, { exact: true })).toBeVisible();
        await expectNoOverflow(page);

        await page.goto(`/${prefix}/cases`);
        await waitForPath(page, `/${prefix}/cases`);
        await expect(page.locator("#main-content").getByRole("heading", { name: labels.cases, exact: true })).toBeVisible();
        // The case row renders separate mobile/desktop spans with the same title.
        await expect(page.getByText(caseRow.title, { exact: true }).last()).toBeVisible();
        await expectNoOverflow(page);

        await page.goto(`/${prefix}/status-cards`);
        await waitForPath(page, `/${prefix}/status-cards`);
        await expect(page.locator("#main-content").getByRole("heading", { name: labels.status, exact: true })).toBeVisible();
        await expect(page.getByText(labels.noStatusCards, { exact: true })).toBeVisible();
        await expectNoOverflow(page);

        expect(pageErrors).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}

test("pt-BR production: real webhook trigger create, update, rotate and archive persist through the API", async ({ browser, baseURL }) => {
  await patchExperimental({ enableStreamlinedUi: false, enablePipelines: true, enableCases: true, enableStatusCards: true });
  const labels = copy["pt-BR"];
  const { context, page, pageErrors } = await newLocalePage(browser, baseURL!, "pt-BR");
  try {
    await page.goto(`/${company.issuePrefix}/routines/${routine.id}/triggers`);
    await waitForPath(page, `/${company.issuePrefix}/routines/${routine.id}/triggers`);
    await expect(page.getByText(labels.noTriggersProduction, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: labels.newTrigger, exact: true }).click();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Webhook", exact: true }).click();
    await page.getByRole("button", { name: labels.addTrigger, exact: true }).click();

    await expect(page.getByText(labels.saveSecret, { exact: false })).toBeVisible();
    const webhookUrl = await page.getByRole("textbox", { name: labels.webhookUrl, exact: true }).inputValue();
    const firstSecret = await page.getByRole("textbox", { name: labels.webhookSecret, exact: true }).inputValue();
    expect(webhookUrl).toMatch(/^https?:\/\/.+\/api\/routine-triggers\/public\/[^/]+\/fire$/);
    expect(firstSecret.length).toBeGreaterThan(10);
    await page.getByRole("button", { name: labels.done, exact: true }).click();

    const created = await waitForTrigger((trigger) => trigger.webhookUrl === webhookUrl && !trigger.archived, "created trigger");
    // The accessible name follows the label, so keep a stable locator across updates.
    const triggerForm = page.locator("#main-content form").first();
    await expect(triggerForm).toBeVisible();
    const editableLabel = triggerForm.locator("input:not([readonly])").first();
    await editableLabel.fill("Gatilho de localização E2E");
    await triggerForm.getByRole("button", { name: labels.saveTrigger, exact: true }).click();
    const updated = await waitForTrigger((trigger) => trigger.id === created.id && trigger.label === "Gatilho de localização E2E", "updated trigger label");
    expect(updated.webhookUrl).toBe(webhookUrl);

    await triggerForm.getByRole("button", { name: labels.rotateSecret, exact: true }).click();
    await expect(page.getByText(labels.saveSecret, { exact: false })).toBeVisible();
    const rotatedSecret = await page.getByRole("textbox", { name: labels.webhookSecret, exact: true }).inputValue();
    expect(rotatedSecret.length).toBeGreaterThan(10);
    expect(rotatedSecret).not.toBe(firstSecret);
    await page.getByRole("button", { name: labels.done, exact: true }).click();

    await triggerForm.getByRole("button", { name: labels.delete, exact: true }).click();
    await expect(page.getByText(labels.deletedToast, { exact: true })).toBeVisible();
    await expect(page.getByText(labels.noTriggersProduction, { exact: true })).toBeVisible();
    // The production shell has no inline undo. The archive is confirmed by the
    // real activity ledger, not only by the active list disappearing.
    await waitForTriggerActivity("routine.trigger_deleted", created.id);

    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("pt-BR streamlined: real webhook trigger remove and undo persist through the API", async ({ browser, baseURL }) => {
  await patchExperimental({ enableStreamlinedUi: true, enablePipelines: true, enableCases: true, enableStatusCards: true });
  const createdResponse = await (await expectOk(await board.post(`/api/routines/${routine.id}/triggers`, {
    data: { kind: "webhook", label: "Gatilho undo E2E" },
  }), "create undo trigger")).json();
  const triggerId = createdResponse.trigger.id as string;
  const { context, page, pageErrors } = await newLocalePage(browser, baseURL!, "pt-BR");
  try {
    await page.goto(`/${company.issuePrefix}/routines/${routine.id}/triggers`);
    await waitForPath(page, `/${company.issuePrefix}/routines/${routine.id}/triggers`);
    await expect(page.getByRole("region", { name: "Gatilho de Webhook", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Remover webhook", exact: true }).click();
    await expect(page.getByText("Webhook foi removido.", { exact: true })).toBeVisible();
    await waitForRoutineTriggerActivity("routine.trigger_removed", triggerId);

    await page.getByRole("button", { name: "Desfazer", exact: true }).click();
    await expect(page.getByRole("region", { name: "Gatilho de Webhook", exact: true })).toBeVisible();
    const restored = await waitForTrigger((trigger) => trigger.id === triggerId && !trigger.archived, "restored trigger");
    expect(restored.label).toBe("Gatilho undo E2E");
    await waitForRoutineTriggerActivity("routine.trigger_restored", triggerId);
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("pt-BR streamlined mobile dark: experimental collections stay localized and keyboard reachable", async ({ browser, baseURL }) => {
  await patchExperimental({ enableStreamlinedUi: true, enablePipelines: true, enableCases: true, enableStatusCards: true, enableSummaries: true });
  const { context, page, pageErrors } = await newLocalePage(browser, baseURL!, "pt-BR", { width: 390, height: 844 }, "dark");
  try {
    const prefix = company.issuePrefix;
    await page.goto(`/${prefix}/routines`);
    await waitForPath(page, `/${prefix}/routines`);
    await expect(page.locator("#main-content").getByRole("heading", { name: "Rotinas", exact: true })).toBeVisible();
    await expect(page.getByText(routine.title, { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    const skipLink = page.getByRole("link", { name: "Ir para o conteúdo principal" });
    await skipLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);

    await page.goto(`/${prefix}/pipelines`);
    await expect(page.locator("#main-content").getByRole("heading", { name: "Pipelines", exact: true })).toBeVisible();
    await expectNoOverflow(page);

    await page.goto(`/${prefix}/cases`);
    await expect(page.locator("#main-content").getByRole("heading", { name: "Casos", exact: true })).toBeVisible();
    await expectNoOverflow(page);

    await page.goto(`/${prefix}/status-cards`);
    await expect(page.locator("#main-content").getByRole("heading", { name: "Status", exact: true })).toBeVisible();
    await expectNoOverflow(page);

    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("pt-BR and en: plugin manager, settings and LLM Wiki host stay localized", async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  await patchExperimental({ enableStreamlinedUi: true });
  const pluginCopy = {
    "pt-BR": {
      manager: "Gerenciador de plugins",
      installed: "Plugins instalados",
      configuration: "Configuração",
      about: "Sobre",
      wikiSpaces: "Espaços compartilhados",
    },
    en: {
      manager: "Plugin Manager",
      installed: "Installed Plugins",
      configuration: "Configuration",
      about: "About",
      wikiSpaces: "Shared Spaces",
    },
  } satisfies Record<Locale, Record<string, string>>;
  for (const locale of LOCALES) {
    const labels = pluginCopy[locale];
    const { context, page, pageErrors } = await newLocalePage(browser, baseURL!, locale);
    try {
      const prefix = company.issuePrefix;

      await page.goto(`/${prefix}/company/settings/instance/plugins`);
      await expect(page.locator("#main-content").getByRole("heading", { name: labels.manager, exact: true })).toBeVisible();
      await expect(page.getByText(labels.installed, { exact: true })).toBeVisible();

      await page.goto(`/${prefix}/company/settings/instance/plugins`);
      const wikiRow = page.getByRole("listitem").filter({ hasText: "LLM Wiki" }).first();
      await expect(wikiRow).toBeVisible();
      const installButton = wikiRow.getByRole("button", { name: /Instalar|Install/ });
      if (await installButton.count()) await installButton.click();
      const settingsLink = wikiRow.getByRole("link", { name: /Abrir configurações|Revisar|Open Settings|Review/ });
      await expect(settingsLink).toBeVisible({ timeout: 90_000 });
      await settingsLink.click();
      await expect(page.getByRole("tab", { name: labels.configuration, exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("heading", { name: labels.about, exact: true })).toBeVisible();

      await page.goto(`/${prefix}/wiki`);
      await expect(page.getByText(labels.wikiSpaces, { exact: true })).toBeVisible({ timeout: 20_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("pt-BR and en: experimental flag off redirects collections to the dashboard and hides their navigation", async ({ browser, baseURL }) => {
  for (const locale of LOCALES) {
    await patchExperimental({
      enableStreamlinedUi: false,
      enablePipelines: false,
      enableCases: false,
      enableStatusCards: false,
    });
    const labels = copy[locale];
    const { context, page, pageErrors } = await newLocalePage(browser, baseURL!, locale);
    try {
      for (const route of [
        { path: "pipelines", nav: "Pipelines" },
        { path: "cases", nav: labels.cases },
        { path: "status-cards", nav: labels.status },
      ]) {
        await page.goto(`/${company.issuePrefix}/${route.path}`);
        await page.waitForURL(new RegExp(`/${company.issuePrefix}/dashboard(?:$|[/?#])`), { timeout: 20_000 });
        await expect(page.getByRole("navigation").getByRole("link", { name: route.nav, exact: true })).toHaveCount(0);
      }
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});
