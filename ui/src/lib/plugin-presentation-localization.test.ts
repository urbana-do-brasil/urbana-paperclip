import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  isBundledPluginRecord,
  isTrustedBundledSandboxProvider,
  localizePluginLocalFolderPresentation,
  localizePluginPresentation,
  localizeManagedPluginDisplayName,
  localizeManagedPluginResourceDisplayName,
  localizePluginUiContributionPresentation,
  localizeSandboxProviderPresentation,
  localizeSandboxProviderConfigSchema,
  isTrustedBundledPluginContribution,
} from "./plugin-presentation-localization";

afterAll(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

const ownUiSlotInventory = [
  {
    pluginKey: "paperclipai.plugin-llm-wiki",
    slots: [
      { id: "wiki-sidebar", sourceDisplayName: "Wiki", messageKey: "llmWikiSidebar", ptBr: "Wiki" },
      { id: "wiki-page", sourceDisplayName: "Wiki", messageKey: "llmWikiPage", ptBr: "Wiki" },
      { id: "wiki-route-sidebar", sourceDisplayName: "Wiki", messageKey: "llmWikiRouteSidebar", ptBr: "Wiki" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclip.workspace-diff",
    slots: [
      { id: "workspace-changes-tab", sourceDisplayName: "Changes", messageKey: "workspaceChangesTab", ptBr: "Alterações" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclip-kitchen-sink-example",
    slots: [
      { id: "kitchen-sink-page", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkPage", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-settings-page", sourceDisplayName: "Kitchen Sink Settings", messageKey: "kitchenSinkSettingsPage", ptBr: "Configurações do Kitchen Sink" },
      { id: "kitchen-sink-company-settings-page", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkCompanySettingsPage", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-dashboard-widget", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkDashboardWidget", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-sidebar-link", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkSidebar", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-sidebar-panel", sourceDisplayName: "Kitchen Sink Panel", messageKey: "kitchenSinkSidebarPanel", ptBr: "Painel do Kitchen Sink" },
      { id: "kitchen-sink-project-link", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkProjectSidebarItem", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-project-tab", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkProjectTab", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-issue-tab", sourceDisplayName: "Kitchen Sink", messageKey: "kitchenSinkIssueTab", ptBr: "Kitchen Sink" },
      { id: "kitchen-sink-task-detail", sourceDisplayName: "Kitchen Sink Task View", messageKey: "kitchenSinkTaskDetailView", ptBr: "Visão da tarefa do Kitchen Sink" },
      { id: "kitchen-sink-toolbar-action", sourceDisplayName: "Kitchen Sink Action", messageKey: "kitchenSinkToolbarButton", ptBr: "Ação do Kitchen Sink" },
      { id: "kitchen-sink-context-action", sourceDisplayName: "Kitchen Sink Context", messageKey: "kitchenSinkContextMenuItem", ptBr: "Contexto do Kitchen Sink" },
      { id: "kitchen-sink-comment-annotation", sourceDisplayName: "Kitchen Sink Comment Annotation", messageKey: "kitchenSinkCommentAnnotation", ptBr: "Anotação de comentário do Kitchen Sink" },
      { id: "kitchen-sink-comment-action", sourceDisplayName: "Kitchen Sink Comment Action", messageKey: "kitchenSinkCommentContextMenuItem", ptBr: "Ação de comentário do Kitchen Sink" },
    ],
    launchers: [
      { id: "kitchen-sink-launcher", sourceDisplayName: "Kitchen Sink Modal", messageKey: "kitchenSinkModalLauncher", ptBr: "Modal do Kitchen Sink" },
    ],
  },
  {
    pluginKey: "paperclip-file-browser-example",
    slots: [
      { id: "files-link", sourceDisplayName: "Files", messageKey: "fileBrowserFilesLink", ptBr: "Arquivos" },
      { id: "files-tab", sourceDisplayName: "Files", messageKey: "fileBrowserFilesTab", ptBr: "Arquivos" },
      { id: "comment-file-links", sourceDisplayName: "File Links", messageKey: "fileBrowserCommentFileLinks", ptBr: "Links de arquivos" },
      { id: "comment-open-files", sourceDisplayName: "Open in Files", messageKey: "fileBrowserCommentOpenFiles", ptBr: "Abrir em Arquivos" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclipai.plugin-orchestration-smoke-example",
    slots: [
      { id: "health-widget", sourceDisplayName: "Orchestration Smoke Health", messageKey: "orchestrationSmokeHealthWidget", ptBr: "Saúde do teste de fumaça da orquestração" },
      { id: "issue-panel", sourceDisplayName: "Orchestration Smoke", messageKey: "orchestrationSmokeIssuePanel", ptBr: "Teste de fumaça da orquestração" },
      { id: "settings", sourceDisplayName: "Orchestration Smoke", messageKey: "orchestrationSmokeSettings", ptBr: "Teste de fumaça da orquestração" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclip.hello-world-example",
    slots: [
      { id: "hello-world-dashboard-widget", sourceDisplayName: "Hello World", messageKey: "helloWorldDashboardWidget", ptBr: "Hello World" },
    ],
    launchers: [],
  },
  {
    pluginKey: "paperclipai.plugin-authoring-smoke-example",
    slots: [
      { id: "health-widget", sourceDisplayName: "Plugin Authoring Smoke Example Health", messageKey: "pluginAuthoringSmokeHealthWidget", ptBr: "Saúde do exemplo de teste de fumaça de autoria de plugin" },
    ],
    launchers: [],
  },
] as const;

const ownUiSlotManifestSources: Record<string, string[]> = {
  "paperclipai.plugin-llm-wiki": ["../../../packages/plugins/plugin-llm-wiki/src/manifest.ts"],
  "paperclip.workspace-diff": ["../../../packages/plugins/plugin-workspace-diff/src/manifest.ts"],
  "paperclip-kitchen-sink-example": [
    "../../../packages/plugins/examples/plugin-kitchen-sink-example/src/manifest.ts",
    "../../../packages/plugins/examples/plugin-kitchen-sink-example/src/constants.ts",
  ],
  "paperclip-file-browser-example": ["../../../packages/plugins/examples/plugin-file-browser-example/src/manifest.ts"],
  "paperclipai.plugin-orchestration-smoke-example": ["../../../packages/plugins/examples/plugin-orchestration-smoke-example/src/manifest.ts"],
  "paperclip.hello-world-example": ["../../../packages/plugins/examples/plugin-hello-world-example/src/manifest.ts"],
  "paperclipai.plugin-authoring-smoke-example": ["../../../packages/plugins/examples/plugin-authoring-smoke-example/src/manifest.ts"],
};

describe("owned plugin presentation localization", () => {
  it("keeps the host translation allowlist aligned with all first-party slot IDs and labels", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);
      for (const owner of ownUiSlotInventory) {
        const manifestSource = ownUiSlotManifestSources[owner.pluginKey]
          ?.map((sourcePath) => readFileSync(new URL(sourcePath, import.meta.url), "utf8"))
          .join("\n");
        expect(manifestSource).toBeDefined();
        const contribution = {
          pluginKey: owner.pluginKey,
          displayName: owner.pluginKey,
          slots: owner.slots.map(({ id, sourceDisplayName }) => ({ id, displayName: sourceDisplayName })),
          launchers: owner.launchers.map(({ id, sourceDisplayName }) => ({ id, displayName: sourceDisplayName })),
        };
        const expectedDisplayNames = Object.fromEntries(owner.slots.map((slot) => [
          slot.id,
          locale === "pt-BR" ? slot.ptBr : slot.sourceDisplayName,
        ]));
        const expectedLauncherDisplayNames = Object.fromEntries(owner.launchers.map((launcher) => [
          launcher.id,
          locale === "pt-BR" ? launcher.ptBr : launcher.sourceDisplayName,
        ]));

        const presentation = localizePluginUiContributionPresentation(contribution, i18n.t, true);
        expect(presentation.slotDisplayNames).toEqual(expectedDisplayNames);
        expect(presentation.launcherDisplayNames).toEqual(expectedLauncherDisplayNames);
        for (const slot of owner.slots) {
          expect(manifestSource).toContain(slot.id);
          expect(manifestSource).toContain(`displayName: "${slot.sourceDisplayName}"`);
          expect(i18n.exists(`pluginPresentation.uiSlots.${slot.messageKey}`, { lng: locale })).toBe(true);
        }
        for (const launcher of owner.launchers) {
          expect(manifestSource).toContain(launcher.id);
          expect(manifestSource).toContain(`displayName: "${launcher.sourceDisplayName}"`);
          expect(i18n.exists(`pluginPresentation.uiLaunchers.${launcher.messageKey}`, { lng: locale })).toBe(true);
        }
        expect(contribution.slots.map((slot) => slot.displayName))
          .toEqual(owner.slots.map((slot) => slot.sourceDisplayName));
        expect(contribution.launchers.map((launcher) => launcher.displayName))
          .toEqual(owner.launchers.map((launcher) => launcher.sourceDisplayName));
      }
    }
  });

  it("recognizes a first-party source only when the installed record matches the host bundle", () => {
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];
    const installed = {
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
    };

    expect(isBundledPluginRecord(installed, bundled)).toBe(true);
    expect(isBundledPluginRecord({ ...installed, packagePath: "/custom/vendor-copy" }, bundled)).toBe(false);
    expect(isBundledPluginRecord({ ...installed, packageName: "vendor/workspace-diff" }, bundled)).toBe(false);
  });

  it("requires a sandbox capability key and manifest id to match the bundled installed plugin id", () => {
    const installed = [{
      id: "bundled-e2b-plugin-id",
      pluginKey: "paperclip.e2b-sandbox-provider",
      packageName: "@paperclipai/plugin-e2b",
      packagePath: "/app/packages/plugins/sandbox-providers/e2b",
      manifestJson: { id: "paperclip.e2b-sandbox-provider" },
    }];
    const bundled = [{
      pluginKey: "paperclip.e2b-sandbox-provider",
      packageName: "@paperclipai/plugin-e2b",
      localPath: "/app/packages/plugins/sandbox-providers/e2b",
    }];

    expect(isTrustedBundledSandboxProvider({
      pluginId: "bundled-e2b-plugin-id",
      pluginKey: "paperclip.e2b-sandbox-provider",
    }, installed, bundled)).toBe(true);
    expect(isTrustedBundledSandboxProvider({
      pluginId: "bundled-e2b-plugin-id",
      pluginKey: "paperclip.daytona-sandbox-provider",
    }, installed, bundled)).toBe(false);
    expect(isTrustedBundledSandboxProvider({
      pluginId: "bundled-e2b-plugin-id",
      pluginKey: "paperclip.e2b-sandbox-provider",
    }, [{ ...installed[0]!, manifestJson: { id: "paperclip.daytona-sandbox-provider" } }], bundled)).toBe(false);
  });

  it.each([
    ["pt-BR", "Template do sandbox", "Nome do template de sandbox do E2B. Se omitido, usa base.", "Chave de API", "Tempo limite do sandbox", "Reutilizar sandbox"],
    ["en", "Template", "E2B sandbox template name. Defaults to base when omitted.", "API key", "Sandbox timeout", "Reuse sandbox"],
  ] as const)("localizes E2B schema metadata from the exact bundled source in %s without changing schema or values", async (
    locale,
    templateName,
    templateDescription,
    apiKeyName,
    timeoutName,
    reuseName,
  ) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.e2b-sandbox-provider";
    const pluginRecordId = "bundled-e2b-plugin-id";
    const packageName = "@paperclipai/plugin-e2b";
    const bundlePath = "/app/packages/plugins/sandbox-providers/e2b";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const schema = {
      type: "object",
      required: ["template"],
      properties: {
        template: {
          type: "string",
          description: "E2B sandbox template name. Defaults to base when omitted.",
          default: "base",
        },
        apiKey: {
          type: "string",
          format: "secret-ref",
          description: "Environment-specific E2B API key. Paste a key or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Falls back to E2B_API_KEY if omitted.",
        },
        timeoutMs: {
          type: "number",
          description: "Sandbox lifetime in milliseconds, refreshed on each command. Defaults to 1 hour. Raise this if your runs commonly idle longer than the default between commands.",
          default: 3_600_000,
          minimum: 1_000,
        },
        reuseLease: {
          type: "boolean",
          description: "Whether to pause and reuse sandboxes across runs.",
          default: false,
        },
        customField: {
          type: "string",
          title: "Provider-owned field",
          description: "Provider-owned help text.",
        },
      },
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      template: "custom-template",
      apiKey: "company-secret-ref",
      timeoutMs: 7_200_000,
      reuseLease: true,
      customValue: "preserve this value",
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("e2b", pluginId, schema, i18n.t, trustedBundle)!;

    expect(localized.properties.template).toMatchObject({
      title: templateName,
      description: templateDescription,
      default: "base",
    });
    expect(localized.properties.apiKey).toMatchObject({
      title: apiKeyName,
      format: "secret-ref",
    });
    expect(localized.properties.timeoutMs).toMatchObject({
      title: timeoutName,
      default: 3_600_000,
      minimum: 1_000,
    });
    expect(localized.properties.reuseLease).toMatchObject({ title: reuseName, default: false });
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(localized.required).toEqual(["template"]);
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    if (locale === "pt-BR") {
      expect(localized.properties.apiKey.description).toBe("Chave de API do E2B específica do ambiente. Cole uma chave ou uma referência a um segredo existente do Paperclip; valores colados são salvos como segredos da organização. Se omitida, usa E2B_API_KEY.");
      expect(localized.properties.timeoutMs.description).toBe("Tempo de vida do sandbox em milissegundos, atualizado a cada comando. O padrão é 1 hora. Aumente este valor se suas execuções costumam ficar inativas por mais tempo que o padrão entre comandos.");
      expect(localized.properties.reuseLease.description).toBe("Define se os sandboxes devem ser pausados e reutilizados entre execuções.");
    } else {
      expect(localized.properties.apiKey.description).toBe(schema.properties.apiKey.description);
      expect(localized.properties.timeoutMs.description).toBe(schema.properties.timeoutMs.description);
      expect(localized.properties.reuseLease.description).toBe(schema.properties.reuseLease.description);
    }

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/e2b/src/manifest.ts", import.meta.url),
      "utf8",
    );
    for (const sourceDescription of [
      schema.properties.template.description,
      schema.properties.apiKey.description,
      schema.properties.timeoutMs.description,
      schema.properties.reuseLease.description,
    ]) {
      expect(manifestSource).toContain(sourceDescription);
    }

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-e2b-id",
      packageName: "vendor/e2b-compatible",
      packagePath: "/custom/vendor/e2b-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-e2b-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("e2b", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const changedSourceSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        apiKey: { ...schema.properties.apiKey, description: "Vendor-authored E2B compatible API description." },
      },
    };
    const changedSourcePresentation = localizeSandboxProviderConfigSchema("e2b", pluginId, changedSourceSchema, i18n.t, true)!;
    expect(changedSourcePresentation.properties.apiKey).toEqual(changedSourceSchema.properties.apiKey);
  });

  it.each(["pt-BR", "en"] as const)("localizes Modal schema metadata only for the exact bundled source in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.modal-sandbox-provider";
    const pluginRecordId = "bundled-modal-plugin-id";
    const packageName = "@paperclipai/plugin-modal";
    const bundlePath = "/app/packages/plugins/sandbox-providers/modal";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const sourceDescriptions = {
      appName: "Modal App name used as the parent for sandboxes. The plugin calls `modal.apps.fromName(appName, { createIfMissing: true })`, so the App is created on first acquire if it does not already exist.",
      image: "Container image reference passed to `modal.images.fromRegistry()`, e.g. `python:3.13` or `node:24`. The default `node:24` satisfies the sandbox runtime contract (node, sh, and tar on PATH).",
      tokenId: "Modal token ID. Paste a token or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Required.",
      tokenSecret: "Modal token secret paired with tokenId. Required.",
      environment: "Optional Modal environment name. Falls back to the SDK profile default.",
      workdir: "Remote working directory inside the sandbox.",
      sandboxTimeoutMs: "Maximum sandbox lifetime in milliseconds. Must be a positive multiple of 1000 between 1000 and 86400000 (24 hours).",
      idleTimeoutMs: "Optional idle timeout in milliseconds. When set, Modal terminates the sandbox if no exec is active for this duration. Must be a positive multiple of 1000.",
      execTimeoutMs: "Default per-exec timeout in milliseconds when the caller does not provide one. Must be a positive multiple of 1000.",
      blockNetwork: "Whether to block all egress network access from the sandbox.",
      cidrAllowlist: "Optional list of CIDRs the sandbox is allowed to reach. Cannot be combined with blockNetwork.",
      reuseLease: "When true, the sandbox is detached (not terminated) on release and resumed by id later. Reuse relies on Modal's sandbox lifetime and idle timeout because Modal has no separate pause primitive.",
    };
    const ptBrDescriptions = {
      appName: "Nome do App do Modal usado como pai dos sandboxes. O plugin chama `modal.apps.fromName(appName, { createIfMissing: true })`, então o App é criado na primeira aquisição se ainda não existir.",
      image: "Referência de imagem de contêiner passada para `modal.images.fromRegistry()`, por exemplo `python:3.13` ou `node:24`. A imagem padrão `node:24` atende ao contrato de runtime do sandbox (node, sh e tar no PATH).",
      tokenId: "ID do token Modal. Cole um token ou uma referência existente de segredo do Paperclip; os ambientes salvos armazenam valores colados como segredos da organização. Obrigatório.",
      tokenSecret: "Segredo do token Modal associado a tokenId. Obrigatório.",
      environment: "Nome opcional do ambiente Modal. Se omitido, usa o perfil padrão do SDK.",
      workdir: "Diretório de trabalho remoto dentro do sandbox.",
      sandboxTimeoutMs: "Tempo de vida máximo do sandbox em milissegundos. Deve ser um múltiplo positivo de 1000 entre 1000 e 86400000 (24 horas).",
      idleTimeoutMs: "Timeout de inatividade opcional em milissegundos. Quando definido, o Modal encerra o sandbox se nenhum exec estiver ativo durante esse período. Deve ser um múltiplo positivo de 1000.",
      execTimeoutMs: "Timeout padrão por exec, em milissegundos, quando quem faz a chamada não fornece um. Deve ser um múltiplo positivo de 1000.",
      blockNetwork: "Define se todo o acesso de saída à rede do sandbox deve ser bloqueado.",
      cidrAllowlist: "Lista opcional de CIDRs que o sandbox pode acessar. Não pode ser combinada com blockNetwork.",
      reuseLease: "Quando true, o sandbox é desconectado (não encerrado) ao liberar e retomado por ID depois. A reutilização depende do tempo de vida do sandbox e do timeout de inatividade do Modal, pois o Modal não tem uma operação de pausa separada.",
    };
    const ptBrNames = {
      appName: "Nome do App do Modal",
      image: "Imagem de contêiner",
      tokenId: "ID do token Modal",
      tokenSecret: "Segredo do token Modal",
      environment: "Ambiente Modal",
      workdir: "Diretório de trabalho remoto",
      sandboxTimeoutMs: "Duração do sandbox (ms)",
      idleTimeoutMs: "Timeout de inatividade (ms)",
      execTimeoutMs: "Timeout padrão de exec (ms)",
      blockNetwork: "Bloquear tráfego de saída da rede",
      cidrAllowlist: "Lista de CIDRs permitidos",
      reuseLease: "Reutilizar sandbox entre execuções",
    };
    const enNames = {
      appName: "Modal App name",
      image: "Container image",
      tokenId: "Modal token ID",
      tokenSecret: "Modal token secret",
      environment: "Modal environment",
      workdir: "Remote working directory",
      sandboxTimeoutMs: "Sandbox lifetime (ms)",
      idleTimeoutMs: "Idle timeout (ms)",
      execTimeoutMs: "Default exec timeout (ms)",
      blockNetwork: "Block network egress",
      cidrAllowlist: "CIDR allowlist",
      reuseLease: "Reuse sandbox between runs",
    };
    const schema = {
      type: "object",
      required: ["appName", "image"],
      properties: {
        appName: { type: "string", description: sourceDescriptions.appName, default: "paperclip" },
        image: { type: "string", description: sourceDescriptions.image, default: "node:24" },
        tokenId: { type: "string", format: "secret-ref", description: sourceDescriptions.tokenId },
        tokenSecret: { type: "string", format: "secret-ref", description: sourceDescriptions.tokenSecret },
        environment: { type: "string", description: sourceDescriptions.environment },
        workdir: { type: "string", description: sourceDescriptions.workdir, default: "/workspace/paperclip" },
        sandboxTimeoutMs: { type: "number", description: sourceDescriptions.sandboxTimeoutMs, default: 3_600_000 },
        idleTimeoutMs: { type: "number", description: sourceDescriptions.idleTimeoutMs },
        execTimeoutMs: { type: "number", description: sourceDescriptions.execTimeoutMs, default: 300_000 },
        blockNetwork: { type: "boolean", description: sourceDescriptions.blockNetwork, default: false },
        cidrAllowlist: { type: "array", items: { type: "string" }, description: sourceDescriptions.cidrAllowlist },
        reuseLease: { type: "boolean", description: sourceDescriptions.reuseLease, default: false },
        customField: { type: "string", title: "Provider-owned field", description: "Provider-owned help text." },
      },
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      appName: "customer-modal-app",
      image: "python:3.13",
      tokenId: "company-secret-id-ref",
      tokenSecret: "company-secret-value-ref",
      environment: "production",
      workdir: "/custom/workspace",
      sandboxTimeoutMs: 7_200_000,
      idleTimeoutMs: 120_000,
      execTimeoutMs: 240_000,
      blockNetwork: true,
      cidrAllowlist: ["10.0.0.0/8"],
      reuseLease: true,
      providerArbitraryValue: { preserve: true },
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("modal", pluginId, schema, i18n.t, trustedBundle)!;
    const expectedNames = locale === "pt-BR" ? ptBrNames : enNames;
    const expectedDescriptions = locale === "pt-BR" ? ptBrDescriptions : sourceDescriptions;

    for (const [fieldKey, sourceDescription] of Object.entries(sourceDescriptions)) {
      const sourceField = schema.properties[fieldKey as keyof typeof schema.properties];
      expect(localized.properties[fieldKey as keyof typeof localized.properties]).toEqual({
        ...sourceField,
        title: expectedNames[fieldKey as keyof typeof expectedNames],
        description: expectedDescriptions[fieldKey as keyof typeof expectedDescriptions],
      });
      expect(sourceDescription).toBeTruthy();
    }
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(localized.required).toEqual(["appName", "image"]);
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/modal/src/manifest.ts", import.meta.url),
      "utf8",
    );
    const packageJson = JSON.parse(readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/modal/package.json", import.meta.url),
      "utf8",
    )) as { name: string };
    expect(packageJson.name).toBe(packageName);
    expect(manifestSource).toContain(`const PLUGIN_ID = "${pluginId}"`);
    expect(manifestSource).toContain('driverKey: "modal"');
    for (const sourceDescription of Object.values(sourceDescriptions)) {
      expect(manifestSource).toContain(sourceDescription);
    }

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-modal-id",
      packageName: "vendor/modal-compatible",
      packagePath: "/custom/vendor/modal-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-modal-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("modal", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const changedSourceSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        tokenId: { ...schema.properties.tokenId, description: "Vendor-authored Modal-compatible token description." },
      },
    };
    const changedSourcePresentation = localizeSandboxProviderConfigSchema("modal", pluginId, changedSourceSchema, i18n.t, true)!;
    expect(changedSourcePresentation.properties.tokenId).toEqual(changedSourceSchema.properties.tokenId);
  });

  it.each(["pt-BR", "en"] as const)("localizes Novita schema metadata only for the exact bundled source in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.novita-sandbox-provider";
    const pluginRecordId = "bundled-novita-plugin-id";
    const packageName = "@paperclipai/plugin-novita-sandbox";
    const bundlePath = "/app/packages/plugins/sandbox-providers/novita";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const sourceDescriptions = {
      apiKey: "Environment-specific Novita API key. Paste a key or an existing Paperclip secret reference; saved environments store pasted values as company secrets. Falls back to NOVITA_API_KEY if omitted.",
      domain: "Optional Novita API domain override. Leave empty to use the SDK default.",
      template: "Novita sandbox template ID or name. Leave blank to use the SDK's default base template.",
      requestedCwd: "Workspace directory to create inside the sandbox lease.",
      timeoutMs: "Sandbox lifetime and default per-command timeout in milliseconds.",
      requestTimeoutMs: "HTTP/RPC request timeout for Novita SDK calls in milliseconds.",
      secure: "Use secure connections when supported by the Novita SDK.",
      autoPause: "Enable Novita sandbox auto-pause behavior when supported by the selected template.",
      reuseLease: "Pause and later resume the sandbox across Paperclip runs instead of killing it on release.",
    };
    const ptBrDescriptions = {
      apiKey: "Chave de API do Novita específica do ambiente. Cole uma chave ou uma referência a um segredo existente do Paperclip; chaves coladas são salvas como segredos da organização. Se omitida, usa NOVITA_API_KEY.",
      domain: "Substituição opcional do domínio da API do Novita. Deixe vazio para usar o padrão do SDK.",
      template: "ID ou nome do template do sandbox Novita. Deixe em branco para usar o template base padrão do SDK.",
      requestedCwd: "Diretório de trabalho a ser criado dentro do lease do sandbox.",
      timeoutMs: "Tempo de vida do sandbox e tempo limite padrão por comando, em milissegundos.",
      requestTimeoutMs: "Tempo limite de solicitação HTTP/RPC para chamadas do SDK Novita, em milissegundos.",
      secure: "Usa conexões seguras quando compatível com o SDK do Novita.",
      autoPause: "Ativa o comportamento de pausa automática do Novita quando compatível com o template selecionado.",
      reuseLease: "Pausa e depois retoma o sandbox entre execuções do Paperclip em vez de encerrá-lo ao liberar.",
    };
    const ptBrNames = {
      apiKey: "Chave de API",
      domain: "Domínio da API",
      template: "Template do sandbox",
      requestedCwd: "Diretório de trabalho",
      timeoutMs: "Tempo limite do sandbox",
      requestTimeoutMs: "Tempo limite da solicitação",
      secure: "Conexão segura",
      autoPause: "Pausa automática",
      reuseLease: "Reutilizar sandbox",
    };
    const enNames = {
      apiKey: "API key",
      domain: "API domain",
      template: "Sandbox template",
      requestedCwd: "Workspace directory",
      timeoutMs: "Sandbox timeout",
      requestTimeoutMs: "Request timeout",
      secure: "Secure connection",
      autoPause: "Auto-pause",
      reuseLease: "Reuse sandbox",
    };
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        apiKey: { type: "string", format: "secret-ref", description: sourceDescriptions.apiKey },
        domain: { type: "string", description: sourceDescriptions.domain },
        template: { type: "string", description: sourceDescriptions.template },
        requestedCwd: { type: "string", default: "/home/user/paperclip-workspace", description: sourceDescriptions.requestedCwd },
        timeoutMs: { type: "number", default: 300000, description: sourceDescriptions.timeoutMs },
        requestTimeoutMs: { type: "number", default: 30000, description: sourceDescriptions.requestTimeoutMs },
        secure: { type: "boolean", default: true, description: sourceDescriptions.secure },
        autoPause: { type: "boolean", default: false, description: sourceDescriptions.autoPause },
        reuseLease: { type: "boolean", default: false, description: sourceDescriptions.reuseLease },
        customField: { type: "string", title: "Provider-owned field", description: "Provider-owned help text." },
      },
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      apiKey: "company-secret-ref",
      domain: "api.custom.novita.example",
      template: "custom-template",
      requestedCwd: "/custom/workspace",
      timeoutMs: 600000,
      requestTimeoutMs: 45000,
      secure: false,
      autoPause: true,
      reuseLease: true,
      customValue: "preserve this arbitrary config value",
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("novita", pluginId, schema, i18n.t, trustedBundle)!;
    const expectedNames = locale === "pt-BR" ? ptBrNames : enNames;
    const expectedDescriptions = locale === "pt-BR" ? ptBrDescriptions : sourceDescriptions;

    for (const [fieldKey, sourceDescription] of Object.entries(sourceDescriptions)) {
      const sourceField = schema.properties[fieldKey as keyof typeof schema.properties];
      expect(localized.properties[fieldKey as keyof typeof localized.properties]).toEqual({
        ...sourceField,
        title: expectedNames[fieldKey as keyof typeof expectedNames],
        description: expectedDescriptions[fieldKey as keyof typeof expectedDescriptions],
      });
      expect(sourceDescription).toBeTruthy();
    }
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(localized.additionalProperties).toBe(false);
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/novita/src/manifest.ts", import.meta.url),
      "utf8",
    );
    const packageJson = JSON.parse(readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/novita/package.json", import.meta.url),
      "utf8",
    )) as { name: string };
    expect(packageJson.name).toBe(packageName);
    expect(manifestSource).toContain(`const PLUGIN_ID = "${pluginId}"`);
    expect(manifestSource).toContain('driverKey: "novita"');
    for (const sourceDescription of Object.values(sourceDescriptions)) {
      expect(manifestSource).toContain(sourceDescription);
    }

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-novita-id",
      packageName: "vendor/novita-compatible",
      packagePath: "/custom/vendor/novita-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-novita-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("novita", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const changedSourceSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        apiKey: { ...schema.properties.apiKey, description: "Vendor-authored Novita-compatible API description." },
      },
    };
    const changedSourcePresentation = localizeSandboxProviderConfigSchema("novita", pluginId, changedSourceSchema, i18n.t, true)!;
    expect(changedSourcePresentation.properties.apiKey).toEqual(changedSourceSchema.properties.apiKey);
  });

  it.each(["pt-BR", "en"] as const)("localizes Cloudflare schema metadata only for the exact bundled source in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.cloudflare-sandbox-provider";
    const pluginRecordId = "bundled-cloudflare-plugin-id";
    const packageName = "@paperclipai/plugin-cloudflare-sandbox";
    const bundlePath = "/app/packages/plugins/sandbox-providers/cloudflare";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const sourceDescriptions = {
      bridgeBaseUrl: "Base URL of the operator-deployed Cloudflare Worker bridge.",
      bridgeAuthToken: "Bearer token used by the provider plugin when calling the Cloudflare bridge. Pasted values are stored as company secrets.",
      reuseLease: "Reuse a sandbox by environment ID instead of creating one per run.",
      keepAlive: "Prevent Cloudflare from idling the container between requests.",
      sleepAfter: "Idle timeout passed to getSandbox() on lease creation. Defaults to 1 hour so a fresh sandbox survives normal Claude/Codex heartbeats. Ignored when keepAlive is true.",
      normalizeId: "Lowercase and normalize sandbox IDs for operator-friendly naming.",
      requestedCwd: "Workspace directory to create inside the sandbox lease.",
      sessionStrategy: "Whether to run commands in a stable named session or the default session.",
      sessionId: "Named Cloudflare session ID used when sessionStrategy is named.",
      timeoutMs: "Default per-command timeout passed through to the bridge.",
      bridgeRequestTimeoutMs: "HTTP timeout for plugin-to-bridge requests.",
      previewHostname: "Optional hostname reserved for future preview URL support.",
    };
    const ptBrDescriptions = {
      bridgeBaseUrl: "URL base da ponte Cloudflare Worker implantada pelo operador.",
      bridgeAuthToken: "Token bearer usado pelo plugin provedor ao chamar a ponte Cloudflare. Valores colados são armazenados como segredos da organização.",
      reuseLease: "Reutiliza um sandbox pelo ID do ambiente em vez de criar um por execução.",
      keepAlive: "Impede que o Cloudflare coloque o contêiner em modo ocioso entre requisições.",
      sleepAfter: "Timeout de inatividade passado para getSandbox() ao criar o lease. O padrão é 1 hora para que um sandbox novo sobreviva a heartbeats normais do Claude/Codex. Ignorado quando keepAlive está ativo.",
      normalizeId: "Converte os IDs de sandbox para minúsculas e os normaliza para nomes fáceis de usar pelo operador.",
      requestedCwd: "Diretório do workspace a ser criado no lease do sandbox.",
      sessionStrategy: "Define se os comandos são executados em uma sessão nomeada estável ou na sessão padrão.",
      sessionId: "ID de sessão nomeada do Cloudflare usado quando sessionStrategy está como named.",
      timeoutMs: "Timeout padrão de cada comando passado pela ponte.",
      bridgeRequestTimeoutMs: "Timeout HTTP para solicitações do plugin à ponte.",
      previewHostname: "Nome de host opcional reservado para suporte futuro a URLs de preview.",
    };
    const ptBrNames = {
      bridgeBaseUrl: "URL da ponte",
      bridgeAuthToken: "Token de autenticação da ponte",
      reuseLease: "Reutilizar sandbox entre execuções",
      keepAlive: "Manter contêiner ativo",
      sleepAfter: "Timeout de inatividade",
      normalizeId: "Normalizar ID do sandbox",
      requestedCwd: "Diretório de trabalho",
      sessionStrategy: "Estratégia da sessão",
      sessionId: "ID da sessão",
      timeoutMs: "Timeout do comando (ms)",
      bridgeRequestTimeoutMs: "Timeout da ponte (ms)",
      previewHostname: "Host de preview",
    };
    const enNames = {
      bridgeBaseUrl: "Bridge URL",
      bridgeAuthToken: "Bridge auth token",
      reuseLease: "Reuse sandbox between runs",
      keepAlive: "Keep container alive",
      sleepAfter: "Idle timeout",
      normalizeId: "Normalize sandbox ID",
      requestedCwd: "Working directory",
      sessionStrategy: "Session strategy",
      sessionId: "Session ID",
      timeoutMs: "Command timeout (ms)",
      bridgeRequestTimeoutMs: "Bridge request timeout (ms)",
      previewHostname: "Preview hostname",
    };
    const schema = {
      type: "object",
      required: ["bridgeBaseUrl", "bridgeAuthToken"],
      properties: {
        bridgeBaseUrl: { type: "string", format: "uri", description: sourceDescriptions.bridgeBaseUrl },
        bridgeAuthToken: { type: "string", format: "secret-ref", description: sourceDescriptions.bridgeAuthToken },
        reuseLease: { type: "boolean", default: false, description: sourceDescriptions.reuseLease },
        keepAlive: { type: "boolean", default: false, description: sourceDescriptions.keepAlive },
        sleepAfter: { type: "string", default: "1h", description: sourceDescriptions.sleepAfter },
        normalizeId: { type: "boolean", default: true, description: sourceDescriptions.normalizeId },
        requestedCwd: { type: "string", default: "/workspace/paperclip", description: sourceDescriptions.requestedCwd },
        sessionStrategy: { type: "string", enum: ["named", "default"], default: "named", description: sourceDescriptions.sessionStrategy },
        sessionId: { type: "string", default: "paperclip", description: sourceDescriptions.sessionId },
        timeoutMs: { type: "number", default: 300_000, description: sourceDescriptions.timeoutMs },
        bridgeRequestTimeoutMs: { type: "number", default: 30_000, description: sourceDescriptions.bridgeRequestTimeoutMs },
        previewHostname: { type: "string", description: sourceDescriptions.previewHostname },
        customField: { type: "string", title: "Provider-owned field", description: "Provider-owned help text." },
      },
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      bridgeBaseUrl: "https://bridge.example.test",
      bridgeAuthToken: "company-secret-ref",
      reuseLease: true,
      keepAlive: true,
      sleepAfter: "2h",
      normalizeId: false,
      requestedCwd: "/custom/workspace",
      sessionStrategy: "default",
      sessionId: "user-session",
      timeoutMs: 600_000,
      bridgeRequestTimeoutMs: 45_000,
      previewHostname: "preview.example.test",
      providerArbitraryValue: { preserve: true },
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("cloudflare", pluginId, schema, i18n.t, trustedBundle)!;
    const expectedNames = locale === "pt-BR" ? ptBrNames : enNames;
    const expectedDescriptions = locale === "pt-BR" ? ptBrDescriptions : sourceDescriptions;

    for (const [fieldKey, sourceDescription] of Object.entries(sourceDescriptions)) {
      const translationKey = `pluginPresentation.sandboxProviderConfigFields.cloudflare.${fieldKey}`;
      expect(i18n.exists(`${translationKey}.name`, { lng: locale })).toBe(true);
      expect(i18n.exists(`${translationKey}.description`, { lng: locale })).toBe(true);
      const sourceField = schema.properties[fieldKey as keyof typeof schema.properties];
      expect(localized.properties[fieldKey as keyof typeof localized.properties]).toEqual({
        ...sourceField,
        title: expectedNames[fieldKey as keyof typeof expectedNames],
        description: expectedDescriptions[fieldKey as keyof typeof expectedDescriptions],
      });
      expect(sourceDescription).toBeTruthy();
    }
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(localized.required).toEqual(["bridgeBaseUrl", "bridgeAuthToken"]);
    expect(localized.properties.sessionStrategy).toMatchObject({ enum: ["named", "default"], default: "named" });
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/cloudflare/src/manifest.ts", import.meta.url),
      "utf8",
    );
    const packageJson = JSON.parse(readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/cloudflare/package.json", import.meta.url),
      "utf8",
    )) as { name: string };
    expect(packageJson.name).toBe(packageName);
    expect(manifestSource).toContain(`const PLUGIN_ID = "${pluginId}"`);
    expect(manifestSource).toContain('driverKey: "cloudflare"');
    for (const sourceDescription of Object.values(sourceDescriptions)) {
      expect(manifestSource).toContain(sourceDescription);
    }

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-cloudflare-id",
      packageName: "vendor/cloudflare-compatible",
      packagePath: "/custom/vendor/cloudflare-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-cloudflare-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("cloudflare", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const wrongManifestIdentity = isTrustedBundledSandboxProvider(
      { pluginId: pluginRecordId, pluginKey: pluginId },
      [{ ...installed[0]!, manifestJson: { id: "paperclip.daytona-sandbox-provider" } }],
      bundled,
    );
    expect(wrongManifestIdentity).toBe(false);
    expect(localizeSandboxProviderConfigSchema("cloudflare", pluginId, schema, i18n.t, wrongManifestIdentity)).toBe(schema);

    const changedSourceSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        bridgeAuthToken: { ...schema.properties.bridgeAuthToken, description: "Vendor-authored Cloudflare-compatible token help." },
      },
    };
    const changedSourcePresentation = localizeSandboxProviderConfigSchema("cloudflare", pluginId, changedSourceSchema, i18n.t, true)!;
    expect(changedSourcePresentation.properties.bridgeAuthToken).toEqual(changedSourceSchema.properties.bridgeAuthToken);
  });

  it.each(["pt-BR", "en"] as const)("localizes Kubernetes schema metadata only for the exact bundled source in %s", async (locale) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.kubernetes-sandbox-provider";
    const pluginRecordId = "bundled-kubernetes-plugin-id";
    const packageName = "@paperclipai/plugin-kubernetes";
    const bundlePath = "/app/packages/plugins/sandbox-providers/kubernetes";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const sourceDescriptions = {
      inCluster: "When true, the plugin uses the in-pod ServiceAccount credentials. Requires paperclip-server to be running inside the target cluster.",
      kubeconfig: "Inline kubeconfig YAML. Paste a kubeconfig or an existing Paperclip secret reference; pasted values are stored as company secrets.",
      namespacePrefix: "Prefix for the per-company tenant namespace (default: paperclip-).",
      companySlug: "Override the auto-derived company slug used in the tenant namespace name.",
      imageRegistry: "Override the default registry for agent runtime images (default: ghcr.io/paperclipai).",
      imageAllowList: "Glob patterns of allowed `target.imageOverride` values. Empty list = no override permitted.",
      imagePullSecrets: "Names of pre-created Docker image pull secrets in the tenant namespace.",
      egressAllowFqdns: "Additional FQDNs to allow egress to from agent pods. Adapter-default FQDNs (e.g. api.anthropic.com) are added automatically.",
      egressAllowCidrs: "Additional CIDRs to allow egress to from agent pods.",
      egressMode: "Network policy mode. `cilium` enables FQDN-based egress filtering via CiliumNetworkPolicy.",
      runtimeClassName: "Optional RuntimeClass for pod isolation (e.g. `kata-fc` for Firecracker-backed microVMs). Cluster must have the RuntimeClass installed.",
      serviceAccountAnnotations: "Annotations applied to the per-tenant ServiceAccount (e.g. `eks.amazonaws.com/role-arn` for IRSA).",
      jobTtlSecondsAfterFinished: "Seconds after a Job completes before it is garbage-collected (default: 900).",
      podActivityDeadlineSec: "Hard ceiling on a single run's wall-clock time (default: 3600).",
      adapterType: "The adapter type that Jobs in this environment will run (e.g. `claude_local`, `codex_local`). Defaults to `claude_local`. Each environment is bound to one adapter; create multiple environments for different adapters.",
      backend: "sandbox-cr (default, alpha — requires kubernetes-sigs/agent-sandbox installed) | job (stable fallback — batch/v1 Job, one-shot entrypoint, no multi-command exec)",
    };
    const ptBrDescriptions = {
      inCluster: "Quando ativo, o plugin usa as credenciais da ServiceAccount dentro do pod. Requer que paperclip-server esteja em execução dentro do cluster de destino.",
      kubeconfig: "YAML inline do kubeconfig. Cole um kubeconfig ou uma referência existente a um segredo do Paperclip; valores colados são armazenados como segredos da organização.",
      namespacePrefix: "Prefixo do namespace de tenant por organização (padrão: paperclip-).",
      companySlug: "Substitui o slug da organização derivado automaticamente e usado no nome do namespace de tenant.",
      imageRegistry: "Substitui o registro padrão para imagens de runtime de agentes (padrão: ghcr.io/paperclipai).",
      imageAllowList: "Padrões glob dos valores `target.imageOverride` permitidos. Uma lista vazia = nenhuma substituição permitida.",
      imagePullSecrets: "Nomes de segredos de pull de imagens Docker pré-criados no namespace de tenant.",
      egressAllowFqdns: "FQDNs adicionais para os quais os pods de agentes podem ter tráfego de saída. FQDNs padrão do adapter (por exemplo, api.anthropic.com) são adicionados automaticamente.",
      egressAllowCidrs: "CIDRs adicionais para os quais os pods de agentes podem ter tráfego de saída.",
      egressMode: "Modo da política de rede. `cilium` ativa a filtragem de tráfego de saída baseada em FQDN por meio de CiliumNetworkPolicy.",
      runtimeClassName: "RuntimeClass opcional para isolamento de pods (por exemplo, `kata-fc` para microVMs com Firecracker). O cluster deve ter a RuntimeClass instalada.",
      serviceAccountAnnotations: "Anotações aplicadas à ServiceAccount por tenant (por exemplo, `eks.amazonaws.com/role-arn` para IRSA).",
      jobTtlSecondsAfterFinished: "Segundos após a conclusão de um Job antes de ele ser removido como lixo (padrão: 900).",
      podActivityDeadlineSec: "Limite rígido de tempo de parede para uma execução (padrão: 3600).",
      adapterType: "Tipo de adapter que os Jobs deste ambiente executarão (por exemplo, `claude_local`, `codex_local`). O padrão é `claude_local`. Cada ambiente é vinculado a um adapter; crie vários ambientes para adapters diferentes.",
      backend: "sandbox-cr (padrão, alfa — requer kubernetes-sigs/agent-sandbox instalado) | job (fallback estável — Job batch/v1, entrypoint de execução única, sem exec de vários comandos)",
    };
    const ptBrNames = {
      inCluster: "Usar credenciais do cluster",
      kubeconfig: "Kubeconfig YAML",
      namespacePrefix: "Prefixo do namespace",
      companySlug: "Slug da organização",
      imageRegistry: "Registro de imagens",
      imageAllowList: "Padrões de imagens permitidas",
      imagePullSecrets: "Segredos de pull de imagem",
      egressAllowFqdns: "FQDNs de saída permitidos",
      egressAllowCidrs: "CIDRs de saída permitidos",
      egressMode: "Modo da política de saída",
      runtimeClassName: "RuntimeClass",
      serviceAccountAnnotations: "Anotações da ServiceAccount",
      jobTtlSecondsAfterFinished: "Tempo para limpeza do Job (s)",
      podActivityDeadlineSec: "Limite de execução (s)",
      adapterType: "Tipo de adapter",
      backend: "Backend do Kubernetes",
    };
    const enNames = {
      inCluster: "Use in-cluster credentials",
      kubeconfig: "Kubeconfig YAML",
      namespacePrefix: "Namespace prefix",
      companySlug: "Company slug override",
      imageRegistry: "Image registry",
      imageAllowList: "Allowed image patterns",
      imagePullSecrets: "Image pull secrets",
      egressAllowFqdns: "Allowed egress FQDNs",
      egressAllowCidrs: "Allowed egress CIDRs",
      egressMode: "Egress policy mode",
      runtimeClassName: "RuntimeClass",
      serviceAccountAnnotations: "ServiceAccount annotations",
      jobTtlSecondsAfterFinished: "Job cleanup delay (s)",
      podActivityDeadlineSec: "Run time limit (s)",
      adapterType: "Adapter type",
      backend: "Kubernetes backend",
    };
    const schema = {
      type: "object",
      properties: {
        inCluster: { type: "boolean", description: sourceDescriptions.inCluster },
        kubeconfig: { type: "string", format: "secret-ref", description: sourceDescriptions.kubeconfig },
        namespacePrefix: { type: "string", description: sourceDescriptions.namespacePrefix },
        companySlug: { type: "string", description: sourceDescriptions.companySlug },
        imageRegistry: { type: "string", description: sourceDescriptions.imageRegistry },
        imageAllowList: { type: "array", items: { type: "string" }, description: sourceDescriptions.imageAllowList },
        imagePullSecrets: { type: "array", items: { type: "string" }, description: sourceDescriptions.imagePullSecrets },
        egressAllowFqdns: { type: "array", items: { type: "string" }, description: sourceDescriptions.egressAllowFqdns },
        egressAllowCidrs: { type: "array", items: { type: "string" }, description: sourceDescriptions.egressAllowCidrs },
        egressMode: { type: "string", enum: ["standard", "cilium"], description: sourceDescriptions.egressMode },
        runtimeClassName: { type: "string", description: sourceDescriptions.runtimeClassName },
        serviceAccountAnnotations: { type: "object", additionalProperties: { type: "string" }, description: sourceDescriptions.serviceAccountAnnotations },
        jobTtlSecondsAfterFinished: { type: "integer", minimum: 0, description: sourceDescriptions.jobTtlSecondsAfterFinished },
        podActivityDeadlineSec: { type: "integer", minimum: 1, description: sourceDescriptions.podActivityDeadlineSec },
        adapterType: { type: "string", description: sourceDescriptions.adapterType },
        backend: { type: "string", enum: ["sandbox-cr", "job"], description: sourceDescriptions.backend },
        customField: { type: "string", title: "Provider-owned field", description: "Provider-owned help text." },
      },
      anyOf: [{ required: ["inCluster"] }, { required: ["kubeconfig"] }],
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      inCluster: false,
      kubeconfig: "company-secret-ref",
      namespacePrefix: "tenant-",
      companySlug: "my-company",
      imageRegistry: "registry.example.test/agents",
      imageAllowList: ["ghcr.io/example/*"],
      imagePullSecrets: ["registry-credentials"],
      egressAllowFqdns: ["api.example.test"],
      egressAllowCidrs: ["192.0.2.0/24"],
      egressMode: "cilium",
      runtimeClassName: "kata-fc",
      serviceAccountAnnotations: { "example.com/role": "agent" },
      jobTtlSecondsAfterFinished: 1200,
      podActivityDeadlineSec: 7200,
      adapterType: "codex_local",
      backend: "job",
      arbitraryValue: { keep: true },
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("kubernetes", pluginId, schema, i18n.t, trustedBundle)!;
    const expectedNames = locale === "pt-BR" ? ptBrNames : enNames;
    const expectedDescriptions = locale === "pt-BR" ? ptBrDescriptions : sourceDescriptions;

    for (const [fieldKey, sourceDescription] of Object.entries(sourceDescriptions)) {
      const translationKey = `pluginPresentation.sandboxProviderConfigFields.kubernetes.${fieldKey}`;
      expect(i18n.exists(`${translationKey}.name`, { lng: locale })).toBe(true);
      expect(i18n.exists(`${translationKey}.description`, { lng: locale })).toBe(true);
      const sourceField = schema.properties[fieldKey as keyof typeof schema.properties];
      expect(localized.properties[fieldKey as keyof typeof localized.properties]).toEqual({
        ...sourceField,
        title: expectedNames[fieldKey as keyof typeof expectedNames],
        description: expectedDescriptions[fieldKey as keyof typeof expectedDescriptions],
      });
      expect(sourceDescription).toBeTruthy();
    }
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(localized.anyOf).toEqual([{ required: ["inCluster"] }, { required: ["kubeconfig"] }]);
    expect(localized.properties.egressMode).toMatchObject({ enum: ["standard", "cilium"] });
    expect(localized.properties.jobTtlSecondsAfterFinished).toMatchObject({ minimum: 0 });
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/kubernetes/src/manifest.ts", import.meta.url),
      "utf8",
    );
    const packageJson = JSON.parse(readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/kubernetes/package.json", import.meta.url),
      "utf8",
    )) as { name: string };
    expect(packageJson.name).toBe(packageName);
    expect(manifestSource).toContain(`const PLUGIN_ID = "${pluginId}"`);
    expect(manifestSource).toContain('driverKey: "kubernetes"');
    for (const sourceDescription of Object.values(sourceDescriptions)) {
      expect(manifestSource).toContain(sourceDescription);
    }

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-kubernetes-id",
      packageName: "vendor/kubernetes-compatible",
      packagePath: "/custom/vendor/kubernetes-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-kubernetes-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("kubernetes", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const wrongManifestIdentity = isTrustedBundledSandboxProvider(
      { pluginId: pluginRecordId, pluginKey: pluginId },
      [{ ...installed[0]!, manifestJson: { id: "paperclip.daytona-sandbox-provider" } }],
      bundled,
    );
    expect(wrongManifestIdentity).toBe(false);
    expect(localizeSandboxProviderConfigSchema("kubernetes", pluginId, schema, i18n.t, wrongManifestIdentity)).toBe(schema);
    expect(localizeSandboxProviderConfigSchema("kubernetes", "paperclip.fake-sandbox-provider", schema, i18n.t, true)).toBe(schema);

    const changedSourceSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        kubeconfig: { ...schema.properties.kubeconfig, description: "Vendor-authored Kubernetes-compatible kubeconfig help." },
      },
    };
    const changedSourcePresentation = localizeSandboxProviderConfigSchema("kubernetes", pluginId, changedSourceSchema, i18n.t, true)!;
    expect(changedSourcePresentation.properties.kubeconfig).toEqual(changedSourceSchema.properties.kubeconfig);
  });

  it.each([
    ["pt-BR", "Token de API", "Cole seu token de API do exe.dev", "VM de origem", "Acesso SSH", "Recursos da VM", "Criação da VM", "API e runtime"],
    ["en", "API token", "Paste your exe.dev API token", "Source VM", "SSH access", "VM resources", "VM creation", "API + runtime"],
  ] as const)("localizes exe.dev schema metadata only for the exact bundled source in %s", async (
    locale,
    apiKeyTitle,
    apiKeyDescriptionStart,
    sourceVmTitle,
    sshGroup,
    resourcesGroup,
    creationGroup,
    runtimeGroup,
  ) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.exe-dev-sandbox-provider";
    const pluginRecordId = "bundled-exe-dev-plugin-id";
    const packageName = "@paperclipai/plugin-exe-dev";
    const bundlePath = "/app/packages/plugins/sandbox-providers/exe-dev";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const sourceDescriptions = [
      "Paste your exe.dev API token, or pick a saved Paperclip secret. Create one at exe.dev → Settings → API tokens with `/exec` scope (`new`, `ls`, `rm`, plus `cp` if you use Source VM).",
      "Paste the SSH private key you registered with exe.dev, or pick a saved secret. Leave blank to fall back to an on-host key (see Advanced → SSH access).",
      "Login user on the VM. Leave blank to use the image default, usually `root`.",
      "Absolute path to a private key on the Paperclip host. Used only when SSH Private Key is empty.",
      "SSH port for direct VM access.",
      "Host key policy passed to ssh via StrictHostKeyChecking. Typical values are `accept-new`, `yes`, or `no`.",
      "Optional container image to use when creating the VM.",
      "Optional CPU count passed to `exe.dev new --cpu`.",
      "Optional memory size such as `4GB`.",
      "Optional disk size such as `20GB`.",
      "Name of an existing exe.dev VM to copy for each run with `exe.dev cp`, disk and config included. Leave blank to create a fresh VM with `exe.dev new`. Your API token must allow `cp`: tokens list their permitted commands, and one without `cp` fails with a 403. When set, leave image, command, env, integrations, tags, setup script, prompt, and comment empty: `cp` cannot apply them, and saving fails until they are cleared.",
      "Optional container command passed to `exe.dev new --command`.",
      "Optional environment variables applied at VM creation time.",
      "Optional exe.dev integrations to attach during VM creation.",
      "Optional tags to apply during VM creation.",
      "Optional first-boot setup script passed to `exe.dev new --setup-script`.",
      "Optional Shelley prompt passed to `exe.dev new --prompt`.",
      "Optional short note attached to created VMs.",
      "Optional prefix used when generating VM names.",
      "Optional exe.dev HTTPS API base URL or /exec endpoint. Defaults to https://exe.dev/exec.",
      "Timeout for VM lifecycle and SSH operations in milliseconds.",
      "Whether to keep the VM alive between runs instead of deleting it on release.",
    ];
    const schema = {
      type: "object",
      properties: {
        apiKey: { type: "string", format: "secret-ref", description: sourceDescriptions[0] },
        sshPrivateKey: { type: "string", format: "secret-ref", description: sourceDescriptions[1] },
        sshUser: { type: "string", description: sourceDescriptions[2], "x-paperclip-advanced": true, "x-paperclip-group": "SSH access" },
        sshIdentityFile: { type: "string", description: sourceDescriptions[3], "x-paperclip-advanced": true, "x-paperclip-group": "SSH access" },
        sshPort: { type: "number", default: 22, description: sourceDescriptions[4], "x-paperclip-advanced": true, "x-paperclip-group": "SSH access" },
        strictHostKeyChecking: { type: "string", default: "accept-new", description: sourceDescriptions[5], "x-paperclip-advanced": true, "x-paperclip-group": "SSH access" },
        image: { type: "string", description: sourceDescriptions[6], "x-paperclip-advanced": true, "x-paperclip-group": "VM resources" },
        cpu: { type: "number", default: 4, description: sourceDescriptions[7], "x-paperclip-advanced": true, "x-paperclip-group": "VM resources" },
        memory: { type: "string", default: "4GB", description: sourceDescriptions[8], "x-paperclip-advanced": true, "x-paperclip-group": "VM resources" },
        disk: { type: "string", default: "20GB", description: sourceDescriptions[9], "x-paperclip-advanced": true, "x-paperclip-group": "VM resources" },
        sourceVm: { type: "string", title: "Source VM", description: sourceDescriptions[10], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        command: { type: "string", description: sourceDescriptions[11], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        env: { type: "object", description: sourceDescriptions[12], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        integrations: { type: "array", description: sourceDescriptions[13], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        tags: { type: "array", description: sourceDescriptions[14], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        setupScript: { type: "string", description: sourceDescriptions[15], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        prompt: { type: "string", description: sourceDescriptions[16], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        comment: { type: "string", description: sourceDescriptions[17], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        namePrefix: { type: "string", default: "paperclip", description: sourceDescriptions[18], "x-paperclip-advanced": true, "x-paperclip-group": "VM creation" },
        apiUrl: { type: "string", description: sourceDescriptions[19], "x-paperclip-advanced": true, "x-paperclip-group": "API + runtime" },
        timeoutMs: { type: "number", default: 300000, description: sourceDescriptions[20], "x-paperclip-advanced": true, "x-paperclip-group": "API + runtime" },
        reuseLease: { type: "boolean", default: false, description: sourceDescriptions[21], "x-paperclip-advanced": true, "x-paperclip-group": "API + runtime" },
        customField: { type: "string", title: "Provider-owned field", description: "Vendor-owned help text." },
      },
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      apiKey: "11111111-1111-4111-8111-111111111111",
      sshUser: "root",
      sourceVm: "build-image",
      cpu: 8,
      namePrefix: "team-vm",
      reuseLease: true,
      customValue: "leave untouched",
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("exe-dev", pluginId, schema, i18n.t, trustedBundle)!;

    expect(localized.properties.apiKey).toMatchObject({ title: apiKeyTitle });
    expect(localized.properties.apiKey.description.startsWith(apiKeyDescriptionStart)).toBe(true);
    expect(localized.properties.sourceVm).toMatchObject({ title: sourceVmTitle });
    expect(localized.properties.sshUser).toMatchObject({ "x-paperclip-group": sshGroup });
    expect(localized.properties.cpu).toMatchObject({ default: 4, "x-paperclip-group": resourcesGroup });
    expect(localized.properties.command).toMatchObject({ "x-paperclip-group": creationGroup });
    expect(localized.properties.apiUrl).toMatchObject({ "x-paperclip-group": runtimeGroup });
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/exe-dev/src/manifest.ts", import.meta.url),
      "utf8",
    );
    for (const sourceDescription of sourceDescriptions) expect(manifestSource).toContain(sourceDescription);

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-exe-dev-id",
      packageName: "vendor/exe-dev-compatible",
      packagePath: "/custom/vendor/exe-dev-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-exe-dev-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("exe-dev", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const wrongManifestIdentity = isTrustedBundledSandboxProvider(
      { pluginId: pluginRecordId, pluginKey: pluginId },
      [{ ...installed[0]!, manifestJson: { id: "paperclip.createos-sandbox-provider" } }],
      bundled,
    );
    expect(wrongManifestIdentity).toBe(false);
    expect(localizeSandboxProviderConfigSchema("exe-dev", pluginId, schema, i18n.t, wrongManifestIdentity)).toBe(schema);

    const changedSourceSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        apiKey: { ...schema.properties.apiKey, description: "Vendor-authored exe.dev compatible token help." },
      },
    };
    const changedSourcePresentation = localizeSandboxProviderConfigSchema("exe-dev", pluginId, changedSourceSchema, i18n.t, true)!;
    expect(changedSourcePresentation.properties.apiKey).toEqual(changedSourceSchema.properties.apiKey);
  });

  it.each([
    ["pt-BR", "URL da API", "Chave de API", "Formato", "Escolha o tamanho de CPU e memória do sandbox."],
    ["en", "API URL", "API key", "Shape", "Choose the sandbox CPU and memory size."],
  ] as const)("localizes CreateOS schema metadata only for the exact bundled source in %s", async (
    locale,
    apiUrlTitle,
    apiKeyTitle,
    shapeTitle,
    shapeDescription,
  ) => {
    await i18n.changeLanguage(locale);
    const pluginId = "paperclip.createos-sandbox-provider";
    const pluginRecordId = "bundled-createos-plugin-id";
    const packageName = "@paperclipai/plugin-createos";
    const bundlePath = "/app/packages/plugins/sandbox-providers/createos";
    const installed = [{
      id: pluginRecordId,
      pluginKey: pluginId,
      packageName,
      packagePath: bundlePath,
      manifestJson: { id: pluginId },
    }];
    const bundled = [{ pluginKey: pluginId, packageName, localPath: bundlePath }];
    const trustedBundle = isTrustedBundledSandboxProvider({ pluginId: pluginRecordId, pluginKey: pluginId }, installed, bundled);
    expect(trustedBundle).toBe(true);

    const sourceDescriptions = [
      "https://api.sb.createos.sh",
      "CreateOS API key or Paperclip secret reference. Saved keys become company secrets. The official API endpoint can use CREATEOS_API_KEY from the host; custom endpoints require an explicit key.",
      "Choose the sandbox CPU and memory size.",
      "Root filesystem or ready template ID/name. Omit to use the provider default. The image must supply Bash and the selected agent runtime dependencies.",
      "Optional region; must match the API endpoint's region.",
      "Operation and default command timeout in milliseconds. This is not a sandbox lifetime.",
      "Pause the sandbox after a run and resume it for subsequent runs instead of deleting it.",
    ];
    const schema = {
      type: "object",
      required: ["apiUrl", "shape"],
      properties: {
        apiUrl: { type: "string", title: "API URL", default: "https://api.sb.createos.sh", description: sourceDescriptions[0] },
        apiKey: { type: "string", format: "secret-ref", description: sourceDescriptions[1] },
        shape: {
          type: "string",
          title: "Shape",
          description: sourceDescriptions[2],
          enum: ["s-1vcpu-256mb", "s-0.5vcpu-1gb", "s-2vcpu-4gb"],
        },
        rootfs: { type: "string", description: sourceDescriptions[3] },
        region: { type: "string", description: sourceDescriptions[4] },
        timeoutMs: { type: "integer", minimum: 1, maximum: 86400000, default: 300000, description: sourceDescriptions[5] },
        reuseLease: { type: "boolean", default: false, description: sourceDescriptions[6] },
        customField: { type: "string", title: "Provider-owned field", description: "Vendor-owned help text." },
      },
    };
    const schemaBefore = JSON.stringify(schema);
    const configuration = {
      apiUrl: "https://api.sb.createos.sh",
      apiKey: "22222222-2222-4222-8222-222222222222",
      shape: "s-2vcpu-4gb",
      region: "us-west",
      timeoutMs: 600000,
      reuseLease: true,
      customValue: "keep this value",
    };
    const configurationBefore = JSON.stringify(configuration);
    const localized = localizeSandboxProviderConfigSchema("createos", pluginId, schema, i18n.t, trustedBundle)!;

    expect(localized.properties.apiUrl).toMatchObject({ title: apiUrlTitle, default: "https://api.sb.createos.sh" });
    expect(localized.properties.apiKey).toMatchObject({ title: apiKeyTitle, format: "secret-ref" });
    expect(localized.properties.shape).toMatchObject({ title: shapeTitle, description: shapeDescription, enum: schema.properties.shape.enum });
    expect(localized.properties.timeoutMs).toMatchObject({ minimum: 1, maximum: 86400000, default: 300000 });
    expect(localized.properties.customField).toEqual(schema.properties.customField);
    expect(localized.required).toEqual(["apiUrl", "shape"]);
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(configuration)).toBe(configurationBefore);

    const manifestSource = readFileSync(
      new URL("../../../packages/plugins/sandbox-providers/createos/src/manifest.ts", import.meta.url),
      "utf8",
    );
    for (const sourceDescription of sourceDescriptions) expect(manifestSource).toContain(sourceDescription);

    const externalInstalled = [{
      ...installed[0]!,
      id: "vendor-createos-id",
      packageName: "vendor/createos-compatible",
      packagePath: "/custom/vendor/createos-compatible",
    }];
    const externalTrustedBundle = isTrustedBundledSandboxProvider(
      { pluginId: "vendor-createos-id", pluginKey: pluginId },
      externalInstalled,
      bundled,
    );
    expect(externalTrustedBundle).toBe(false);
    expect(localizeSandboxProviderConfigSchema("createos", pluginId, schema, i18n.t, externalTrustedBundle)).toBe(schema);

    const wrongManifestIdentity = isTrustedBundledSandboxProvider(
      { pluginId: pluginRecordId, pluginKey: pluginId },
      [{ ...installed[0]!, manifestJson: { id: "paperclip.exe-dev-sandbox-provider" } }],
      bundled,
    );
    expect(wrongManifestIdentity).toBe(false);
    expect(localizeSandboxProviderConfigSchema("createos", pluginId, schema, i18n.t, wrongManifestIdentity)).toBe(schema);
    expect(localizeSandboxProviderConfigSchema("createos", "paperclip.exe-dev-sandbox-provider", schema, i18n.t, true)).toBe(schema);
  });

  it("localizes managed-resource plugin attribution only with matching installed and bundled identity", async () => {
    const attribution = {
      pluginId: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      pluginDisplayName: "Workspace Changes",
    };
    const installed = [{
      id: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
      manifestJson: { id: "paperclip.workspace-diff", displayName: "Workspace Changes" },
    }];
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];

    await i18n.changeLanguage("pt-BR");
    expect(localizeManagedPluginDisplayName(attribution, installed, bundled, i18n.t))
      .toBe("Alterações no workspace");

    expect(localizeManagedPluginDisplayName(attribution, undefined, bundled, i18n.t))
      .toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, installed, undefined, i18n.t))
      .toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, [{
      ...installed[0], id: "other-plugin",
    }], bundled, i18n.t)).toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, [{
      ...installed[0], manifestJson: { ...installed[0].manifestJson, displayName: "Stale name" },
    }], bundled, i18n.t)).toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName(attribution, [{
      ...installed[0], packagePath: "/custom/vendor-copy",
    }], bundled, i18n.t)).toBe("Workspace Changes");
    expect(localizeManagedPluginDisplayName({
      ...attribution,
      pluginKey: "vendor.workspace-diff",
      pluginDisplayName: "External Workspace Tool",
    }, installed, bundled, i18n.t)).toBe("External Workspace Tool");
  });

  it("localizes only unchanged LLM Wiki resource names from an exactly bundled source", async () => {
    const attribution = {
      pluginId: "wiki-plugin",
      pluginKey: "paperclipai.plugin-llm-wiki",
      pluginDisplayName: "LLM Wiki",
    };
    const installed = [{
      id: "wiki-plugin",
      pluginKey: "paperclipai.plugin-llm-wiki",
      packageName: "@paperclipai/plugin-llm-wiki",
      packagePath: "/app/packages/plugins/plugin-llm-wiki",
      manifestJson: { id: "paperclipai.plugin-llm-wiki", displayName: "LLM Wiki" },
    }];
    const bundled = [{
      pluginKey: "paperclipai.plugin-llm-wiki",
      packageName: "@paperclipai/plugin-llm-wiki",
      localPath: "/app/packages/plugins/plugin-llm-wiki",
    }];

    await i18n.changeLanguage("pt-BR");
    const skillAttribution = { ...attribution, resourceKind: "skill" as const, resourceKey: "wiki-ingest" };
    const persistedResource = { id: "wiki-ingest-id", name: "Wiki Ingest", description: "Original content" };
    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      persistedResource.name,
      installed,
      bundled,
      i18n.t,
    )).toBe("Ingestão do Wiki");
    expect(persistedResource).toEqual({ id: "wiki-ingest-id", name: "Wiki Ingest", description: "Original content" });

    expect(localizeManagedPluginResourceDisplayName(
      { ...attribution, resourceKind: "routine", resourceKey: "nightly-wiki-lint" },
      "Run LLM Wiki lint",
      installed,
      bundled,
      i18n.t,
    )).toBe("Executar verificação do LLM Wiki");
    expect(localizeManagedPluginResourceDisplayName(
      { ...attribution, resourceKind: "agent", resourceKey: "wiki-maintainer" },
      "Wiki Maintainer",
      installed,
      bundled,
      i18n.t,
    )).toBe("Responsável pelo Wiki");

    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      "Team's renamed ingestion guide",
      installed,
      bundled,
      i18n.t,
    )).toBe("Team's renamed ingestion guide");
    expect(localizeManagedPluginResourceDisplayName(
      undefined,
      "Unmanaged skill name",
      installed,
      bundled,
      i18n.t,
    )).toBe("Unmanaged skill name");
    expect(localizeManagedPluginResourceDisplayName(
      { ...skillAttribution, resourceKey: "unknown-skill" },
      "Third-party skill name",
      installed,
      bundled,
      i18n.t,
    )).toBe("Third-party skill name");
    expect(localizeManagedPluginResourceDisplayName(
      { ...skillAttribution, pluginKey: "vendor.plugin-llm-wiki", pluginDisplayName: "Vendor Wiki" },
      "Vendor skill name",
      installed,
      bundled,
      i18n.t,
    )).toBe("Vendor skill name");
    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      persistedResource.name,
      [{ ...installed[0], packageName: "vendor/copied-llm-wiki", packagePath: "/custom/vendor-copy" }],
      bundled,
      i18n.t,
    )).toBe("Wiki Ingest");
    expect(localizeManagedPluginResourceDisplayName(
      skillAttribution,
      persistedResource.name,
      installed,
      undefined,
      i18n.t,
    )).toBe("Wiki Ingest");
  });

  it("requires a UI contribution to match its installed record and exact bundled package", () => {
    const contribution = { pluginId: "plugin-workspace", pluginKey: "paperclip.workspace-diff" };
    const installed = [{
      id: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      packagePath: "/app/packages/plugins/plugin-workspace-diff",
      manifestJson: { id: "paperclip.workspace-diff" },
    }];
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];

    expect(isTrustedBundledPluginContribution(contribution, installed, bundled)).toBe(true);
    expect(isTrustedBundledPluginContribution({ ...contribution, pluginId: "other-plugin" }, installed, bundled)).toBe(false);
    expect(isTrustedBundledPluginContribution(contribution, [{
      ...installed[0], packagePath: "/custom/copied-plugin",
    }], bundled)).toBe(false);
    expect(isTrustedBundledPluginContribution(contribution, [{
      ...installed[0], manifestJson: { id: "vendor.workspace-diff" },
    }], bundled)).toBe(false);
    expect(isTrustedBundledPluginContribution(contribution, undefined, undefined)).toBe(false);
  });

  it("preserves external metadata when a package reuses a first-party manifest ID", async () => {
    await i18n.changeLanguage("pt-BR");
    const bundled = [{
      pluginKey: "paperclip.workspace-diff",
      packageName: "@paperclipai/plugin-workspace-diff",
      localPath: "/app/packages/plugins/plugin-workspace-diff",
    }];
    const external = {
      pluginKey: "paperclip.workspace-diff",
      packageName: "vendor/copied-workspace-plugin",
      packagePath: "/custom/vendor/copied-workspace-plugin",
    };
    const isTrustedBundle = isBundledPluginRecord(external, bundled);

    expect(localizePluginPresentation(
      "paperclip.workspace-diff",
      "Vendor Workspace Tool",
      "The external manifest description remains verbatim.",
      i18n.t,
      isTrustedBundle,
    )).toEqual({
      displayName: "Vendor Workspace Tool",
      description: "The external manifest description remains verbatim.",
    });
  });

  it("localizes first-party plugin metadata in Portuguese and English", async () => {
    const fallback = {
      displayName: "Workspace Changes",
      description: "Adds a Changes tab to execution and project workspaces using plugin-local Git diff computation and @pierre/diffs.",
    };

    await i18n.changeLanguage("pt-BR");
    expect(localizePluginPresentation("paperclip.workspace-diff", fallback.displayName, fallback.description, i18n.t, true))
      .toEqual({
        displayName: "Alterações no workspace",
        description: "Adiciona uma aba de alterações aos workspaces de execução e de projetos usando o cálculo de diff do Git do próprio plugin e @pierre/diffs.",
      });

    await i18n.changeLanguage("en");
    expect(localizePluginPresentation("paperclip.workspace-diff", fallback.displayName, fallback.description, i18n.t, true))
      .toEqual(fallback);
  });

  it("localizes only allowlisted labels from verified own UI slot declarations", async () => {
    const ownContribution = {
      pluginId: "plugin-workspace",
      pluginKey: "paperclip.workspace-diff",
      displayName: "Workspace Changes",
      version: "0.1.0",
      uiEntryFile: "index.js",
      slots: [{
        type: "detailTab",
        id: "workspace-changes-tab",
        displayName: "Changes",
        exportName: "ChangesTab",
      }],
      launchers: [],
    };

    await i18n.changeLanguage("pt-BR");
    const portuguesePresentation = localizePluginUiContributionPresentation(ownContribution, i18n.t, true);
    expect(portuguesePresentation).toEqual({
      pluginDisplayName: "Alterações no workspace",
      slotDisplayNames: { "workspace-changes-tab": "Alterações" },
      launcherDisplayNames: {},
    });
    expect(ownContribution.displayName).toBe("Workspace Changes");
    expect(ownContribution.slots[0]?.displayName).toBe("Changes");

    await i18n.changeLanguage("en");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true)).toEqual({
      pluginDisplayName: "Workspace Changes",
      slotDisplayNames: { "workspace-changes-tab": "Changes" },
      launcherDisplayNames: {},
    });
  });

  it("preserves copied plugin contribution metadata and non-static slot text", async () => {
    await i18n.changeLanguage("pt-BR");
    const copiedContribution = {
      pluginId: "external-plugin",
      pluginKey: "paperclip.workspace-diff",
      displayName: "Vendor Changes",
      version: "9.0.0",
      uiEntryFile: "index.js",
      slots: [{
        type: "detailTab",
        id: "workspace-changes-tab",
        displayName: "Vendor supplied label",
        exportName: "ChangesTab",
      }],
      launchers: [],
    };

    expect(localizePluginUiContributionPresentation(copiedContribution, i18n.t, false)).toEqual({
      pluginDisplayName: "Vendor Changes",
      slotDisplayNames: {},
      launcherDisplayNames: {},
    });
    expect(copiedContribution.displayName).toBe("Vendor Changes");
    expect(copiedContribution.slots[0]?.displayName).toBe("Vendor supplied label");
    const trustedPresentation = localizePluginUiContributionPresentation({
      ...copiedContribution,
      pluginId: "plugin-workspace",
      displayName: "Workspace Changes",
      slots: [{ ...copiedContribution.slots[0], displayName: "User supplied label" }],
    }, i18n.t, true);
    expect(trustedPresentation.slotDisplayNames["workspace-changes-tab"]).toBeUndefined();
  });

  it("localizes allowlisted File Browser slots and Kitchen Sink launchers without rewriting declarations", async () => {
    const ownContribution = {
      pluginKey: "paperclip-file-browser-example",
      displayName: "File Browser (Example)",
      slots: [
        { id: "files-link", displayName: "Files" },
        { id: "files-tab", displayName: "Files" },
        { id: "comment-file-links", displayName: "File Links" },
        { id: "comment-open-files", displayName: "Open in Files" },
      ],
      launchers: [],
    };
    const ownLauncherContribution = {
      pluginKey: "paperclip-kitchen-sink-example",
      displayName: "Kitchen Sink (Example)",
      slots: [],
      launchers: [{ id: "kitchen-sink-launcher", displayName: "Kitchen Sink Modal" }],
    };

    await i18n.changeLanguage("pt-BR");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true)).toEqual({
      pluginDisplayName: "Navegador de arquivos (exemplo)",
      slotDisplayNames: {
        "files-link": "Arquivos",
        "files-tab": "Arquivos",
        "comment-file-links": "Links de arquivos",
        "comment-open-files": "Abrir em Arquivos",
      },
      launcherDisplayNames: {},
    });
    expect(localizePluginUiContributionPresentation(ownLauncherContribution, i18n.t, true).launcherDisplayNames)
      .toEqual({ "kitchen-sink-launcher": "Modal do Kitchen Sink" });
    expect(localizePluginUiContributionPresentation(ownLauncherContribution, i18n.t, false)).toEqual({
      pluginDisplayName: "Kitchen Sink (Example)",
      slotDisplayNames: {},
      launcherDisplayNames: {},
    });
    expect(localizePluginUiContributionPresentation({
      ...ownLauncherContribution,
      launchers: [{ id: "kitchen-sink-launcher", displayName: "Operator-customized modal" }],
    }, i18n.t, true).launcherDisplayNames).toEqual({});
    expect(ownContribution.slots.map((slot) => slot.displayName)).toEqual([
      "Files", "Files", "File Links", "Open in Files",
    ]);
    expect(ownLauncherContribution.launchers[0]?.displayName).toBe("Kitchen Sink Modal");

    // A matching slot ID and label from another package does not select a translation.
    const collidingPluginContribution = {
      ...ownContribution,
      pluginKey: "vendor.file-browser-compatible",
      slots: [{ id: "files-tab", displayName: "Files" }],
    };
    expect(localizePluginUiContributionPresentation(collidingPluginContribution, i18n.t, true).slotDisplayNames)
      .toEqual({});

    await i18n.changeLanguage("en");
    expect(localizePluginUiContributionPresentation(ownContribution, i18n.t, true).slotDisplayNames)
      .toEqual({
        "files-link": "Files",
        "files-tab": "Files",
        "comment-file-links": "File Links",
        "comment-open-files": "Open in Files",
      });
    expect(localizePluginUiContributionPresentation(ownLauncherContribution, i18n.t, true).launcherDisplayNames)
      .toEqual({ "kitchen-sink-launcher": "Kitchen Sink Modal" });
  });

  it("localizes first-party sandbox metadata and preserves unknown provider text", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(localizeSandboxProviderPresentation(
      "daytona",
      "paperclip.daytona-sandbox-provider",
      "Daytona Sandbox",
      "Provisions Daytona sandboxes with configurable image or snapshot selection, startup timeouts, and lease reuse.",
      i18n.t,
      true,
    )).toEqual({
      displayName: "Sandbox Daytona",
      description: "Provisiona sandboxes do Daytona com seleção de imagem ou snapshot, timeouts de inicialização e reutilização de leases configuráveis.",
    });

    const external = localizeSandboxProviderPresentation(
      "vendor-container",
      "vendor.sandbox-provider",
      "Fornecedor Externo",
      "Texto do provedor; preserve it verbatim.",
      i18n.t,
    );
    expect(external).toEqual({
      displayName: "Fornecedor Externo",
      description: "Texto do provedor; preserve it verbatim.",
    });

    expect(localizeSandboxProviderPresentation(
      "daytona",
      "vendor.daytona-compat-provider",
      "Vendor Daytona Compat",
      "A vendor-owned provider reusing a familiar key stays unchanged.",
      i18n.t,
      true,
    )).toEqual({
      displayName: "Vendor Daytona Compat",
      description: "A vendor-owned provider reusing a familiar key stays unchanged.",
    });
  });

  it("localizes an owned managed-folder declaration only for its verified plugin", async () => {
    await i18n.changeLanguage("pt-BR");
    const fallbackDescription = "Company-scoped local folder that stores raw sources, wiki pages, Paperclip project standups under wiki/projects/, AGENTS.md, IDEA.md, wiki/index.md, and wiki/log.md.";

    expect(localizePluginLocalFolderPresentation(
      "paperclipai.plugin-llm-wiki",
      "wiki-root",
      "Wiki root",
      fallbackDescription,
      i18n.t,
      true,
    )).toEqual({
      displayName: "Pasta raiz da Wiki",
      description: "Pasta local da organização que armazena fontes brutas, páginas da Wiki, sínteses dos projetos do Paperclip em wiki/projects/, AGENTS.md, IDEA.md, wiki/index.md e wiki/log.md.",
    });

    expect(localizePluginLocalFolderPresentation(
      "paperclipai.plugin-llm-wiki",
      "wiki-root",
      "Vendor Wiki root",
      "Vendor metadata remains unchanged.",
      i18n.t,
      false,
    )).toEqual({
      displayName: "Vendor Wiki root",
      description: "Vendor metadata remains unchanged.",
    });
    expect(localizePluginLocalFolderPresentation(
      "vendor.wiki-compatible",
      "wiki-root",
      "Compatible folder",
      "A vendor reused the folder key.",
      i18n.t,
      true,
    )).toEqual({
      displayName: "Compatible folder",
      description: "A vendor reused the folder key.",
    });
  });

  it("preserves names and descriptions from external plugin manifests", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(localizePluginPresentation(
      "vendor.search-provider",
      "外部 Search Provider",
      "Vendor-owned description stays in its original language.",
      i18n.t,
      false,
    )).toEqual({
      displayName: "外部 Search Provider",
      description: "Vendor-owned description stays in its original language.",
    });

    expect(localizePluginPresentation(
      "paperclip.workspace-diff",
      "Workspace Changes",
      "Manifest ID reused by an external package.",
      i18n.t,
      false,
    )).toEqual({
      displayName: "Workspace Changes",
      description: "Manifest ID reused by an external package.",
    });
  });
});
