import { test, expect, type BrowserContext, type Page } from "@playwright/test";

type Locale = "pt-BR" | "en";
type Organization = { id: string; name: string; issuePrefix: string };

const copy = {
  "pt-BR": {
    approvalsPending: "Não há aprovações pendentes.",
    approvalsAll: "Ainda não há aprovações.",
    approvalsAllTab: "Todas",
    membersHeading: "Membros da organização",
    editMember: "Editar",
    editMemberDialog: "Editar membro",
    instanceAccessDenied: "É necessário ter acesso de administração da instância para gerenciar usuários.",
    settingsHeading: "Geral",
    organizationName: "Nome da organização",
    organizationDescription: "Descrição",
    organizationLogo: "Logotipo",
    hiringApproval: "Exigir aprovação do conselho para novas admissões",
    secretsHeading: "Segredos",
    newSecret: "Novo segredo",
    createSecretDialog: "Criar segredo",
    secretValue: "Valor",
  },
  en: {
    approvalsPending: "No pending approvals.",
    approvalsAll: "No approvals yet.",
    approvalsAllTab: "All",
    membersHeading: "Organization Members",
    editMember: "Edit",
    editMemberDialog: "Edit member",
    instanceAccessDenied: "Instance admin access is required to manage users.",
    settingsHeading: "General",
    organizationName: "Organization name",
    organizationDescription: "Description",
    organizationLogo: "Logo",
    hiringApproval: "Require board approval for new hires",
    secretsHeading: "Secrets",
    newSecret: "New secret",
    createSecretDialog: "Create secret",
    secretValue: "Value",
  },
} satisfies Record<Locale, Record<string, string>>;

async function fulfillJson(page: Page, path: string | RegExp, data: unknown, status = 200) {
  const matcher = typeof path === "string" ? (path.startsWith("**") ? path : `**${path}`) : path;
  await page.route(matcher, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) }),
  );
}

async function installProductFixtures(page: Page, organization: Organization) {
  const company = (path: string) => `/api/companies/${organization.id}/${path}`;

  await fulfillJson(page, company("approvals"), []);
  await fulfillJson(page, company("members"), {
    members: [{
      id: "fixture-owner-membership",
      companyId: organization.id,
      principalType: "user",
      principalId: "fixture-board-user",
      status: "active",
      membershipRole: "owner",
      createdAt: "2026-01-10T12:00:00.000Z",
      updatedAt: "2026-01-10T12:00:00.000Z",
      user: {
        id: "fixture-board-user",
        email: "fixture-owner@example.test",
        name: "Fixture Board User",
        image: null,
      },
      grants: [],
    }],
    access: {
      currentUserRole: "owner",
      canManageMembers: true,
      canInviteUsers: true,
      canApproveJoinRequests: true,
    },
  });
  await fulfillJson(page, company("join-requests?status=pending_approval"), []);
  await fulfillJson(page, company("agents"), []);

  await fulfillJson(page, company("secrets"), []);
  await fulfillJson(page, company("user-secret-definitions"), []);
  await fulfillJson(page, company("me/user-secrets"), []);
  await fulfillJson(page, company("secret-providers"), []);
  await fulfillJson(page, company("secret-providers/health"), { providers: [] });
  await fulfillJson(page, company("secret-provider-configs"), []);
  await fulfillJson(page, company("secret-proposals?status=pending"), []);
  await fulfillJson(page, company("decision-model"), { canManage: false, settings: null, choices: [] });

  await fulfillJson(page, "**/api/admin/users**", { error: "Forbidden" }, 403);
}

async function assertNoHorizontalPageOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    main: document.querySelector("main")
      ? {
          width: document.querySelector("main")!.clientWidth,
          scrollWidth: document.querySelector("main")!.scrollWidth,
        }
      : null,
  }));
  expect(metrics.document, `document width ${metrics.document}px exceeds ${metrics.viewport}px`).toBeLessThanOrEqual(metrics.viewport + 1);
  if (metrics.main) {
    expect(metrics.main.scrollWidth, "main content should not introduce page-level horizontal overflow").toBeLessThanOrEqual(metrics.main.width + 1);
  }
}

const workflowAccount = {
  name: "Localization Browser Workflow",
  email: "localization-browser-workflow@example.test",
  password: "locale-browser-fixture-password",
};
let workflowOrganization: Organization;
let workflowBrowserContext: BrowserContext | undefined;

test.beforeAll(async ({ browser, baseURL }) => {
  const setupContext = await browser.newContext({ baseURL });
  const signup = await setupContext.request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL! },
    data: workflowAccount,
  });
  let organizations: Organization[];
  if (signup.status() === 200) {
    const organizationResponse = await setupContext.request.post("/__fixture/organizations");
    expect(organizationResponse.status()).toBe(200);
    organizations = await organizationResponse.json() as Organization[];
  } else {
    const signin = await setupContext.request.post("/api/auth/sign-in/email", {
      headers: { origin: baseURL! },
      data: { email: workflowAccount.email, password: workflowAccount.password },
    });
    expect(signin.status()).toBe(200);
    const existingOrganizations = await setupContext.request.get("/api/companies");
    expect(existingOrganizations.status()).toBe(200);
    organizations = await existingOrganizations.json() as Organization[];
    if (organizations.length === 0) {
      const organizationResponse = await setupContext.request.post("/__fixture/organizations");
      expect(organizationResponse.status()).toBe(200);
      organizations = await organizationResponse.json() as Organization[];
    }
  }
  workflowOrganization = organizations[0];
  expect(workflowOrganization).toBeTruthy();
  await setupContext.close();
});

test.afterEach(async () => {
  await workflowBrowserContext?.close();
  workflowBrowserContext = undefined;
});

const locales: Locale[] = ["pt-BR", "en"];
const colorSchemes = ["light", "dark"] as const;
const viewports = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
];

for (const locale of locales) {
  for (const colorScheme of colorSchemes) {
    for (const viewport of viewports) {
      const scenario = { locale, colorScheme, ...viewport };
      test(`${scenario.locale}: approvals, access, secrets and settings (${scenario.colorScheme}, ${scenario.name})`, async ({ browser, baseURL }) => {
        const context = await browser.newContext({ baseURL, locale: scenario.locale === "pt-BR" ? "pt-BR" : "en-US" });
        workflowBrowserContext = context;
        const signin = await context.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email: workflowAccount.email, password: workflowAccount.password },
        });
        expect(signin.status()).toBe(200);
        const organization = workflowOrganization;
        const preference = await context.request.put("/api/auth/locale-preference", {
          headers: { origin: baseURL! },
          data: { locale: scenario.locale },
        });
        expect(preference.status()).toBe(200);

        const page = await context.newPage();
        await page.setViewportSize(scenario.viewport);
        await page.emulateMedia({ colorScheme: scenario.colorScheme });
        const pageErrors: string[] = [];
        const externalRequests: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("request", (request) => {
          if (new URL(request.url()).origin !== new URL(baseURL!).origin) externalRequests.push(request.url());
        });
        await installProductFixtures(page, organization);

        const language = copy[scenario.locale];
        const basePath = `/${organization.issuePrefix}`;
        const screenshots = `/tmp/paperclip-localization-workflows-${scenario.locale}-${scenario.colorScheme}-${scenario.name}`;

        await page.goto(`${basePath}/approvals/pending`);
        await expect(page.locator("html")).toHaveAttribute("lang", scenario.locale);
        if (scenario.colorScheme === "dark") {
          await expect(page.locator("html")).toHaveClass(/\bdark\b/);
        } else {
          await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        }
        await expect(page.getByText(language.approvalsPending, { exact: true })).toBeVisible();
        const allApprovalsTab = page.getByRole("tab", { name: language.approvalsAllTab, exact: true });
        await allApprovalsTab.focus();
        await page.keyboard.press("Enter");
        await expect(allApprovalsTab).toHaveAttribute("aria-selected", "true");
        await expect(page.getByText(language.approvalsAll, { exact: true })).toBeVisible();
        await assertNoHorizontalPageOverflow(page);
        await page.screenshot({ path: `${screenshots}-approvals.png` });

        await page.goto(`${basePath}/company/settings/members`);
        await expect(page.getByRole("main").getByRole("heading", { name: language.membersHeading, exact: true })).toBeVisible();
        await expect(page.getByText("Fixture Board User", { exact: true })).toBeVisible();
        const editMember = page.getByRole("button", { name: language.editMember, exact: true }).first();
        await editMember.focus();
        await expect(editMember).toBeFocused();
        await page.keyboard.press("Enter");
        const editDialog = page.getByRole("dialog");
        await expect(editDialog.getByRole("heading", { name: language.editMemberDialog, exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(editDialog).toHaveCount(0);
        await assertNoHorizontalPageOverflow(page);
        await page.screenshot({ path: `${screenshots}-members.png` });

        await page.goto(`${basePath}/company/settings/instance/access`);
        await expect(page.getByText(language.instanceAccessDenied, { exact: true })).toBeVisible({ timeout: 20_000 });
        await assertNoHorizontalPageOverflow(page);
        await page.screenshot({ path: `${screenshots}-access-denied.png` });

        await page.goto(`${basePath}/company/settings/secrets`);
        await expect(page.getByRole("main").getByRole("heading", { name: language.secretsHeading, exact: true })).toBeVisible();
        const createSecret = page.getByRole("button", { name: language.newSecret, exact: true }).first();
        await createSecret.focus();
        await page.keyboard.press("Enter");
        const secretDialog = page.getByRole("dialog");
        await expect(secretDialog.getByRole("heading", { name: language.createSecretDialog, exact: true })).toBeVisible();
        const secretValue = secretDialog.getByLabel(language.secretValue, { exact: true });
        await secretValue.fill("fixture-only-secret-value");
        expect(await secretDialog.innerText()).not.toContain("fixture-only-secret-value");
        await page.keyboard.press("Escape");
        await expect(secretDialog).toHaveCount(0);
        await assertNoHorizontalPageOverflow(page);
        await page.screenshot({ path: `${screenshots}-secrets.png` });

        await page.goto(`${basePath}/company/settings`);
        await expect(page.getByRole("main").getByRole("heading", { name: language.settingsHeading, exact: true })).toBeVisible();
        await expect(page.getByRole("textbox", { name: language.organizationName, exact: true })).toBeVisible();
        await expect(page.getByRole("textbox", { name: language.organizationDescription, exact: true })).toBeVisible();
        await expect(page.getByLabel(language.organizationLogo, { exact: true })).toBeVisible();
        const hiringToggle = page.getByRole("switch", { name: language.hiringApproval, exact: true });
        await expect(hiringToggle).toBeVisible();
        await hiringToggle.focus();
        await expect(hiringToggle).toBeFocused();
        await assertNoHorizontalPageOverflow(page);
        await page.screenshot({ path: `${screenshots}-settings.png`, fullPage: true });

        expect(pageErrors).toEqual([]);
        expect(externalRequests).toEqual([]);
      });
    }
  }
}
