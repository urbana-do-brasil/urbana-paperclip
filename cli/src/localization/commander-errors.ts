import { getCliLocale } from "./index.js";

function localizeSuggestion(suggestion: string | undefined): string {
  if (!suggestion) return "";
  const many = suggestion.match(/^\n\(Did you mean one of (.+)\?\)$/);
  if (many) return `\n(Você quis dizer um destes: ${many[1]}?)`;
  const one = suggestion.match(/^\n\(Did you mean (.+)\?\)$/);
  if (one) return `\n(Você quis dizer ${one[1]}?)`;
  return suggestion;
}

function localizeParserErrorLine(line: string, suggestion = ""): string | undefined {
  let match = line.match(/^error: unknown option '([^']+)'$/);
  if (match) return `erro: opção desconhecida '${match[1]}'${localizeSuggestion(suggestion)}`;

  match = line.match(/^error: unknown command '([^']+)'$/);
  if (match) return `erro: comando desconhecido '${match[1]}'${localizeSuggestion(suggestion)}`;

  match = line.match(/^error: missing required argument '([^']+)'$/);
  if (match) return `erro: o argumento obrigatório '${match[1]}' não foi informado`;

  match = line.match(/^error: argument '([^']+)' missing$/);
  if (match) return `erro: o argumento '${match[1]}' não foi informado`;

  match = line.match(/^error: option '([^']+)' argument missing$/);
  if (match) return `erro: a opção '${match[1]}' exige um argumento`;

  match = line.match(/^error: required option '([^']+)' not specified$/);
  if (match) return `erro: a opção obrigatória '${match[1]}' não foi informada`;

  match = line.match(/^error: too many arguments(?: for '([^']+)')?\. Expected (\d+) arguments? but got (\d+): (.*)\.$/);
  if (match) {
    const expected = Number(match[2]);
    const expectedLabel = expected === 1 ? "argumento" : "argumentos";
    const command = match[1] ? ` para '${match[1]}'` : "";
    return `erro: argumentos em excesso${command}. Eram esperados ${expected} ${expectedLabel}, mas foram recebidos ${match[3]}: ${match[4]}.`;
  }

  match = line.match(/^error: option '([^']+)' argument '([^']*)' is invalid\.(.*)$/);
  if (match) {
    const detail = match[3].replace(/^ Allowed choices are:? /, " Valores permitidos: ");
    return `erro: o valor '${match[2]}' é inválido para a opção '${match[1]}'.${detail}`;
  }

  match = line.match(/^error: command-argument value '([^']*)' is invalid for argument '([^']+)'\.(.*)$/);
  if (match) {
    const detail = match[3].replace(/^ Allowed choices are:? /, " Valores permitidos: ");
    return `erro: o valor '${match[1]}' é inválido para o argumento '${match[2]}'.${detail}`;
  }

  match = line.match(/^error: (option|environment variable) '([^']+)' cannot be used with (option|environment variable) '([^']+)'$/);
  if (match) {
    const left = match[1] === "option" ? `a opção '${match[2]}'` : `a variável de ambiente '${match[2]}'`;
    const right = match[3] === "option" ? `a opção '${match[4]}'` : `a variável de ambiente '${match[4]}'`;
    return `erro: ${left} não pode ser usada junto com ${right}`;
  }

  return undefined;
}

/** Localize only standard Commander parser diagnostics; leave action and subprocess errors untouched. */
export function localizeCommanderErrorOutput(output: string): string {
  if (getCliLocale() !== "pt-BR") return output;

  const hadTrailingNewline = output.endsWith("\n");
  const withoutTrailingNewline = hadTrailingNewline ? output.slice(0, -1) : output;
  const lineBreak = withoutTrailingNewline.indexOf("\n");
  const line = lineBreak === -1 ? withoutTrailingNewline : withoutTrailingNewline.slice(0, lineBreak);
  const suggestion = lineBreak === -1 ? "" : withoutTrailingNewline.slice(lineBreak);
  const localized = localizeParserErrorLine(line, suggestion);
  return localized ? `${localized}${hadTrailingNewline ? "\n" : ""}` : output;
}
