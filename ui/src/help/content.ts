import { DEFAULT_USER_LOCALE, isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";
import topics from "./topics.json";
import { HELP_HOME, helpHref } from "./paths";
export { HELP_HOME, helpHref } from "./paths";

export type HelpTopic = (typeof topics)[number];
export const HELP_TOPICS: readonly HelpTopic[] = topics;

// Only public documentation directories are included. Raw sources are
// lazy-loaded into the shipped Vite bundle; internal plans and screenshots are
// deliberately absent. Missing Portuguese files stay visible as coverage gaps.
const rawDocuments = import.meta.glob<string>([
  "../../../docs/start/*.md", "../../../docs/guides/*.md", "../../../docs/guides/board-operator/*.md",
  "../../../docs/guides/agent-developer/*.md", "../../../docs/deploy/*.md",
  "../../../docs/adapters/*.md", "../../../docs/cli/*.md", "../../../docs/api/*.md",
  "../../../docs/companies/companies-spec.md",
  "../../../docs/built-in-agents.md",
  "../../../docs/pt-BR/start/*.md", "../../../docs/pt-BR/guides/*.md", "../../../docs/pt-BR/guides/board-operator/*.md",
  "../../../docs/pt-BR/guides/agent-developer/*.md", "../../../docs/pt-BR/deploy/*.md",
  "../../../docs/pt-BR/adapters/*.md", "../../../docs/pt-BR/cli/*.md", "../../../docs/pt-BR/api/*.md",
  "../../../docs/pt-BR/companies/companies-spec.md",
  "../../../docs/pt-BR/built-in-agents.md",
  "!../../../docs/guides/agent-developer/mcp-fixture-smoke.md",
  "!../../../docs/pt-BR/guides/agent-developer/mcp-fixture-smoke.md",
], { query: "?raw", import: "default" });

const publicAssets = import.meta.glob<string>("../../../docs/images/**/*.{svg,png,jpg,jpeg,webp}", {
  eager: true, query: "?url", import: "default",
});

export function parseHelpPath(pathname: string): { locale: SupportedLocale; slug: string; valid: boolean } {
  if (pathname === "/help" || pathname === "/help/") return { locale: DEFAULT_USER_LOCALE, slug: HELP_HOME, valid: true };
  const parts = pathname.split("/").slice(2);
  let decoded: string[];
  try { decoded = parts.map(decodeURIComponent); } catch { return { locale: DEFAULT_USER_LOCALE, slug: HELP_HOME, valid: false }; }
  const locale = decoded.shift();
  if (!isSupportedLocale(locale)) return { locale: DEFAULT_USER_LOCALE, slug: HELP_HOME, valid: false };
  const slug = decoded.join("/").replace(/\/$/, "") || HELP_HOME;
  return { locale, slug, valid: Boolean(HELP_TOPICS.find((topic) => topic.slug === slug)) };
}

export function findHelpTopic(slug: string) { return HELP_TOPICS.find((topic) => topic.slug === slug); }
export function hasHelpTranslation(topic: HelpTopic, locale: SupportedLocale) {
  return Boolean(rawDocuments[`../../../${locale === "en" ? topic.source : topic.portugueseSource}`]);
}

export async function loadHelpTopic(topic: HelpTopic, locale: SupportedLocale) {
  const englishLoader = rawDocuments[`../../../${topic.source}`];
  if (!englishLoader) throw new Error(`Missing English source for ${topic.slug}`);
  const translatedLoader = rawDocuments[`../../../${topic.portugueseSource}`];
  const english = await englishLoader();
  if (locale === "pt-BR" && translatedLoader) {
    return { content: await translatedLoader(), english, language: "pt-BR" as const, fallback: false };
  }
  return { content: english, english, language: "en" as const, fallback: locale === "pt-BR" };
}

/** Frontmatter is data, not executable MDX. Other metadata stays in source. */
export function splitFrontmatter(content: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { body: content, title: null, summary: null };
  const field = (name: string) => {
    const value = match[1].match(new RegExp(`^${name}:\\s*(.*?)\\s*$`, "m"))?.[1];
    return value ? value.replace(/^(["'])(.*)\1$/, "$2") : null;
  };
  return { body: content.slice(match[0].length), title: field("title"), summary: field("summary") ?? field("description") };
}

/** Preserve the existing Mintlify Card/Tip content without evaluating MDX. */
export function normalizeDocumentationMarkdown(content: string) {
  let fence: { marker: string; length: number } | null = null;
  const segments: string[] = [];
  let plain: string[] = [];
  const flush = () => {
    const chunk = plain.join("\n").replace(/<Card\s+title="([^"\n]+)"\s+href="(\/[a-zA-Z0-9/_-]+)">([\s\S]*?)<\/Card>/g,
      (_match, title: string, href: string, body: string) => `[${title}](${href})\n\n${body.trim()}\n`)
      .replace(/<\/?Tip\s*>/g, "");
    segments.push(chunk); plain = [];
  };
  for (const line of content.split("\n")) {
    const boundary = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (boundary && (!fence || (boundary[1][0] === fence.marker && boundary[1].length >= fence.length))) {
      if (!fence) flush(); else segments.push(plain.join("\n"));
      plain = []; fence = fence ? null : { marker: boundary[1][0], length: boundary[1].length }; segments.push(line); continue;
    }
    plain.push(line);
  }
  if (fence) segments.push(plain.join("\n")); else flush();
  return segments.join("\n");
}

export function safeHelpLink(href: string | undefined, slug: string, locale: SupportedLocale): string | null {
  if (!href) return null;
  if (href.startsWith("#")) return href;
  if (href.startsWith("//")) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return /^(https?:|mailto:)/i.test(href) ? href : null;
  try {
    const url = new URL(href, `https://docs.invalid/${slug}`);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/\.(md|mdx)$/i, "").replace(/\/$/, "");
    if (path.startsWith("images/")) return publicAssets[`../../../docs/${path}`] ?? null;
    const destination = path === "" ? HELP_HOME : path;
    return findHelpTopic(destination) ? `${helpHref(locale, destination)}${url.search}${url.hash}` : null;
  } catch { return null; }
}

/** Only bundled documentation images are loaded; arbitrary external or
 * application/API URLs supplied in Markdown cannot trigger image requests. */
export function safeHelpAsset(src: string | undefined, slug: string): string | null {
  if (!src || src.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(src)) return null;
  try {
    const url = new URL(src, `https://docs.invalid/${slug}`);
    const asset = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    return asset.startsWith("images/") ? publicAssets[`../../../docs/${asset}`] ?? null : null;
  } catch { return null; }
}

type Heading = { line: number; slug: string };
export function collectHelpHeadings(markdown: string): Heading[] {
  let fence: { marker: string; length: number } | null = null;
  const used = new Map<string, number>();
  const headings: Heading[] = [];
  markdown.split("\n").forEach((line, index) => {
    const boundary = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (boundary && (!fence || (boundary[1][0] === fence.marker && boundary[1].length >= fence.length))) {
      fence = fence ? null : { marker: boundary[1][0], length: boundary[1].length }; return;
    }
    if (fence) return;
    const title = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (!title) return;
    const base = title.toLowerCase().replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/<[^>]*>/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-");
    const count = used.get(base) ?? 0; used.set(base, count + 1);
    headings.push({ line: index + 1, slug: count ? `${base}-${count}` : base });
  });
  return headings;
}
