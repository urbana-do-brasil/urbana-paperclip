import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import { DecisionBundleHeader, decisionHistoryCount, decisionHistoryQueryEnabled } from "./WhatNeedsMe";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("WhatNeedsMe decision history", () => {
  it("defers terminal-history queries until their curtain opens", () => {
    expect(decisionHistoryQueryEnabled("company-1", false)).toBe(false);
    expect(decisionHistoryQueryEnabled("company-1", true)).toBe(true);
    expect(decisionHistoryQueryEnabled(null, true)).toBe(false);
  });

  it("discloses when terminal history exceeds the visible window", () => {
    expect(decisionHistoryCount(undefined)).toBeUndefined();
    expect(decisionHistoryCount(49)).toBe(49);
    expect(decisionHistoryCount(50)).toBe(50);
    expect(decisionHistoryCount(51)).toBe("50+");
  });

  it("labels general bundles as decisions instead of cleanups", () => {
    const single = renderToStaticMarkup(
      <DecisionBundleHeader agentName="Planner" title="Choose a route" originIssue={null} count={1} />,
    );
    const multiple = renderToStaticMarkup(
      <DecisionBundleHeader agentName="Planner" title="Choose routes" originIssue={null} count={2} />,
    );

    expect(single).toContain("Planner proposed 1 decision");
    expect(multiple).toContain("Planner proposed 2 decisions");
    expect(single).not.toContain("cleanup");
    expect(multiple).not.toContain("cleanup");
  });

  it("localizes bundle summaries in Brazilian Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    const markup = renderToStaticMarkup(
      <DecisionBundleHeader agentName="Planejador" title={null} originIssue={null} count={2} />,
    );

    expect(markup).toContain("Planejador propôs 2 decisões");
    expect(markup).toContain("2 pendentes");
  });
});
