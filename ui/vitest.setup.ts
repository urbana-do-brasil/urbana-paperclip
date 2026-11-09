const storageEntries = new Map<string, string>();

function installStorageMock(target: Record<string, unknown>) {
  Object.defineProperty(target, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageEntries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageEntries.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageEntries.delete(key);
      },
      clear: () => {
        storageEntries.clear();
      },
    },
  });
}

if (
  typeof globalThis.localStorage?.getItem !== "function"
  || typeof globalThis.localStorage?.setItem !== "function"
  || typeof globalThis.localStorage?.removeItem !== "function"
  || typeof globalThis.localStorage?.clear !== "function"
) {
  installStorageMock(globalThis);
}

if (typeof window !== "undefined" && window.localStorage !== globalThis.localStorage) {
  installStorageMock(window as unknown as Record<string, unknown>);
}

// jsdom does not implement Element.prototype.scrollIntoView. Several surfaces
// (e.g. IssueChatThread's auto-scroll-to-latest) call it during normal render,
// so provide a no-op default. Tests that assert on scroll behaviour override
// this on the prototype themselves and restore it afterwards.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// The product default is PT-BR. These legacy suites assert English copy and
// predate the localization change; keep them explicit without forcing English
// on the localization suites, which set their own language.
import { beforeEach, expect } from "vitest";
const LEGACY_ENGLISH_TEST_FILES = [
  "src/App.test.tsx",
  "src/components/ai-connections/AiProviderSetup.test.tsx",
  "src/components/artifacts/ArtifactCard.test.tsx",
  "src/components/IssueContinuationHandoff.test.tsx",
  "src/components/SidebarAgents.test.tsx",
  "src/components/SidebarStarredProjects.test.tsx",
  "src/pages/apps/agent-selector-contract.test.ts",
  "src/pages/TeamCard.test.tsx",
  "src/pages/tools/profiles/WizardToolsStep.test.tsx",
  "src/adapters/managed-sandbox-only-config-fields.test.tsx",
  "src/components/AnimatedPaperclipIcon.test.tsx",
  "src/components/CommentAttributionChip.test.tsx",
  "src/components/NewProjectDialog.managed-sandbox.test.tsx",
  "src/components/RunInvocationCard.test.tsx",
  "storybook/fixtures/routineWebhookFields.test.tsx",
];
beforeEach(async () => {
  const testPath = expect.getState().testPath ?? "";
  if (!LEGACY_ENGLISH_TEST_FILES.some((suffix) => testPath.endsWith(suffix))) return;
  const { i18n } = await import("./src/i18n");
  await i18n.changeLanguage("en");
});
