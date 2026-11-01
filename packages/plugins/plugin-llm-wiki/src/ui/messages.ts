export type WikiLocale = "en" | "pt-BR";

const englishMessages = {
  companyFallback: "Company",
  navWiki: "Wiki",
  navAsk: "Ask",
  navAddContent: "Add Content",
  navLint: "Lint",
  navHistory: "History",
  navSettings: "Settings",
  navPrimary: "Wiki primary",
  navSecondary: "Wiki secondary",
  sharedSpaces: "Shared Spaces",
  sharedSpacesDescription: "Destination spaces. Browsing and manual ingest happen in the active space; Paperclip distillation always writes into the default space in Phase 1.",
  createSpace: "Create space",
  collapseSpace: "Collapse {space} space",
  expandSpace: "Expand {space} space",
  openSpace: "Open {space} space",
  spaceMenu: "{space} space menu",
  spaceMenuTitle: "Space menu",
  editSpace: "Edit space",
  refreshIndex: "Refresh index",
  openIngest: "Open ingest",
  archiveSpace: "Archive space…",
  archiveDefaultSpace: "Archive space (default cannot be archived)",
  confirmArchiveSpace: "Archive {space}? Pages remain on disk; you can restore later through the plugin API or by un-archiving from the database.",
  spaceArchived: "Space archived",
  spaceHiddenFromSidebar: "{space} hidden from sidebar.",
  archiveFailed: "Archive failed",
  spaceRefreshed: "Space refreshed",
  spaceIndexRebuilt: "{space} index re-bootstrapped.",
  refreshFailed: "Refresh failed",
  personal: "personal",
  team: "team",
  pagesInSpace: "Wiki pages in {space}",
  noPages: "No pages yet",
  addPagesToSpace: "Add content to populate this space.",
  loadingSpaces: "Loading spaces…",
  failedToLoadSpaces: "Failed to load spaces: {message}",
  failedToLoadPages: "Failed to load pages: {message}",
  chooseCompany: "Choose a company to open the LLM Wiki.",
  bridgeError: "LLM Wiki bridge error: {message}",
  loadingWiki: "Loading wiki…",
  loadingPages: "Loading pages…",
  pickPage: "Pick a page from the tree.",
  loadingPage: "Loading {path}…",
  capturedSourcePrefix: "The captured source",
  capturedSourceSuffix: "is indexed but no longer exists in the configured wiki folder. Refresh the wiki or re-ingest the source to restore it.",
  failedToReadPage: "Failed to read {path}: {message}",
  noContentForPage: "No content for {path}.",
  justNow: "just now",
  showProvenance: "Show source provenance and freshness",
  provenance: "Provenance",
  editPage: "Edit page",
  editPagePlaceholder: "Edit {path}",
  done: "Done",
  readOnlySource: "read-only source",
  updated: "Updated {time}",
  paperclipSourceRefs: "Paperclip source refs",
  onThisPage: "On this page",
  collapseOnThisPage: "Collapse on this page",
  expandOnThisPage: "Expand on this page",
  properties: "Properties",
  checkingDistillationCursor: "Checking distillation cursor…",
  currentAsOf: "Current as of {time}.",
  oneSourceInWindow: "{count} source in this window.",
  manySourcesInWindow: "{count} sources in this window.",
  cursorAt: "Cursor at",
  openPaperclipLiveState: "Open Paperclip for live state →",
  loadingProvenance: "Loading provenance…",
  notBoundToCursor: "This page is not currently bound to a distillation cursor. It may be hand-authored or pre-distillation.",
  close: "Close",
  pagePath: "Page path",
  sourceHash: "Source hash",
  cursorEnd: "Cursor end",
  lastRunStatus: "Last run status",
  project: "Project",
  updatedLabel: "Updated",
  cursor: "Cursor",
  scope: "Scope",
  pendingEvents: "Pending events",
  lastObserved: "Last observed",
  lastProcessed: "Last processed",
  sourcesInWindow: "Sources in this window",
  oneSourceRef: "{count} ref",
  manySourceRefs: "{count} refs",
  clipped: "clipped",
  moreSources: "+{count} more",
  operationsAffectingPage: "Operations affecting this page",
  reviewRequired: "review required",
  costCapped: "cost capped",
  sourceReady: "source ready",
  savedPage: "{path} saved",
} as const;

const portugueseMessages: Record<keyof typeof englishMessages, string> = {
  companyFallback: "Empresa",
  navWiki: "Wiki",
  navAsk: "Perguntar",
  navAddContent: "Adicionar conteúdo",
  navLint: "Verificar",
  navHistory: "Histórico",
  navSettings: "Configurações",
  navPrimary: "Navegação principal do Wiki",
  navSecondary: "Navegação secundária do Wiki",
  sharedSpaces: "Espaços compartilhados",
  sharedSpacesDescription: "Espaços de destino. A navegação e a ingestão manual ocorrem no espaço ativo; a destilação do Paperclip sempre grava no espaço padrão na Fase 1.",
  createSpace: "Criar espaço",
  collapseSpace: "Recolher o espaço {space}",
  expandSpace: "Expandir o espaço {space}",
  openSpace: "Abrir o espaço {space}",
  spaceMenu: "Menu do espaço {space}",
  spaceMenuTitle: "Menu do espaço",
  editSpace: "Editar espaço",
  refreshIndex: "Atualizar índice",
  openIngest: "Abrir ingestão",
  archiveSpace: "Arquivar espaço…",
  archiveDefaultSpace: "Arquivar espaço (o padrão não pode ser arquivado)",
  confirmArchiveSpace: "Arquivar o espaço {space}? As páginas permanecem no disco e ele pode ser restaurado depois pela API do plugin ou removendo o arquivamento do banco de dados.",
  spaceArchived: "Espaço arquivado",
  spaceHiddenFromSidebar: "{space} oculto na barra lateral.",
  archiveFailed: "Falha ao arquivar",
  spaceRefreshed: "Espaço atualizado",
  spaceIndexRebuilt: "Índice de {space} reconstruído.",
  refreshFailed: "Falha ao atualizar",
  personal: "pessoal",
  team: "equipe",
  pagesInSpace: "Páginas do Wiki em {space}",
  noPages: "Ainda não há páginas",
  addPagesToSpace: "Adicione conteúdo para preencher este espaço.",
  loadingSpaces: "Carregando espaços…",
  failedToLoadSpaces: "Falha ao carregar espaços: {message}",
  failedToLoadPages: "Falha ao carregar páginas: {message}",
  chooseCompany: "Escolha uma empresa para abrir o LLM Wiki.",
  bridgeError: "Erro na integração do LLM Wiki: {message}",
  loadingWiki: "Carregando Wiki…",
  loadingPages: "Carregando páginas…",
  pickPage: "Selecione uma página na árvore.",
  loadingPage: "Carregando {path}…",
  capturedSourcePrefix: "A fonte capturada",
  capturedSourceSuffix: "está indexada, mas não existe mais na pasta configurada do Wiki. Atualize o Wiki ou ingira a fonte novamente para restaurá-la.",
  failedToReadPage: "Falha ao ler {path}: {message}",
  noContentForPage: "Não há conteúdo para {path}.",
  justNow: "agora mesmo",
  showProvenance: "Mostrar proveniência e atualização das fontes",
  provenance: "Proveniência",
  editPage: "Editar página",
  editPagePlaceholder: "Editar {path}",
  done: "Concluído",
  readOnlySource: "fonte somente leitura",
  updated: "Atualizado {time}",
  paperclipSourceRefs: "Referências de origem do Paperclip",
  onThisPage: "Nesta página",
  collapseOnThisPage: "Recolher painel desta página",
  expandOnThisPage: "Expandir painel desta página",
  properties: "Propriedades",
  checkingDistillationCursor: "Verificando o cursor de destilação…",
  currentAsOf: "Atualizado até {time}.",
  oneSourceInWindow: "{count} fonte nesta janela.",
  manySourcesInWindow: "{count} fontes nesta janela.",
  cursorAt: "Cursor em",
  openPaperclipLiveState: "Abrir o Paperclip para ver o estado atual →",
  loadingProvenance: "Carregando proveniência…",
  notBoundToCursor: "Esta página não está vinculada a um cursor de destilação no momento. Ela pode ter sido escrita manualmente ou antes da destilação.",
  close: "Fechar",
  pagePath: "Caminho da página",
  sourceHash: "Hash da fonte",
  cursorEnd: "Fim do cursor",
  lastRunStatus: "Status da última execução",
  project: "Projeto",
  updatedLabel: "Atualizado",
  cursor: "Cursor",
  scope: "Escopo",
  pendingEvents: "Eventos pendentes",
  lastObserved: "Última observação",
  lastProcessed: "Último processamento",
  sourcesInWindow: "Fontes nesta janela",
  oneSourceRef: "{count} referência",
  manySourceRefs: "{count} referências",
  clipped: "limitadas",
  moreSources: "+{count} mais",
  operationsAffectingPage: "Operações que afetam esta página",
  reviewRequired: "revisão necessária",
  costCapped: "limite de custo atingido",
  sourceReady: "fonte pronta",
  savedPage: "Página {path} salva",
};

const messages: Record<WikiLocale, Record<keyof typeof englishMessages, string>> = {
  en: englishMessages,
  "pt-BR": portugueseMessages,
};

export type WikiMessageKey = keyof typeof englishMessages;

export function resolveWikiLocale(locale: string | undefined): WikiLocale {
  // Older host releases do not expose a locale; preserve their original English UI.
  return locale === "pt-BR" ? "pt-BR" : "en";
}

export function wikiMessage(
  locale: WikiLocale,
  key: WikiMessageKey,
  values: Record<string, string | number> = {},
): string {
  return messages[locale][key].replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => String(values[name] ?? ""));
}

export function formatWikiRelativeTime(value: string | null | undefined, locale: WikiLocale): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return wikiMessage(locale, "justNow");
  const unit: Intl.RelativeTimeFormatUnit = minutes < 60
    ? "minute"
    : minutes < 1_440
      ? "hour"
      : "day";
  if (minutes >= 43_200) return date.toLocaleDateString(locale);
  const amount = unit === "minute" ? Math.max(1, minutes)
    : unit === "hour" ? Math.floor(minutes / 60)
      : Math.floor(minutes / 1_440);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-amount, unit);
}

export function formatWikiTimestamp(value: string | null | undefined, locale: WikiLocale): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
