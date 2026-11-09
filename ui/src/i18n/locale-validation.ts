import en from "./locales/en.json";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const MAX_STRING_LENGTH = 2_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function formatPath(path: string[]) {
  return path.length > 0 ? path.join(".") : "<root>";
}

function interpolationPlaceholders(value: string) {
  // Include formatter and unescaped-interpolation syntax in the contract;
  // changing `{{name}}` into `{{- name}}` must not silently pass validation.
  return Array.from(value.matchAll(/{{\s*([^{}]+?)\s*}}/g), (match) => match[1].trim().replace(/\s+/g, " ")).sort();
}

function hasRawHtml(value: string) {
  return /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^>]*)?>/.test(value);
}

function hasEventHandlerAttribute(value: string) {
  return /\son[A-Za-z]+\s*=/i.test(value);
}

function urlsIn(value: string) {
  return Array.from(value.matchAll(/\bhttps?:\/\/[^\s<>"')]+/gi), (match) => match[0]).sort();
}

function hasBlockedData(value: string, englishValue: string) {
  const checks: Array<[boolean, boolean, string]> = [
    [/<script\b/i.test(value), /<script\b/i.test(englishValue), "<script"],
    [hasEventHandlerAttribute(value), hasEventHandlerAttribute(englishValue), "event-handler attribute"],
    [/\bjavascript\s*:/i.test(value), /\bjavascript\s*:/i.test(englishValue), "javascript:"],
    [/\bdata\s*:/i.test(value), /\bdata\s*:/i.test(englishValue), "data:"],
    [hasRawHtml(value), hasRawHtml(englishValue), "raw HTML tag"],
  ];

  const blocked = checks
    .filter(([candidateHas, englishHas]) => candidateHas && !englishHas)
    .map(([, , blockedPayload]) => blockedPayload);

  const englishUrls = new Set(urlsIn(englishValue));
  const unexpectedUrl = urlsIn(value).find((url) => !englishUrls.has(url));
  if (unexpectedUrl) blocked.push("unexpected URL");

  return blocked;
}

function validateString(path: string[], candidateValue: string, englishValue: string, errors: string[]) {
  if (!candidateValue.trim()) errors.push(`${formatPath(path)} must not be empty`);
  const candidatePlaceholders = interpolationPlaceholders(candidateValue);
  const englishPlaceholders = interpolationPlaceholders(englishValue);
  if (candidatePlaceholders.join("\u0000") !== englishPlaceholders.join("\u0000")) {
    errors.push(
      `${formatPath(path)} interpolation placeholders must match English exactly: expected ${JSON.stringify(
        englishPlaceholders,
      )}, received ${JSON.stringify(candidatePlaceholders)}`,
    );
  }

  for (const blockedPayload of hasBlockedData(candidateValue, englishValue)) {
    errors.push(`${formatPath(path)} contains disallowed ${blockedPayload}`);
  }

  const relativeLimit = Math.max(englishValue.length * 4 + 64, englishValue.length + 128);
  const lengthLimit = Math.min(MAX_STRING_LENGTH, relativeLimit);
  if (candidateValue.length > lengthLimit) {
    errors.push(`${formatPath(path)} is too long: ${candidateValue.length} characters exceeds ${lengthLimit}`);
  }
}

/** Expand English plural families to the target CLDR categories, retaining
 * semantic key parity while allowing e.g. Portuguese `_many`. */
function localizedReference(reference: Record<string, unknown>, locale: SupportedLocale) {
  const result = { ...reference };
  const pluralSuffix = /_(zero|one|two|few|many|other)$/;
  for (const key of Object.keys(reference)) {
    if (!key.endsWith("_other") || typeof reference[key] !== "string") continue;
    const base = key.slice(0, -"_other".length);
    // `_other` alone can be an ordinary key; plural families need another form.
    if (!Object.keys(reference).some((other) => other !== key && other.replace(pluralSuffix, "") === base && pluralSuffix.test(other))) continue;
    const ordinal = base.endsWith("_ordinal");
    const categories = new Intl.PluralRules(locale, { type: ordinal ? "ordinal" : "cardinal" }).resolvedOptions().pluralCategories;
    for (const category of ["zero", "one", "two", "few", "many", "other"]) {
      delete result[`${base}_${category}`];
    }
    for (const category of categories) {
      result[`${base}_${category}`] = reference[`${base}_${category}`] ?? reference[key];
    }
    // i18next's explicit zero override is meaningful even outside CLDR zero.
    if (!ordinal && `${base}_zero` in reference) result[`${base}_zero`] = reference[`${base}_zero`];
  }
  return result;
}

function validateNode(path: string[], candidate: unknown, englishReference: unknown, errors: string[], locale: SupportedLocale, allowMissing: boolean) {
  if (typeof englishReference === "string") {
    if (typeof candidate !== "string") {
      errors.push(`${formatPath(path)} must be a string`);
      return;
    }
    validateString(path, candidate, englishReference, errors);
    return;
  }

  if (!isPlainObject(englishReference)) {
    errors.push(`${formatPath(path)} has unsupported English reference type`);
    return;
  }

  if (!isPlainObject(candidate)) {
    errors.push(`${formatPath(path)} must be an object`);
    return;
  }

  const reference = localizedReference(englishReference, locale);
  // An explicit cardinal zero override can be introduced by either catalog.
  for (const key of Object.keys(candidate)) {
    if (!key.endsWith("_zero")) continue;
    const base = key.slice(0, -5);
    if (base.endsWith("_ordinal")) continue;
    if (`${base}_one` in englishReference && `${base}_other` in englishReference) {
      reference[key] ??= englishReference[`${base}_other`];
    }
  }
  const englishKeys = Object.keys(reference).sort();
  const candidateKeys = Object.keys(candidate).sort();
  const missingKeys = englishKeys.filter((key) => !candidateKeys.includes(key));
  const extraKeys = candidateKeys.filter((key) => !englishKeys.includes(key));

  for (const key of missingKeys) {
    if (!allowMissing) errors.push(`${formatPath([...path, key])} is missing`);
  }
  for (const key of extraKeys) {
    errors.push(`${formatPath([...path, key])} is not defined in English`);
  }

  for (const key of englishKeys) {
    if (key in candidate) {
      validateNode([...path, key], candidate[key], reference[key], errors, locale, allowMissing);
    }
  }
}

export function validateLocaleMessages(candidate: unknown, englishReference: unknown = en, locale: SupportedLocale = "en", options: { allowMissing?: boolean } = {}) {
  const errors: string[] = [];
  validateNode([], candidate, englishReference, errors, locale, options.allowMissing ?? false);
  return errors;
}

export function assertValidLocaleMessages(candidate: unknown, englishReference: unknown = en, locale: SupportedLocale = "en", options: { allowMissing?: boolean } = {}) {
  const errors = validateLocaleMessages(candidate, englishReference, locale, options);
  if (errors.length > 0) {
    throw new Error(`Invalid locale messages:\n${errors.join("\n")}`);
  }
}
