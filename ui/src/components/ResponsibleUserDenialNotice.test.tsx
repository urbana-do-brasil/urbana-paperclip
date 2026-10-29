// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { i18n } from "@/i18n";
import { ResponsibleUserDenialNotice } from "./ResponsibleUserDenialNotice";

describe("ResponsibleUserDenialNotice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it("renders unauthorized Portuguese copy that names the responsible user", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice
        code="RESPONSIBLE_USER_UNAUTHORIZED"
        userName="Ada Lovelace"
      />,
    );

    expect(html).toContain("Pessoa responsável sem autorização");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain('data-denial-code="RESPONSIBLE_USER_UNAUTHORIZED"');
    expect(html).toContain('data-denial-tone="unauthorized"');
  });

  it("renders unavailable copy steering toward marking work blocked", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice
        code="RESPONSIBLE_USER_UNAVAILABLE"
        userName="Grace Hopper"
      />,
    );

    expect(html).toContain("Pessoa responsável indisponível");
    expect(html).toContain("Grace Hopper");
    expect(html).toContain('data-denial-tone="unavailable"');
    expect(html.toLowerCase()).toContain("bloqueado");
  });

  it("falls back to generic phrasing when the user name is unknown", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice code="RESPONSIBLE_USER_UNAUTHORIZED" />,
    );
    expect(html).toContain("a pessoa responsável");
  });

  it("never uses the word impersonate", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice
        code="RESPONSIBLE_USER_UNAVAILABLE"
        userName="Someone"
      />,
    );
    expect(html.toLowerCase()).not.toContain("impersonate");
  });

  it("uses English copy when English is selected", async () => {
    await i18n.changeLanguage("en");
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice code="RESPONSIBLE_USER_UNAUTHORIZED" userName="Ada" />,
    );
    expect(html).toContain("Responsible user not authorized");
    expect(html).toContain("Ada");
  });
});
