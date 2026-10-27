import { describe, expect, it } from "vitest";
import { i18n, t } from ".";
import { createInstance } from "i18next";
import en from "./locales/en.json";
import { localeMessages } from "./locales";
import { validateLocaleMessages } from "./locale-validation";
import ptBR from "./locales/pt-BR.json";
import { isSupportedLocale } from "@paperclipai/shared/localization";

describe("locale validation", () => {
  it("resolves English messages with key and default fallbacks", () => {
    expect(t("app.noCompanies.title")).toBe(ptBR.app.noCompanies.title);
    expect(t("app.noCompanies.title", { lng: "en" })).toBe(en.app.noCompanies.title);
    expect(t("app.missing", { defaultValue: "Fallback" })).toBe("Fallback");
    expect(t("app.missing")).toBe("app.missing");
  });

  it("accepts registered locale files", () => {
    expect(Object.keys(localeMessages)).toContain("en");
    for (const [locale, messages] of Object.entries(localeMessages)) {
      expect(isSupportedLocale(locale)).toBe(true);
      if (isSupportedLocale(locale)) expect(validateLocaleMessages(messages, undefined, locale), locale).toEqual([]);
    }
  });

  it("rejects missing and extra nested keys", () => {
    expect(
      validateLocaleMessages({
        app: {
          noCompanies: {
            title: en.app.noCompanies.title,
            description: en.app.noCompanies.description,
            unexpected: "Unexpected",
          },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "app.noCompanies.newCompany is missing",
        "app.noCompanies.unexpected is not defined in English",
      ]),
    );
  });

  it("rejects non-string leaves", () => {
    expect(
      validateLocaleMessages({
        app: {
          noCompanies: {
            ...en.app.noCompanies,
            title: ["Create your first company"],
          },
        },
      }),
    ).toEqual(expect.arrayContaining(["app.noCompanies.title must be a string"]));
  });

  it("requires interpolation placeholders to match English", () => {
    const reference = {
      message: "Invite {{name}} to {{company}}",
    };

    expect(validateLocaleMessages({ message: "Invite {{name}}" }, reference)).toEqual([
      'message interpolation placeholders must match English exactly: expected ["company","name"], received ["name"]',
    ]);
  });

  it("preserves formatter, escaping and repeated interpolation contracts", () => {
    expect(validateLocaleMessages({ message: "Valor {{amount}}" }, { message: "Amount {{amount, number}}" }).join(" ")).toContain("interpolation placeholders");
    expect(validateLocaleMessages({ message: "{{- name}}" }, { message: "{{name}}" }).join(" ")).toContain("interpolation placeholders");
    expect(validateLocaleMessages({ message: "{{name}}" }, { message: "{{name}} / {{name}}" }).join(" ")).toContain("interpolation placeholders");
    expect(validateLocaleMessages({ message: "{{ name }}" }, { message: "{{name}}" })).toEqual([]);
  });

  it("rejects executable, raw HTML, and unexpected link payloads not present in English", () => {
    const reference = {
      script: "Create company",
      handler: "Create company",
      js: "Create company",
      data: "Create company",
      url: "Create company",
      html: "Create company",
    };

    expect(
      validateLocaleMessages(
        {
          script: "<script>alert(1)</script>",
          handler: '<span ONCLICK="alert(1)">Create</span>',
          js: "javascript:alert(1)",
          data: "data:text/html,hello",
          url: "https://example.test",
          html: "<strong>Create company</strong>",
        },
        reference,
      ),
    ).toEqual(
      expect.arrayContaining([
        "script contains disallowed <script",
        "handler contains disallowed event-handler attribute",
        "js contains disallowed javascript:",
        "data contains disallowed data:",
        "url contains disallowed unexpected URL",
        "html contains disallowed raw HTML tag",
      ]),
    );
  });

  it("caps localized string length relative to English", () => {
    expect(validateLocaleMessages({ message: "x".repeat(200) }, { message: "Short" })).toEqual([
      "message is too long: 200 characters exceeds 133",
    ]);
  });

  it("rejects blank translations and non-plain objects", () => {
    expect(validateLocaleMessages({ message: " \n " }, { message: "Hello" })).toContain("message must not be empty");
    expect(validateLocaleMessages(new Date(), {})).toContain("<root> must be an object");
  });

  it("validates CLDR cardinal forms without requiring identical suffixes", () => {
    const reference = { tasks_one: "{{count}} task", tasks_other: "{{count}} tasks" };
    const translated = { tasks_one: "{{count}} tarefa", tasks_many: "{{count}} tarefas", tasks_other: "{{count}} tarefas" };
    expect(validateLocaleMessages(translated, reference, "pt-BR")).toEqual([]);
    const { tasks_many: _, ...missing } = translated;
    expect(validateLocaleMessages(missing, reference, "pt-BR")).toContain("tasks_many is missing");
    expect(validateLocaleMessages({ ...translated, tasks_few: "{{count}} tarefas" }, reference, "pt-BR")).toContain("tasks_few is not defined in English");
    expect(validateLocaleMessages({ ...translated, tasks_zero: "{{count}} tarefas" }, reference, "pt-BR")).toEqual([]);
    expect(validateLocaleMessages({ ...translated, tasks_many: "tarefas" }, reference, "pt-BR").join(" ")).toContain("interpolation placeholders");
  });

  it("accepts Portuguese ordinal categories and keeps ordinary suffixes strict", () => {
    const reference = { place_ordinal_one: "{{count}}st", place_ordinal_two: "{{count}}nd", place_ordinal_few: "{{count}}rd", place_ordinal_other: "{{count}}th", some_other: "Other" };
    expect(validateLocaleMessages({ place_ordinal_other: "{{count}}º", some_other: "Outro" }, reference, "pt-BR")).toEqual([]);
    expect(validateLocaleMessages({ some_many: "Outros" }, { some_other: "Other" }, "pt-BR")).toContain("some_other is missing");
  });

  it("keeps runtime fallback usable without accepting a missing translation as coverage", async () => {
    const partial = { app: { noCompanies: { description: "Comece criando uma organização.", newCompany: "Nova organização" } } };
    expect(validateLocaleMessages(partial, en, "pt-BR")).toContain("app.noCompanies.title is missing");
    expect(validateLocaleMessages(partial, en, "pt-BR", { allowMissing: true })).toEqual([]);
    expect(validateLocaleMessages({ app: { noCompanies: { title: "<script>unsafe</script>" } } }, en, "pt-BR", { allowMissing: true }).join(" ")).toContain("disallowed");
    const isolated = createInstance();
    await isolated.init({ ...i18n.options, lng: "pt-BR", initAsync: false, resources: { en: { translation: en }, "pt-BR": { translation: partial } } });
    expect(isolated.t("app.noCompanies.title")).toBe("Create your first organization");
    expect(isolated.language).toBe("pt-BR");
  });
});
