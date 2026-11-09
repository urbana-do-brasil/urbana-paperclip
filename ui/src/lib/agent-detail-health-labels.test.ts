import { afterEach, describe, expect, it } from "vitest";
import type { AgentOrgChainHealth } from "@paperclipai/shared";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { formatOrgChainHealthPath, orgChainRepairGuidance, pausedEscalationWarning } from "./agent-detail-health-labels";

const health = (overrides: Partial<AgentOrgChainHealth> = {}): AgentOrgChainHealth => ({
  status: "invalid_org_chain",
  reason: "terminated_ancestor",
  fullChain: [
    { id: "agent-1", companyId: "company-1", name: "Ana", status: "active", reportsTo: "agent-2", depth: 0, relation: "self" },
    { id: "agent-2", companyId: "company-1", name: "Manager", status: "terminated", reportsTo: null, depth: 1, relation: "ancestor" },
  ],
  firstInvalidAncestor: { id: "agent-2", name: "Manager", status: "terminated" },
  invalidAncestors: [{ id: "agent-2", name: "Manager", status: "terminated" }],
  repairGuidance: "The API guidance must not replace the locale-aware presentation.",
  ...overrides,
});

afterEach(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });

describe("agent detail reporting health labels", () => {
  it("localizes chain states and repair guidance while keeping agent names and IDs intact", async () => {
    await i18n.changeLanguage("pt-BR");
    const current = health();
    expect(formatOrgChainHealthPath(current, "Ana", i18n.t.bind(i18n))).toBe("Ana → Manager (encerrado)");
    expect(orgChainRepairGuidance(current, "Ana", i18n.t.bind(i18n))).toContain("Ana reporta-se ao ancestral encerrado Manager.");
    expect(orgChainRepairGuidance(health({ firstInvalidAncestor: { id: "missing-id", name: "missing-id", status: "missing" } }), "Ana", i18n.t.bind(i18n))).toContain("missing-id");
    expect(orgChainRepairGuidance(health({ firstInvalidAncestor: { id: "cycle-id", name: "Loop", status: "cycle" } }), "Ana", i18n.t.bind(i18n))).toContain("ciclo na hierarquia de reporte em Loop");
  });

  it("localizes paused escalation warnings from structured names and preserves a legacy fallback", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(pausedEscalationWarning(health({ pausedAncestors: [{ id: "manager", name: "Gerente", status: "paused" }] }), "Ana", i18n.t.bind(i18n))).toContain("As escalações de Ana são encaminhadas ao agente pausado Gerente.");
    expect(pausedEscalationWarning(health({ pausedAncestors: undefined, escalationWarning: "Server warning" }), "Ana", i18n.t.bind(i18n))).toBe("Server warning");
  });
});
