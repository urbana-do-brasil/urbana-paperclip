import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, expect, type Browser, type Page } from "@playwright/test";
import { closeRegisteredClients, createDb, heartbeatRuns } from "../../packages/db/src/index.ts";

const BASE = process.env.PAPERCLIP_E2E_BASE_URL ?? "http://127.0.0.1:3105";
const DATA_DIR = process.env.PAPERCLIP_E2E_DATA_DIR ?? process.env.PAPERCLIP_HOME;
const CONFIG_PATH = process.env.PAPERCLIP_E2E_CONFIG_PATH ?? path.resolve(process.cwd(), ".paperclip/config.json");
const FIXTURE_ROOT = process.env.PAPERCLIP_E2E_FIXTURE_ROOT;
const BOOTSTRAP_SCRIPT_PATH = path.resolve(process.cwd(), "packages/db/scripts/create-auth-bootstrap-invite.ts");
const OWNER_PASSWORD = "paperclip-owner-password";
const INVITED_PASSWORD = "paperclip-invited-password";

type HumanUser = {
  name: string;
  email: string;
  password: string;
};

type CompanySummary = {
  id: string;
  name: string;
  issuePrefix?: string | null;
};

type CompanyMember = {
  id: string;
  membershipRole: "owner" | "admin" | "operator" | "viewer";
  status: "pending" | "active" | "suspended";
  user: { id: string; email: string | null; name: string | null } | null;
};

type SessionJsonResponse<T> = {
  ok: boolean;
  status: number;
  text: string;
  json: T | null;
};

function isPathWithin(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === "" || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

function assertDisposableStructuredInteractionFixture() {
  const configuredDataDir = process.env.PAPERCLIP_E2E_DATA_DIR;
  const configuredConfigPath = process.env.PAPERCLIP_E2E_CONFIG_PATH;
  if (process.env.DATABASE_URL || process.env.PAPERCLIP_DATABASE_URL) {
    throw new Error("Structured interaction browser coverage refuses inherited external database URLs");
  }
  if (!FIXTURE_ROOT || !configuredDataDir || !configuredConfigPath) {
    throw new Error(
      "Structured interaction browser coverage requires explicit PAPERCLIP_E2E_FIXTURE_ROOT, PAPERCLIP_E2E_DATA_DIR, and PAPERCLIP_E2E_CONFIG_PATH fixture paths",
    );
  }

  const tempRoot = realpathSync(tmpdir());
  const fixtureRoot = realpathSync(FIXTURE_ROOT);
  if (
    !isPathWithin(tempRoot, fixtureRoot) ||
    !/^paperclip-structured-locale-audit\.[A-Za-z0-9]+$/.test(path.basename(fixtureRoot))
  ) {
    throw new Error("Structured interaction browser fixture must live in its generated temporary root");
  }

  const markerPath = path.join(fixtureRoot, ".paperclip-structured-interactions-fixture");
  if (
    !existsSync(markerPath) ||
    readFileSync(markerPath, "utf8") !== "paperclip-structured-interactions-fixture-v1\n"
  ) {
    throw new Error("Structured interaction browser fixture marker is missing or invalid");
  }

  const dataDir = realpathSync(configuredDataDir);
  const configPath = realpathSync(configuredConfigPath);
  if (
    !isPathWithin(fixtureRoot, dataDir) ||
    !isPathWithin(fixtureRoot, configPath) ||
    !isPathWithin(dataDir, configPath)
  ) {
    throw new Error("Structured interaction browser config and data must be inside the temporary fixture data directory");
  }

  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    database?: { mode?: string; embeddedPostgresDataDir?: string };
    server?: { deploymentMode?: string; host?: string; port?: number };
  };
  const embeddedPostgresDataDir = config.database?.embeddedPostgresDataDir;
  if (
    config.database?.mode !== "embedded-postgres" ||
    !embeddedPostgresDataDir ||
    !path.isAbsolute(embeddedPostgresDataDir) ||
    !isPathWithin(fixtureRoot, realpathSync(embeddedPostgresDataDir)) ||
    !isPathWithin(dataDir, realpathSync(embeddedPostgresDataDir))
  ) {
    throw new Error("Structured interaction browser fixture must use only its embedded temporary PostgreSQL database");
  }

  const baseUrl = new URL(BASE);
  const loopbackHost = baseUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const configuredServerHost = config.server?.host?.replace(/^\[|\]$/g, "").toLowerCase();
  const effectivePort = Number(baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80"));
  if (
    config.server?.deploymentMode !== "authenticated" ||
    !["localhost", "127.0.0.1", "::1"].includes(loopbackHost) ||
    !configuredServerHost ||
    !["localhost", "127.0.0.1", "::1"].includes(configuredServerHost) ||
    baseUrl.protocol !== "http:" ||
    baseUrl.username !== "" ||
    baseUrl.password !== "" ||
    (config.server.port !== undefined && config.server.port !== effectivePort)
  ) {
    throw new Error("Structured interaction browser fixture endpoint must be its authenticated loopback server");
  }

  return { config, embeddedPostgresDataDir: realpathSync(embeddedPostgresDataDir) };
}

const runId = Date.now();
const companyName = `MU-Auth-${runId}`;
const ownerUser: HumanUser = {
  name: "Owner User",
  email: `owner-${runId}@paperclip.local`,
  password: OWNER_PASSWORD,
};
const invitedUser: HumanUser = {
  name: "Invited User",
  email: `invitee-${runId}@paperclip.local`,
  password: INVITED_PASSWORD,
};

function createBootstrapInvite() {
  if (!DATA_DIR) {
    throw new Error("PAPERCLIP_E2E_DATA_DIR or PAPERCLIP_HOME is required for authenticated bootstrap tests");
  }
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Authenticated bootstrap config not found at ${CONFIG_PATH}`);
  }
  if (!existsSync(BOOTSTRAP_SCRIPT_PATH)) {
    throw new Error(`Authenticated bootstrap helper not found at ${BOOTSTRAP_SCRIPT_PATH}`);
  }

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  return execFileSync(
    pnpmCommand,
    [
      "--filter",
      "@paperclipai/db",
      "exec",
      "tsx",
      BOOTSTRAP_SCRIPT_PATH,
      "--config",
      CONFIG_PATH,
      "--base-url",
      BASE,
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        PAPERCLIP_HOME: DATA_DIR,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  ).trim();
}

async function signUp(page: Page, user: HumanUser) {
  await page.goto(`${BASE}/auth`);
  await expect(page.getByRole("heading", { name: "Sign in to Paperclip" })).toBeVisible();
  await page.getByRole("button", { name: "Create one" }).click();
  await expect(page.getByRole("heading", { name: "Create your Paperclip account" })).toBeVisible();
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
}

async function chooseEnglishForUnauthenticatedBrowser(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByRole("combobox").selectOption("en");
}

async function acceptBootstrapInvite(page: Page, inviteUrl: string) {
  await page.goto(inviteUrl);
  await expect(page.getByRole("heading", { name: "Bootstrap your Paperclip instance" })).toBeVisible();
  await page.getByRole("button", { name: "Accept bootstrap invite" }).click();
  await expect(page.getByRole("heading", { name: "Bootstrap complete" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("link", { name: "Open board" }).click();
}

async function createCompanyForSession(page: Page, nextCompanyName: string) {
  const createRes = await sessionJsonRequest<CompanySummary>(page, `${BASE}/api/companies`, {
    method: "POST",
    data: { name: nextCompanyName },
  });
  expect(createRes.ok).toBe(true);
  expect(createRes.json).toBeTruthy();
  return createRes.json!;
}

async function createAuthenticatedInvite(page: Page, companyPrefix: string) {
  await page.goto(`${BASE}/${companyPrefix}/company/settings`);
  await expect(page.getByTestId("company-settings-invites-section")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("company-settings-human-invite-role").selectOption("operator");
  await page.getByTestId("company-settings-create-human-invite").click();
  const inviteField = page.getByTestId("company-settings-human-invite-url");
  await expect(inviteField).toBeVisible({ timeout: 20_000 });
  return (await inviteField.inputValue()).trim();
}

async function signUpFromInvite(page: Page, inviteUrl: string, user: HumanUser) {
  await page.goto(inviteUrl);
  await expect(page.getByText("Sign in or create an account before submitting a human join request.")).toBeVisible();
  await page.getByRole("link", { name: "Sign in / Create account" }).click();
  await expect(page).toHaveURL(/\/auth\?next=/);
  await expect(page.getByRole("heading", { name: "Sign in to Paperclip" })).toBeVisible();
  await page.getByRole("button", { name: "Create one" }).click();
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(new RegExp(`/invite/[^/]+$`), { timeout: 20_000 });
}

async function acceptHumanInvite(page: Page) {
  await expect(page.getByRole("button", { name: "Join company" })).toBeEnabled();
  await page.getByRole("button", { name: "Join company" }).click();
  await expect(page.getByRole("heading", { name: "You joined the company" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("link", { name: "Open board" }).click();
}

async function sessionJsonRequest<T>(
  page: Page,
  url: string,
  options: {
    method?: string;
    data?: unknown;
  } = {}
) {
  return page.evaluate(
    async ({ url: targetUrl, method, data }) => {
      const response = await fetch(targetUrl, {
        method,
        credentials: "include",
        headers: data === undefined ? undefined : { "Content-Type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const text = await response.text();
      let json: unknown = null;
      if (text.length > 0) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      return {
        ok: response.ok,
        status: response.status,
        text,
        json,
      };
    },
    {
      url,
      method: options.method ?? "GET",
      data: options.data,
    }
  ) as Promise<SessionJsonResponse<T>>;
}

async function waitForMember(page: Page, companyId: string, email: string) {
  let member: CompanyMember | null = null;
  await expect
    .poll(
      async () => {
        const membersRes = await sessionJsonRequest<{ members: CompanyMember[] }>(
          page,
          `${BASE}/api/companies/${companyId}/members`
        );
        expect(membersRes.ok).toBe(true);
        const body = membersRes.json;
        if (!body) return null;
        member = body.members.find((entry) => entry.user?.email === email) ?? null;
        return member;
      },
      {
        timeout: 20_000,
        intervals: [500, 1_000, 2_000],
      }
    )
    .toMatchObject({
      status: "active",
      membershipRole: "operator",
      user: { email },
    });
  return member!;
}

async function waitForMemberRole(
  page: Page,
  companyId: string,
  memberId: string,
  membershipRole: CompanyMember["membershipRole"]
) {
  await expect
    .poll(
      async () => {
        const membersRes = await sessionJsonRequest<{ members: CompanyMember[] }>(
          page,
          `${BASE}/api/companies/${companyId}/members`
        );
        expect(membersRes.ok).toBe(true);
        const body = membersRes.json;
        if (!body) return null;
        return body.members.find((member) => member.id === memberId) ?? null;
      },
      {
        timeout: 20_000,
        intervals: [500, 1_000, 2_000],
      }
    )
    .toMatchObject({
      id: memberId,
      membershipRole,
    });
}

async function newPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test.describe("Multi-user: authenticated mode", () => {
  test("authenticated humans can bootstrap, invite, join, and respect viewer restrictions", async ({
    browser,
    page,
  }) => {
    test.setTimeout(180_000);

    const healthRes = await page.request.get(`${BASE}/api/health`);
    expect(healthRes.ok()).toBe(true);
    const health = (await healthRes.json()) as {
      deploymentMode?: string;
      bootstrapStatus?: string;
    };
    expect(health.deploymentMode).toBe("authenticated");

    await signUp(page, ownerUser);
    await acceptBootstrapInvite(page, createBootstrapInvite());

    const company = await createCompanyForSession(page, companyName);
    const companyPrefix = company.issuePrefix ?? company.id;
    await page.goto(`${BASE}/${companyPrefix}/dashboard`);
    await expect(page.getByTestId("layout-account-menu-trigger")).toContainText(ownerUser.name);
    await page.getByTestId("layout-account-menu-trigger").click();
    await expect(page.getByText(ownerUser.email)).toBeVisible();
    const inviteUrl = await createAuthenticatedInvite(page, companyPrefix);

    const invited = await newPage(browser);
    try {
      await signUpFromInvite(invited.page, inviteUrl, invitedUser);
      await acceptHumanInvite(invited.page);
      await expect(invited.page).not.toHaveURL(/\/auth/, { timeout: 10_000 });

      const joinedMember = await waitForMember(page, company.id, invitedUser.email);

      await page.goto(`${BASE}/${companyPrefix}/company/settings`);
      const roleSelect = page.getByTestId(`company-settings-member-role-${joinedMember.id}`);
      await expect(roleSelect).toBeVisible({ timeout: 20_000 });
      await roleSelect.selectOption("viewer");
      await expect(roleSelect).toHaveValue("viewer");
      await waitForMemberRole(page, company.id, joinedMember.id, "viewer");

      await invited.page.goto(`${BASE}/${companyPrefix}/company/settings`);
      await expect(
        invited.page.getByText("Your current company role cannot create human invites.")
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        invited.page.getByTestId("company-settings-create-human-invite")
      ).toHaveCount(0);

      const forbiddenInviteRes = await sessionJsonRequest(
        invited.page,
        `${BASE}/api/companies/${company.id}/invites`,
        {
          method: "POST",
          data: {
            allowedJoinTypes: "human",
            humanRole: "viewer",
          },
        }
      );
      expect(forbiddenInviteRes.status).toBe(403);
    } finally {
      await invited.context.close();
    }
  });

  test("shared structured questions use each account locale and preserve the original history", async ({
    browser,
    page,
  }) => {
    test.setTimeout(180_000);
    test.skip(
      process.env.PAPERCLIP_E2E_STRUCTURED_INTERACTIONS !== "1",
      "Requires an explicit disposable fixture; set PAPERCLIP_E2E_STRUCTURED_INTERACTIONS=1 with the fixture paths",
    );
    const disposableFixture = assertDisposableStructuredInteractionFixture();
    const suffix = `structured-${runId}`;
    const requester = { ...ownerUser, email: `${suffix}-requester@paperclip.local` };
    const responder = { ...invitedUser, email: `${suffix}-responder@paperclip.local` };
    expect((await (await page.request.get(`${BASE}/api/health`)).json()).deploymentMode).toBe("authenticated");

    await chooseEnglishForUnauthenticatedBrowser(page);
    await signUp(page, requester);
    const requesterEnglishPreference = await sessionJsonRequest(page, `${BASE}/api/auth/locale-preference`, {
      method: "PUT",
      data: { locale: "en" },
    });
    expect(requesterEnglishPreference.ok).toBe(true);
    await page.reload();
    const bootstrapInviteUrl = createBootstrapInvite();
    const bootstrapToken = new URL(bootstrapInviteUrl).pathname.split("/").at(-1);
    expect(bootstrapToken).toBeTruthy();
    const bootstrapAcceptance = await sessionJsonRequest(page, `${BASE}/api/invites/${bootstrapToken}/accept`, {
      method: "POST",
      data: { requestType: "human" },
    });
    expect(bootstrapAcceptance.status).toBe(202);
    await page.goto("/");
    const company = await createCompanyForSession(page, `Shared question ${suffix}`);
    const companyPrefix = company.issuePrefix ?? company.id;

    const ptPreference = await sessionJsonRequest(page, `${BASE}/api/auth/locale-preference`, {
      method: "PUT",
      data: { locale: "pt-BR" },
    });
    expect(ptPreference.ok).toBe(true);
    await page.reload();

    const agentResponse = await sessionJsonRequest<{ id: string }>(page, `${BASE}/api/companies/${company.id}/agents`, {
      method: "POST",
      data: {
        name: `No-model question fixture ${suffix}`,
        role: "engineer",
        adapterType: "process",
        adapterConfig: { command: process.execPath, args: ["-e", "process.exit(0)"] },
        runtimeConfig: { heartbeat: { enabled: false, wakeOnDemand: false } },
      },
    });
    expect(agentResponse.ok).toBe(true);
    const issueResponse = await sessionJsonRequest<{
      id: string;
      identifier: string;
      responsibleUserId: string | null;
    }>(page, `${BASE}/api/companies/${company.id}/issues`, {
      method: "POST",
      data: {
        title: `Shared language history ${suffix}`,
        status: "todo",
        assigneeAgentId: agentResponse.json!.id,
      },
    });
    expect(issueResponse.ok).toBe(true);
    const issue = issueResponse.json!;
    const originalComment = "Original requester note: preserve HTTP 401.";
    const commentResponse = await sessionJsonRequest(page, `${BASE}/api/issues/${issue.id}/comments`, {
      method: "POST",
      data: { body: originalComment },
    });
    expect(commentResponse.ok).toBe(true);

    // Seed only the server-owned native-run provenance needed to exercise the
    // same response validator; the fake process agent is never woken.
    const postmaster = readFileSync(
      path.join(disposableFixture.embeddedPostgresDataDir, "postmaster.pid"),
      "utf8",
    ).split(/\r?\n/);
    const databasePort = Number(postmaster[3]);
    if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
      throw new Error("The disposable database did not publish its running port");
    }
    const databaseUrl = `postgres://paperclip:paperclip@127.0.0.1:${databasePort}/paperclip`;
    const db = createDb(databaseUrl);
    const sourceRunId = randomUUID();
    const capturedAt = new Date();
    try {
      await db.insert(heartbeatRuns).values({
        id: sourceRunId,
        companyId: company.id,
        agentId: agentResponse.json!.id,
        scopeKind: "issue",
        issueId: issue.id,
        status: "succeeded",
        runtimeMode: "native",
        runtimeModeResolvedAt: capturedAt,
        nativeIssueId: issue.id,
        driverKind: "codex",
        startedAt: new Date(capturedAt.getTime() - 1_000),
        finishedAt: capturedAt,
        responsibleUserId: issue.responsibleUserId,
        contextSnapshot: {
          issueId: issue.id,
          communicationLocale: "pt-BR",
          communicationLocaleSource: "user",
        },
      });
    } finally {
      await closeRegisteredClients(databaseUrl);
    }

    const createdInteraction = await sessionJsonRequest<{
      id: string;
      status: string;
      payload: Record<string, unknown>;
    }>(page, `${BASE}/api/issues/${issue.id}/interactions`, {
      method: "POST",
      data: {
        kind: "ask_user_questions",
        sourceRunId,
        idempotencyKey: `paperclip-runner-question:${sourceRunId}:shared-language-browser`,
        continuationPolicy: "none",
        resolverPolicy: "anyone",
        payload: {
          version: 1,
          runtimeRequestId: "shared-language-browser",
          questionSet: {
            schema: "paperclip.question_set.v1",
            title: "Original deployment choice",
            questions: [{
              id: "color",
              prompt: "Which color?",
              required: true,
              answerMode: "single_select",
              options: [{ id: "amber", label: "Amber" }, { id: "blue", label: "Blue" }],
            }],
          },
        },
      },
    });
    expect(createdInteraction.ok).toBe(true);
    expect(createdInteraction.json).toMatchObject({ status: "pending" });
    const interaction = createdInteraction.json!;

    const issueUrl = `${BASE}/${companyPrefix}/issues/${issue.identifier}`;
    await page.goto(issueUrl);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByText("Pergunta 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Which color?", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar respostas", exact: true })).toBeVisible();
    await expect(page.getByText(originalComment, { exact: true })).toBeVisible();

    const invite = await sessionJsonRequest<{ inviteUrl: string }>(page, `${BASE}/api/companies/${company.id}/invites`, {
      method: "POST",
      data: { allowedJoinTypes: "human", humanRole: "operator" },
    });
    expect(invite.ok).toBe(true);
    const invited = await newPage(browser);
    try {
      await chooseEnglishForUnauthenticatedBrowser(invited.page);
      await signUpFromInvite(invited.page, invite.json!.inviteUrl, responder);
      const responderEnglishPreference = await sessionJsonRequest(invited.page, `${BASE}/api/auth/locale-preference`, {
        method: "PUT",
        data: { locale: "en" },
      });
      expect(responderEnglishPreference.ok).toBe(true);
      await invited.page.reload();
      await acceptHumanInvite(invited.page);
      const enPreference = await sessionJsonRequest(invited.page, `${BASE}/api/auth/locale-preference`, {
        method: "PUT",
        data: { locale: "en" },
      });
      expect(enPreference.ok).toBe(true);
      await invited.page.goto(issueUrl);
      await expect(invited.page.locator("html")).toHaveAttribute("lang", "en");
      await expect(invited.page.getByText("Question 1", { exact: true })).toBeVisible();
      await expect(invited.page.getByText("Which color?", { exact: true })).toBeVisible();
      await expect(invited.page.getByRole("button", { name: "Submit answers", exact: true })).toBeVisible();
      await expect(invited.page.getByText(originalComment, { exact: true })).toBeVisible();

      const responseUrl = new RegExp(`/api/issues/${issue.id}/interactions/${interaction.id}/respond$`);
      let capturedResponseStatus = 0;
      let capturedResponseBody: Record<string, unknown> | null = null;
      await invited.page.route(responseUrl, async (route) => {
        const body = route.request().postDataJSON() as {
          answers: Array<{ questionId: string; optionIds: string[]; otherText?: string }>;
        };
        expect(body.answers).toMatchObject([{ questionId: "color", optionIds: ["amber"] }]);
        const invalidBody = {
          ...body,
          answers: [{ ...body.answers[0]!, optionIds: ["invalid-from-browser"] }],
        };
        const response = await route.fetch({ postData: JSON.stringify(invalidBody) });
        capturedResponseStatus = response.status();
        capturedResponseBody = await response.json();
        await route.fulfill({ response });
      });
      await invited.page.getByRole("radio", { name: "Amber", exact: true }).click();
      await invited.page.getByRole("button", { name: "Submit answers", exact: true }).click();
      await expect(invited.page.getByText("The submitted data is invalid. Check the fields and try again.", { exact: true })).toBeVisible();
      expect(capturedResponseStatus).toBe(422);
      expect(capturedResponseBody).toMatchObject({
        code: "invalid_question_response",
        messageKey: "validation",
      });
      const pendingAfterError = await sessionJsonRequest<Array<{ id: string; status: string; result: unknown; payload: Record<string, unknown> }>>(
        invited.page,
        `${BASE}/api/issues/${issue.id}/interactions`,
      );
      expect(pendingAfterError.ok).toBe(true);
      expect(pendingAfterError.json?.find((entry) => entry.id === interaction.id)).toMatchObject({
        status: "pending",
        result: null,
        payload: interaction.payload,
      });

      await invited.page.unroute(responseUrl);
      await invited.page.getByRole("button", { name: "Submit answers", exact: true }).click();
      await expect.poll(async () => {
        const current = await sessionJsonRequest<Array<{ id: string; status: string }>>(
          invited.page,
          `${BASE}/api/issues/${issue.id}/interactions`,
        );
        return current.json?.find((entry) => entry.id === interaction.id)?.status;
      }).toBe("answered");

      const ownerLocale = await sessionJsonRequest<{ locale: string }>(page, `${BASE}/api/auth/locale-preference`);
      const responderLocale = await sessionJsonRequest<{ locale: string }>(invited.page, `${BASE}/api/auth/locale-preference`);
      expect(ownerLocale.json?.locale).toBe("pt-BR");
      expect(responderLocale.json?.locale).toBe("en");
      const sharedInteractions = await sessionJsonRequest<Array<{
        id: string;
        status: string;
        payload: Record<string, unknown>;
        result: { answers?: Array<{ questionId: string; optionIds: string[] }> } | null;
      }>>(page, `${BASE}/api/issues/${issue.id}/interactions`);
      const answered = sharedInteractions.json?.find((entry) => entry.id === interaction.id);
      expect(answered).toMatchObject({
        status: "answered",
        payload: interaction.payload,
        result: { answers: [{ questionId: "color", optionIds: ["amber"] }] },
      });

      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
      await expect(page.getByText("Pergunta 1", { exact: true })).toBeVisible();
      await expect(page.getByText("Which color?", { exact: true })).toBeVisible();
      await expect(page.getByText("Amber", { exact: true })).toBeVisible();
      await expect(page.getByText(originalComment, { exact: true })).toBeVisible();
    } finally {
      await invited.context.close();
    }
  });
});


test("agent chats keep personal identity and ordinary company visibility", async ({ browser, page }) => {
  test.setTimeout(120_000);
  expect((await (await page.request.get(`${BASE}/api/health`)).json()).deploymentMode).toBe("authenticated");
  await signUp(page, { ...ownerUser, email: `chat-${ownerUser.email}` });
  const bootstrapToken = new URL(createBootstrapInvite()).pathname.split("/").at(-1);
  expect((await sessionJsonRequest(page, `${BASE}/api/invites/${bootstrapToken}/accept`, { method: "POST", data: { requestType: "human" } })).ok).toBe(true);
  const company = await createCompanyForSession(page, `Chat identity ${runId}`);
  const companyPrefix = company.issuePrefix ?? company.id;
  const invite = await sessionJsonRequest<{ inviteUrl: string }>(page, `${BASE}/api/companies/${company.id}/invites`, { method: "POST", data: { allowedJoinTypes: "human", humanRole: "operator" } });
  expect(invite.ok).toBe(true);
  const invited = await newPage(browser);
  try {
    await signUp(invited.page, { ...invitedUser, email: `chat-${invitedUser.email}` });
    const inviteToken = new URL(invite.json!.inviteUrl, BASE).pathname.split("/").at(-1);
    const joined = await sessionJsonRequest(invited.page, `${BASE}/api/invites/${inviteToken}/accept`, { method: "POST", data: { requestType: "human" } });
    expect(joined.ok).toBe(true);
      // Persistent chats are personal identities, not private messaging.
      const originalFlags = await sessionJsonRequest<Record<string, boolean>>(page, `${BASE}/api/instance/settings/experimental`);
      const enable = await sessionJsonRequest(page, `${BASE}/api/instance/settings/experimental`, { method: "PATCH", data: { enableAgentChat: true } });
      expect(enable.ok).toBe(true);
      try {
        const createdAgent = await sessionJsonRequest<{ id: string }>(page, `${BASE}/api/companies/${company.id}/agents`, { method: "POST", data: {
          name: "Personal chat identity", adapterType: "process",
          adapterConfig: { command: process.execPath, args: ["-e", "process.exit(0)"] },
          runtimeConfig: { heartbeat: { enabled: false } },
        } });
        expect(createdAgent.ok).toBe(true);
        const agentId = createdAgent.json!.id;
        const chatEndpoint = `${BASE}/api/companies/${company.id}/chats/${agentId}`;
        await page.goto(`${BASE}/${companyPrefix}/chats/${agentId}`);
        await invited.page.goto(`${BASE}/${companyPrefix}/chats/${agentId}`);
        expect((await sessionJsonRequest(page, chatEndpoint)).json).toBeNull();
        expect((await sessionJsonRequest(invited.page, chatEndpoint)).json).toBeNull();
        const ownerChat = await sessionJsonRequest<{ id: string; conversationUserId: string }>(page, chatEndpoint, { method: "POST", data: {} });
        const memberChat = await sessionJsonRequest<{ id: string; conversationUserId: string }>(invited.page, chatEndpoint, { method: "POST", data: {} });
        expect(ownerChat.ok).toBe(true); expect(memberChat.ok).toBe(true);
        expect(ownerChat.json!.id).not.toBe(memberChat.json!.id);
        expect(ownerChat.json!.conversationUserId).not.toBe(memberChat.json!.conversationUserId);
        expect((await sessionJsonRequest(invited.page, `${BASE}/api/issues/${ownerChat.json!.id}`)).ok).toBe(true);
        expect((await sessionJsonRequest(page, `${BASE}/api/issues/${memberChat.json!.id}`)).ok).toBe(true);
        await page.reload(); await invited.page.reload();
        await page.getByRole("button", { name: "Star Personal chat identity", exact: true }).click();
        await expect(page.getByRole("button", { name: "Unstar Personal chat identity", exact: true })).toBeAttached();
        await expect(invited.page.getByRole("button", { name: "Star Personal chat identity", exact: true })).toBeAttached();
        const ownerRecent = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("paperclip.recentAgentChats:")));
        const memberRecent = await invited.page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("paperclip.recentAgentChats:")));
        expect(ownerRecent.some(key => key.endsWith(ownerChat.json!.conversationUserId))).toBe(true);
        expect(memberRecent.some(key => key.endsWith(memberChat.json!.conversationUserId))).toBe(true);
        const another = await createCompanyForSession(page, `Private company ${runId}`);
        const forbidden = await sessionJsonRequest(invited.page, `${BASE}/api/companies/${another.id}/chats/${agentId}`);
        expect([403, 404]).toContain(forbidden.status);
      } finally {
        const restore = await sessionJsonRequest(page, `${BASE}/api/instance/settings/experimental`, { method: "PATCH", data: { enableAgentChat: originalFlags.json!.enableAgentChat } });
        expect(restore.ok).toBe(true);
      }
  } finally { await invited.context.close(); }
});
