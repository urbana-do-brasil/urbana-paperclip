import { createElement, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { HELP_HOME, HELP_TOPICS, collectHelpHeadings, findHelpTopic, hasHelpTranslation, helpHref, loadHelpTopic, normalizeDocumentationMarkdown, parseHelpPath, safeHelpAsset, safeHelpLink, splitFrontmatter } from "./content";

const copy = {
  "pt-BR": {
    title: "Ajuda do Paperclip", home: "Início da ajuda", language: "Idioma da documentação", loading: "Carregando guia…",
    notFound: "Guia não encontrado", notFoundDescription: "Este endereço não corresponde a um guia disponível.",
    loadError: "Não foi possível carregar o guia. Tente novamente.", unavailable: "Este guia ainda não foi traduzido. O conteúdo abaixo está em inglês.",
    introduction: "Primeiros passos", operator: "Operação", agents: "Agentes", deployment: "Implantação",
    adapters: "Adapters", api: "Referência da API", cli: "CLI", standards: "Especificações",
    navigation: "Tópicos de ajuda", unavailableLink: "Tradução pendente",
  },
  en: {
    title: "Paperclip help", home: "Help home", language: "Documentation language", loading: "Loading guide…",
    notFound: "Guide not found", notFoundDescription: "This address does not match an available guide.",
    loadError: "Could not load the guide. Please try again.", unavailable: "This guide has not been translated yet. The content below is in English.",
    introduction: "Getting started", operator: "Operation", agents: "Agents", deployment: "Deployment",
    adapters: "Adapters", api: "API reference", cli: "CLI", standards: "Specifications",
    navigation: "Help topics", unavailableLink: "Translation pending",
  },
} as const;

type DocumentData = Awaited<ReturnType<typeof loadHelpTopic>>;
type HeadingProps = ComponentProps<"h2"> & ExtraProps;

/** Content is public static Markdown. This component has no application, auth,
 * company or query providers and must not fetch private APIs. */
export function HelpPage() {
  const route = parseHelpPath(window.location.pathname);
  const { locale, slug } = route;
  const strings = copy[locale];
  const topic = route.valid ? findHelpTopic(slug) : undefined;
  const [data, setData] = useState<DocumentData | null>(null);
  const [failure, setFailure] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (!topic) { document.title = `${strings.notFound} · ${strings.title}`; return; }
    let active = true;
    setData(null); setFailure(false);
    void loadHelpTopic(topic, locale).then((value) => {
      if (!active) return;
      setData(value);
      document.title = `${splitFrontmatter(value.content).title ?? topic.title[value.language]} · ${strings.title}`;
    }).catch(() => { if (active) setFailure(true); });
    return () => { active = false; };
  }, [locale, topic, strings]);

  const parsed = useMemo(() => data ? splitFrontmatter(data.content) : null, [data]);
  const body = useMemo(() => parsed ? normalizeDocumentationMarkdown(parsed.body) : "", [parsed]);
  const aliases = useMemo(() => {
    if (!data) return new Map<number, { id: string; alias?: string }>();
    const translated = collectHelpHeadings(body);
    const english = collectHelpHeadings(normalizeDocumentationMarkdown(splitFrontmatter(data.english).body));
    return new Map(translated.map((heading, index) => [heading.line, {
      id: heading.slug,
      ...(data.language === "pt-BR" && english[index]?.slug && english[index].slug !== heading.slug ? { alias: english[index].slug } : {}),
    }]));
  }, [body, data]);
  useEffect(() => {
    if (!data || !window.location.hash) return;
    try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView(); } catch { /* Invalid hash: render the guide normally. */ }
  }, [data]);
  const components = useMemo(() => {
    const heading = (tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => ({ node, children, ...props }: HeadingProps) => {
      const ids = aliases.get(node?.position?.start.line ?? -1);
      return createElement(tag, { ...props, id: ids?.id }, ids?.alias ? createElement("span", { id: ids.alias, "aria-hidden": true }) : null, children);
    };
    return {
      h1: heading("h1"), h2: heading("h2"), h3: heading("h3"), h4: heading("h4"), h5: heading("h5"), h6: heading("h6"),
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        const destination = safeHelpLink(href, slug, locale);
        return destination ? <a href={destination} {...(/^https?:/i.test(destination) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a> : <span>{children}</span>;
      },
      img: ({ src, alt }: { src?: string; alt?: string }) => {
        const destination = safeHelpAsset(src, slug);
        return destination ? <img src={destination} alt={alt ?? ""} loading="lazy" /> : <span>{alt}</span>;
      },
    } satisfies Components;
  }, [aliases, locale, slug]);

  const groups = ["introduction", "operator", "agents", "deployment", "adapters", "api", "cli", "standards"] as const;
  const navigation = <nav aria-label={strings.navigation} className="space-y-4 text-sm">
    {groups.map((group) => <section key={group}>
      <h2 className="font-semibold">{strings[group]}</h2>
      <ul className="mt-1 space-y-1">{HELP_TOPICS.filter((item) => item.group === group).map((item) => <li key={item.slug}>
        <a href={helpHref(locale, item.slug)} aria-current={item.slug === topic?.slug ? "page" : undefined} className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {item.title[locale]}{locale === "pt-BR" && !hasHelpTranslation(item, locale) ? ` (${strings.unavailableLink})` : ""}
        </a>
      </li>)}</ul>
    </section>)}
  </nav>;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <a className="font-semibold text-foreground hover:underline" href={helpHref(locale, HELP_HOME)}>{strings.title}</a>
          <nav aria-label={strings.language} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">{strings.language}:</span>
            {(["pt-BR", "en"] as SupportedLocale[]).map((language) => <a key={language} href={helpHref(language, topic?.slug ?? HELP_HOME)} lang={language} aria-current={locale === language ? "true" : undefined} className="rounded-md px-2 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{language === "pt-BR" ? "Português (Brasil)" : "English"}</a>)}
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-8 md:flex">
        <aside className="md:w-64 md:shrink-0">
          <details className="md:hidden"><summary className="cursor-pointer rounded-md py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{strings.navigation}</summary><div className="mt-4">{navigation}</div></details>
          <div className="hidden md:block">{navigation}</div>
        </aside>
        <main className="min-w-0 md:flex-1">
          {!topic ? <section><h1 className="text-2xl font-semibold">{strings.notFound}</h1><p className="mt-2">{strings.notFoundDescription}</p><a className="mt-4 inline-block underline" href={helpHref(locale, HELP_HOME)}>{strings.home}</a></section>
            : failure ? <p role="alert">{strings.loadError}</p>
              : !data || !parsed ? <p role="status">{strings.loading}</p>
                : <article lang={data.language}>
                  {data.fallback ? <p role="status" lang={locale} className="mb-4 rounded-md border border-border bg-muted px-4 py-3 text-sm">{strings.unavailable}</p> : null}
                  <h1 className="text-3xl font-semibold">{parsed.title ?? topic.title[data.language]}</h1>
                  {parsed.summary ? <p className="mt-3 text-muted-foreground">{parsed.summary}</p> : null}
                  <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert"><ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={components}>{body}</ReactMarkdown></div>
                </article>}
        </main>
      </div>
    </div>
  );
}
