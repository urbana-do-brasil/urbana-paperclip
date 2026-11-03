import { describe, expect, it } from "vitest";
import {
  adminOperationMessageCatalog,
  companyImportMessageCatalog,
} from "../localization/admin-operations.js";
import { cliMessageCatalog } from "../localization/index.js";
import { skillOperationMessageCatalog } from "../localization/skill-operations.js";
import { feedbackOperationMessageCatalog } from "../localization/feedback-operations.js";
import { pluginOperationMessageCatalog } from "../localization/plugin-operations.js";
import { validateMessageCatalogPair } from "../localization/catalog-validation.js";

const catalogs = [
  ["CLI core", cliMessageCatalog],
  ["admin operations", adminOperationMessageCatalog],
  ["company import", companyImportMessageCatalog],
  ["skill operations", skillOperationMessageCatalog],
  ["feedback operations", feedbackOperationMessageCatalog],
  ["plugin operations", pluginOperationMessageCatalog],
] as const;

// These six company-import messages accept locale-specific grammar atoms from
// the formatter (gender/number agreement or a compact summary), while all
// other keys must have exactly the same placeholders in both languages.
const companyImportPlaceholderVariants = {
  groupSelectionCount: {
    english: ["selected", "total"],
    translated: ["noun", "selected", "selection", "total"],
  },
  adapterFallback: {
    english: ["adapters", "agents", "count", "plural"],
    translated: ["adapters", "agents", "count"],
  },
  selectedCount: {
    english: ["count", "noun"],
    translated: ["count", "noun", "selection"],
  },
  zeroChanged: {
    english: ["count", "noun"],
    translated: ["noun"],
  },
  packagedCount: {
    english: ["count", "noun"],
    translated: ["count", "included", "noun"],
  },
  envInputCount: {
    english: ["count", "required", "requiredLabel"],
    translated: ["count", "noun", "required", "requiredLabel"],
  },
} as const;

describe("CLI locale catalogs", () => {
  it.each(catalogs)("keeps %s keys and placeholders aligned", (name, catalog) => {
    const exceptions = name === "company import" ? companyImportPlaceholderVariants : undefined;
    expect(validateMessageCatalogPair(catalog.en, catalog["pt-BR"], "pt-BR", exceptions)).toEqual([]);
  });

  it("rejects a removed key and a changed interpolation placeholder", () => {
    const reference = { task: { reset: "Reset session for {agentId}" } };

    expect(validateMessageCatalogPair(reference, { task: {} })).toContain("task.reset is missing in pt-BR");
    expect(validateMessageCatalogPair(reference, { task: { reset: "Redefinir sessão de {taskId}" } })).toContain(
      'task.reset placeholders differ in pt-BR: expected ["agentId"], received ["taskId"]',
    );
  });
});
