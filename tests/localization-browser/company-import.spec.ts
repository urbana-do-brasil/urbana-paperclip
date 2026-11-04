import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createZipArchive } from "../../ui/src/lib/zip";

type Locale = "pt-BR" | "en";
type Organization = { id: string; name: string; issuePrefix: string };
type FeatureFlags = { enableNativeRunner: boolean; enableOpenAiDot: boolean };
type CapturedRequest = { contentType: string | undefined; body: string | null };

const localeCopy = {
  "pt-BR": {
    sourceTitle: "Fonte da importação",
    githubRepo: "Repositório do GitHub",
    localZip: "Arquivo ZIP local",
    chooseZip: "Escolher ZIP",
    zipHelp: "Envie um arquivo .zip exportado diretamente do Paperclip.",
    previewButton: "Pré-visualizar importação",
    previewTitle: "Pré-visualização da importação",
    packageFiles: "Arquivos do pacote",
    selectedFiles: "2 de 2 arquivos selecionados",
    conflictTitle: "Renomeações",
    confirmRename: "confirmar renomeação",
    confirmed: "confirmado",
    newOrganizationName: "Organização importada",
    importButton: "Importar 2 arquivos",
    importComplete: "Importação concluída",
    activateSelected: "Ativar seleção (2)",
    collapseAgents: "Recolher pasta agents",
    expandAgents: "Expandir pasta agents",
    dotOption: "OpenAI Dot (experimental)",
    target: "Destino",
    collisionStrategy: "Estratégia de conflito",
  },
  en: {
    sourceTitle: "Import source",
    githubRepo: "GitHub repo",
    localZip: "Local zip",
    chooseZip: "Choose zip",
    zipHelp: "Upload a .zip exported directly from Paperclip.",
    previewButton: "Preview import",
    previewTitle: "Import preview",
    packageFiles: "Package files",
    selectedFiles: "2 of 2 files selected",
    conflictTitle: "Renames",
    confirmRename: "confirm rename",
    confirmed: "confirmed",
    newOrganizationName: "Imported Organization",
    importButton: "Import 2 files",
    importComplete: "Import complete",
    activateSelected: "Activate selected (2)",
    collapseAgents: "Collapse folder agents",
    expandAgents: "Expand folder agents",
    dotOption: "OpenAI Dot (experimental)",
    target: "Target",
    collisionStrategy: "Collision strategy",
  },
} satisfies Record<Locale, Record<string, string>>;

const importUrl = "https://github.com/example/locale-company/tree/main/company";
const importedFiles = {
  ".paperclip.yaml": 'schema: "paperclip/v1"\n',
  "agents/coder/AGENTS.md": "# Browser Coder\n\nFixture instructions stay unchanged.\n",
};

function buildPreviewResponse() {
  return {
    include: { company: true, agents: true, projects: true, issues: true },
    targetCompanyId: null,
    targetCompanyName: null,
    collisionStrategy: "rename",
    selectedAgentSlugs: ["coder"],
    plan: {
      companyAction: "create",
      agentPlans: [{
        slug: "coder",
        action: "create",
        plannedName: "Browser Coder",
        existingAgentId: "fixture-collision-agent",
        reason: null,
      }],
      projectPlans: [],
      issuePlans: [],
    },
    manifest: {
      schemaVersion: 1,
      generatedAt: "2026-11-04T00:00:00.000Z",
      source: null,
      includes: { company: true, agents: true, projects: true, issues: true },
      company: null,
      sidebar: null,
      agents: [{ slug: "coder", name: "Browser Coder", path: "agents/coder/AGENTS.md", adapterType: "claude_local" }],
      skills: [],
      projects: [],
      issues: [],
      envInputs: [],
    },
    files: importedFiles,
    envInputs: [],
    warnings: ["Upstream preview note: fixture metadata v2 is preserved."],
    errors: [],
  };
}

function buildImportResult(companyId: string) {
  return {
    company: { id: companyId, name: "Locale Smoke Import", action: "created" },
    agents: [{ slug: "coder", id: "fixture-import-agent", action: "created", name: "Browser Coder", reason: null }],
    skills: [],
    projects: [],
    routines: [{ slug: "nightly", id: "fixture-import-routine", action: "created", title: "Nightly review", status: "paused" }],
    envInputs: [],
    warnings: [],
  };
}

async function installCompanyImportRoutes(
  page: Page,
  companyId: string,
  flags: { current: FeatureFlags },
  captures: { previews: CapturedRequest[]; applies: CapturedRequest[] },
) {
  await page.route("**/api/adapters", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([
      { type: "claude_local", label: "Claude Code", source: "builtin", modelsCount: 0, loaded: true, disabled: false, capabilities: {} },
      { type: "paperclip_runner", label: "Paperclip Runner", source: "builtin", modelsCount: 0, loaded: true, disabled: false, capabilities: {} },
    ]),
  }));
  await page.route("**/api/instance/settings/experimental", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ enableStreamlinedUi: true, ...flags.current }),
  }));
  await page.route("**/api/companies/import/preview", async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    captures.previews.push({ contentType: headers["content-type"], body: request.postData() });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(buildPreviewResponse()) });
  });
  await page.route(/\/api\/companies\/import\?async=1$/, async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    captures.applies.push({ contentType: headers["content-type"], body: request.postData() });
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job: { id: "company-import-browser-job", status: "running" }, statusUrl: "/companies/import/jobs/company-import-browser-job" }),
    });
  });
  await page.route("**/api/companies/import/jobs/company-import-browser-job", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ job: { id: "company-import-browser-job", status: "succeeded", importResult: buildImportResult(companyId) } }),
  }));
  await page.route("**/api/agents/fixture-import-agent/resume*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: "fixture-import-agent", status: "idle" }),
  }));
  await page.route("**/api/routines/fixture-import-routine", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: "fixture-import-routine", status: "active" }),
  }));
}

async function previewGithubSource(page: Page, copy: (typeof localeCopy)[Locale]) {
  await page.getByPlaceholder("https://github.com/owner/repo/tree/main/company").fill(importUrl);
  await page.getByRole("button", { name: copy.previewButton, exact: true }).click();
  // CompanyImport renders this compact preview title as visible status text,
  // not as a heading in the accessibility tree.
  await expect(page.getByText(copy.previewTitle, { exact: false })).toBeVisible();
}

const locales: Locale[] = ["pt-BR", "en"];

for (const locale of locales) {
  test(`CompanyImport source, accessible preview, and feature flags in ${locale}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, locale: locale === "pt-BR" ? "pt-BR" : "en-US" });
    const suffix = randomUUID();
    const account = {
      name: `Company Import ${locale} ${suffix}`,
      email: `company-import-${suffix}@example.test`,
      password: "locale-browser-fixture-password",
    };
    const signup = await context.request.post("/api/auth/sign-up/email", { headers: { origin: baseURL! }, data: account });
    expect(signup.status()).toBe(200);
    const organizationsResponse = await context.request.post("/__fixture/organizations");
    expect(organizationsResponse.status()).toBe(200);
    const organizations = await organizationsResponse.json() as Organization[];
    const organization = organizations[0]!;
    const preference = await context.request.put("/api/auth/locale-preference", { headers: { origin: baseURL! }, data: { locale } });
    expect(preference.status()).toBe(200);

    const page = await context.newPage();
    const pageErrors: string[] = [];
    const externalRequests: string[] = [];
    const flags = { current: { enableNativeRunner: false, enableOpenAiDot: false } };
    const captures = { previews: [] as CapturedRequest[], applies: [] as CapturedRequest[] };
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== new URL(baseURL!).origin) externalRequests.push(request.url());
    });
    await installCompanyImportRoutes(page, organization.id, flags, captures);

    const copy = localeCopy[locale];
    const companyPath = `/${organization.issuePrefix}/company/import`;
    await page.goto(companyPath);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { name: copy.sourceTitle, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.githubRepo, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.localZip, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.previewButton, exact: true })).toBeDisabled();

    await page.getByRole("button", { name: copy.localZip, exact: true }).click();
    await expect(page.getByText(copy.zipHelp, { exact: false })).toBeVisible();
    await page.getByRole("button", { name: copy.githubRepo, exact: true }).click();
    await expect(page.getByRole("textbox").nth(0)).toHaveAttribute("placeholder", "https://github.com/owner/repo/tree/main/company");
    await page.getByPlaceholder(copy.newOrganizationName).fill("Locale Smoke Import");

    await previewGithubSource(page, copy);
    await expect(page.getByRole("heading", { name: copy.packageFiles, exact: true })).toBeVisible();
    await expect(page.getByText(copy.selectedFiles, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: copy.conflictTitle, exact: true })).toBeVisible();
    await expect(page.getByText("Upstream preview note: fixture metadata v2 is preserved.", { exact: true })).toBeVisible();
    expect(captures.previews).toHaveLength(1);
    expect(captures.previews[0]!.contentType).toContain("application/json");
    expect(JSON.parse(captures.previews[0]!.body ?? "{}")).toMatchObject({
      source: { type: "github", url: importUrl },
      target: { mode: "new_company", newCompanyName: "Locale Smoke Import" },
      collisionStrategy: "rename",
    });

    const collapseAgents = page.getByRole("button", { name: copy.collapseAgents, exact: true });
    await collapseAgents.focus();
    await expect(collapseAgents).toBeFocused();
    await page.keyboard.press("Enter");
    const expandAgents = page.getByRole("button", { name: copy.expandAgents, exact: true });
    await expect(expandAgents).toBeVisible();
    await expandAgents.focus();
    await page.keyboard.press("Enter");
    await expect(collapseAgents).toBeVisible();

    const conflictName = page.getByRole("textbox").nth(2);
    await expect(conflictName).toHaveValue("company-Browser Coder");
    await conflictName.fill("Accessible Coder");
    const confirmRename = page.getByRole("button", { name: copy.confirmRename, exact: true });
    await confirmRename.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: copy.confirmed, exact: true })).toBeVisible();

    const adapterSelect = page.locator("select").filter({ has: page.locator('option[value="claude_local"]') }).first();
    await expect(adapterSelect.locator('option[value="paperclip_runner"]')).toHaveCount(0);
    await expect(adapterSelect.locator('option[value="openai_dot"]')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${locale}-company-import-preview.png`), fullPage: true });

    flags.current = { enableNativeRunner: true, enableOpenAiDot: false };
    await page.reload();
    await previewGithubSource(page, copy);
    const nativeRunnerSelect = page.locator("select").filter({ has: page.locator('option[value="claude_local"]') }).first();
    await expect(nativeRunnerSelect.locator('option[value="paperclip_runner"]')).toHaveCount(1);
    await expect(nativeRunnerSelect.locator('option[value="openai_dot"]')).toHaveCount(0);

    flags.current = { enableNativeRunner: false, enableOpenAiDot: true };
    await page.reload();
    await previewGithubSource(page, copy);
    const dotOnlySelect = page.locator("select").filter({ has: page.locator('option[value="claude_local"]') }).first();
    await expect(dotOnlySelect.locator('option[value="paperclip_runner"]')).toHaveCount(0);
    await expect(dotOnlySelect.locator('option[value="openai_dot"]')).toHaveText(copy.dotOption);

    await page.getByRole("button", { name: copy.localZip, exact: true }).click();
    const zipBytes = createZipArchive(importedFiles, "browser-export");
    await page.locator('input[type="file"]').setInputFiles({
      name: "browser-export.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(zipBytes),
    });
    await expect(page.getByText("browser-export.zip", { exact: false })).toBeVisible();
    await page.getByPlaceholder(copy.newOrganizationName).fill("Local Smoke Import");
    await page.getByRole("button", { name: copy.previewButton, exact: true }).click();
    await expect(page.getByText(copy.previewTitle, { exact: false })).toBeVisible();
    await expect(page.getByText(copy.selectedFiles, { exact: true })).toBeVisible();
    expect(captures.previews).toHaveLength(4);
    expect(captures.previews[3]!.contentType).toContain("multipart/form-data");
    expect(captures.previews[3]!.body).toContain("browser-export.zip");
    expect(captures.previews[3]!.body).toContain("agents/coder/AGENTS.md");
    expect(captures.previews[3]!.body).toContain("Fixture instructions stay unchanged.");

    await page.getByRole("button", { name: copy.importButton, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.importComplete, exact: true })).toBeVisible();
    expect(captures.applies).toHaveLength(1);
    expect(captures.applies[0]!.contentType).toContain("multipart/form-data");
    expect(captures.applies[0]!.body).toContain("browser-export.zip");
    expect(captures.applies[0]!.body).toContain("Fixture instructions stay unchanged.");

    await page.getByRole("button", { name: copy.activateSelected, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(locale === "pt-BR" ? "ativado" : "activated", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: locale === "pt-BR" ? "Ir ao painel" : "Go to dashboard", exact: true })).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
    await context.close();
  });
}
