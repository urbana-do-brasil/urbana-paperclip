// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalPropertiesToggleButton } from "./GoalDetail";
import { act as reactAct } from "react";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";

describe("GoalPropertiesToggleButton", () => {
  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
  });

  afterEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  it("shows the reopen control when the properties panel is hidden", () => {
    const html = renderToStaticMarkup(
      <GoalPropertiesToggleButton panelVisible={false} onShowProperties={() => {}} />,
    );

    expect(html).toContain('title="Show properties"');
    expect(html).toContain("opacity-100");
  });

  it("collapses the reopen control while the properties panel is already visible", () => {
    const html = renderToStaticMarkup(
      <GoalPropertiesToggleButton panelVisible onShowProperties={() => {}} />,
    );

    expect(html).toContain("opacity-0");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("w-0");
  });

  it("localizes the properties control in Brazilian Portuguese", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const html = renderToStaticMarkup(
      <GoalPropertiesToggleButton panelVisible={false} onShowProperties={() => {}} />,
    );
    expect(html).toContain('title="Mostrar propriedades"');
  });
});
