function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((match) => match[1]!).sort();
}

function hasRawHtml(value: string): boolean {
  return /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^>]*)?>/.test(value);
}

function hasEventHandlerAttribute(value: string): boolean {
  return /\son[A-Za-z]+\s*=/i.test(value);
}

function urlsIn(value: string): string[] {
  return Array.from(value.matchAll(/\bhttps?:\/\/[^\s<>"')]+/gi), (match) => match[0]!).sort();
}

function blockedPayloads(candidate: string, reference: string): string[] {
  const checks: Array<[boolean, boolean, string]> = [
    [/<script\b/i.test(candidate), /<script\b/i.test(reference), "<script>"],
    [hasEventHandlerAttribute(candidate), hasEventHandlerAttribute(reference), "event-handler attribute"],
    [/\bjavascript\s*:/i.test(candidate), /\bjavascript\s*:/i.test(reference), "javascript:"],
    [/\bdata:[a-z]+\/[a-z0-9.+-]+/i.test(candidate), /\bdata:[a-z]+\/[a-z0-9.+-]+/i.test(reference), "data:"],
    [hasRawHtml(candidate), hasRawHtml(reference), "raw HTML tag"],
  ];
  const blocked = checks
    .filter(([candidateHas, referenceHas]) => candidateHas && !referenceHas)
    .map(([, , label]) => label);
  const referenceUrls = new Set(urlsIn(reference));
  if (urlsIn(candidate).some((url) => !referenceUrls.has(url))) blocked.push("unexpected URL");
  return blocked;
}

/** Validate the structural contract shared by the English and PT-BR CLI catalogs. */
export function validateMessageCatalogPair(
  english: unknown,
  translated: unknown,
  locale = "pt-BR",
  approvedPlaceholderVariants: Record<string, { english: readonly string[]; translated: readonly string[] }> = {},
): string[] {
  const errors: string[] = [];
  const visit = (reference: unknown, candidate: unknown, keyPath: string): void => {
    if (typeof reference === "string") {
      if (typeof candidate !== "string") {
        errors.push(`${keyPath} must be a string in ${locale}`);
        return;
      }
      if (!candidate.trim()) errors.push(`${keyPath} must not be empty in ${locale}`);
      for (const payload of blockedPayloads(candidate, reference)) {
        errors.push(`${keyPath} contains disallowed ${payload} in ${locale}`);
      }
      const expected = placeholders(reference);
      const actual = placeholders(candidate);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        const approved = approvedPlaceholderVariants[keyPath];
        const matchesApprovedVariant = approved
          && JSON.stringify(expected) === JSON.stringify(approved.english)
          && JSON.stringify(actual) === JSON.stringify(approved.translated);
        if (!matchesApprovedVariant) {
          errors.push(`${keyPath} placeholders differ in ${locale}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
        }
      }
      return;
    }

    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      errors.push(`${keyPath || "<root>"} must be a catalog object`);
      return;
    }
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      errors.push(`${keyPath || "<root>"} must be an object in ${locale}`);
      return;
    }

    const referenceRecord = reference as Record<string, unknown>;
    const candidateRecord = candidate as Record<string, unknown>;
    for (const key of Object.keys(referenceRecord)) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      if (!(key in candidateRecord)) errors.push(`${nextPath} is missing in ${locale}`);
      else visit(referenceRecord[key], candidateRecord[key], nextPath);
    }
    for (const key of Object.keys(candidateRecord)) {
      if (!(key in referenceRecord)) errors.push(`${keyPath ? `${keyPath}.` : ""}${key} is not defined in English`);
    }
  };

  visit(english, translated, "");
  return errors;
}
