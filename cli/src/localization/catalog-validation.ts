function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((match) => match[1]!).sort();
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
