// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { i18n } from "@/i18n";
import type { PipelineAttentionFeed, PipelineCaseDetail, PipelineDetail, PipelineListItem } from "../api/pipelines";
import { queryKeys } from "../lib/queryKeys";
import {
  PipelineBoardMoveDialog,
  PipelineItemDetailView,
  Pipelines,
  PipelinesIndexTable,
  ReviewQueue,
  ReviewQueueDetailDialog,
  type ReviewQueueRow,
} from "./Pipelines";

const mocks = vi.hoisted(() => ({
  queryData: new Map<string, unknown>(),
  companyId: "company-1",
  pathname: "/pipelines/pipeline-1/items/item-1",
  pipelineId: "",
  setBreadcrumbs: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => mocks.queryData.get(JSON.stringify(queryKey)) ?? ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    variables: undefined,
    error: null,
    reset: vi.fn(),
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("../context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: mocks.companyId }) }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: mocks.setBreadcrumbs }) }));
vi.mock("../context/ToastContext", () => ({ useToastActions: () => ({ pushToast: vi.fn() }) }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, title, "aria-label": ariaLabel }: {
    to: string;
    children: ReactNode;
    title?: string;
    "aria-label"?: string;
  }) => createElement("a", { href: to, title, "aria-label": ariaLabel }, children),
  useLocation: () => ({ pathname: mocks.pathname, hash: "" }),
  useNavigate: () => vi.fn(),
  useParams: () => ({ pipelineId: mocks.pipelineId }),
}));
vi.mock("../hooks/useStandardMarkdownMentionOptions", () => ({ useStandardMarkdownMentionOptions: () => [] }));
vi.mock("../hooks/useProjectOrder", () => ({ useProjectOrder: () => ({ orderedProjects: [] }) }));
vi.mock("../components/PipelineItemBodyDocument", () => ({ PipelineItemBodyDocument: () => null }));
vi.mock("../components/PipelineLivenessBanner", () => ({ PipelineLivenessBanner: () => null }));
vi.mock("../components/PipelineWorkReferences", () => ({ PipelineWorkReferences: () => null }));
vi.mock("../components/PipelineHealthWarnings", () => ({ PipelineHealthBar: () => null }));
vi.mock("../components/IssueChatThread", () => ({ IssueChatThread: () => null }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  SelectTrigger: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => createElement("button", props, children),
  SelectValue: () => createElement("span"),
  SelectContent: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => createElement("div", { "data-value": value }, children),
}));

const pageMessages = {
  pipelineManagement: {
    list: {
      searchLabel: "Rótulo de busca",
      searchPlaceholder: "Buscar pipelines",
      nestedView: "Visão aninhada",
      flatList: "Lista plana",
      sort: {
        title: "Ordenar",
        name: "Nome",
        lastActivity: "Última atividade",
        mostToReview: "Mais para revisar",
        mostInMotion: "Mais em andamento",
        mostOpenItems: "Mais itens abertos",
      },
      noSearchMatches: "Nenhum pipeline corresponde à busca.",
      title: "Pipelines",
      close: "Fechar",
      liveDownstream_one: "{{formattedCount}} item ativo nas etapas seguintes",
      liveDownstream_other: "{{formattedCount}} itens ativos nas etapas seguintes",
      columns: {
        name: "Nome",
        attention: "Atenção",
        openItems: "Itens abertos",
        status: "Situação",
        lastActivity: "Última atividade",
      },
      openItemsCount_one: "{{formattedCount}} item aberto",
      openItemsCount_other: "{{formattedCount}} itens abertos",
      status: { active: "Ativo", paused: "Pausado" },
      activity: { none: "Sem atividade", justNow: "Agora mesmo" },
      showing: "Exibindo {{shown}} de {{total}}.",
    },
    detail: {
      notFound: "Item não encontrado.",
      pipelineCrumb: "Fluxos",
      pipelineFallback: "Fluxo",
      itemFallback: "Item",
      stageLabel: "Etapa",
      status: { inReview: "Status localizado: em revisão" },
      close: "Fechar",
      itemActions: "Ações do item",
      permissionStillMissing: "Permissão ainda ausente — solicite acesso primeiro",
      openConversation: "Abrir conversa",
      starting: "Iniciando…",
      startConversation: "Iniciar conversa",
      cancel: "Cancelar",
      stageFallback: "etapa",
      conversation: { title: "Conversa", empty: "Ainda não há uma conversa ativa.", me: "Eu" },
      review: {
        title: "Revisão localizada",
        inReview: "Em revisão",
        description: "Decida para onde este item vai em seguida.",
        reason: "Motivo",
        requiredReason: "Obrigatório para solicitar alterações ou rejeitar.",
        optionalNote: "Nota opcional.",
        approve: "Aprovar",
        requestChanges: "Solicitar alterações",
        reject: "Rejeitar",
        moveToStage: "Mover para {{stageName}}",
        actionAriaLabel: "{{action}} e mover para {{stageName}}",
        nextInQueue: "Próximo na fila de revisão:",
        noOtherItems: "Nenhum outro item aguarda nesta fila de revisão.",
      },
      linkedWork: "Trabalho vinculado",
      breakdown: {
        builtFromItems_one: "Criado a partir de {{formattedCount}} item",
        builtFromItems_other: "Criado a partir de {{formattedCount}} itens",
      },
      details: "Detalhes",
      noAddedDetails: "Nenhum detalhe adicional.",
      activity: { title: "Atividade", empty: "Ainda não há atividade." },
    },
    board: {
      pipelineNotFound: "Pipeline não encontrado.",
      unassigned: "Sem etapa",
      anotherPipeline: "outro pipeline",
      groupBy: "Agrupar por",
      groupByNone: "Nenhum",
      groupByBuiltFor: "Criado para",
      pipelineSettings: "Configurações do pipeline",
      addItems: "Adicionar itens",
      totalItemCount_one: "{{formattedCount}} item no total",
      totalItemCount_other: "{{formattedCount}} itens no total",
      itemCount_one: "{{formattedCount}} item",
      itemCount_other: "{{formattedCount}} itens",
      warningCount_one: "{{formattedCount}} aviso",
      warningCount_other: "{{formattedCount}} avisos",
      fedBy: "Alimentado por {{pipelineName}}",
      noStages: "Ainda não há etapas configuradas para este pipeline.",
      addStagesMessage: "Adicione etapas nas configurações do pipeline para habilitar o quadro.",
      openSettings: "Abrir configurações",
      agentFallback: "Agente {{agentId}}",
      unassignedItems: "Itens sem etapa",
      dropItemsHere: "Solte itens aqui",
      emptyStage: "Vazio",
      noBuiltForItem: "Nenhum item de origem",
      stageColumn: "Coluna {{stageName}}",
      editStage: "Editar etapa {{stageName}}",
      editStageAutomation: "Editar automação da etapa {{stageName}}",
      breaksInto: "Divide em {{pipelineName}}",
      untitledItem: "Item sem título",
      card: {
        working: "Em andamento",
        needsAttention: "Precisa de atenção",
        thisChanged: "Este item mudou",
      },
      move: {
        skipsNormalFlow: "Esta movimentação ignora o fluxo normal",
        confirmTitle: "Mover {{itemTitle}}?",
        confirmDescription: "Mover {{itemTitle}} para {{stageName}} manualmente? Normalmente o agente sugere isso quando o item está pronto.",
        overrideDescription: "{{itemTitle}} iria de {{sourceStageName}} para {{targetStageName}}. Adicione um motivo antes de substituir o fluxo.",
        reviewDescription: "Revise esta movimentação antes de continuar.",
        reason: "Motivo",
        reasonPlaceholder: "Explique por que este item deve ignorar o fluxo normal.",
        moveItem: "Mover item",
        overrideAndMove: "Substituir fluxo e mover",
      },
      toast: {
        moveBlocked: "Movimentação bloqueada",
        itemChanged: "Este item mudou enquanto você o analisava. O quadro foi atualizado.",
        itemCouldNotBeMoved: "Não foi possível mover o item.",
      },
    },
    addItems: {
      eyebrow: "Adicionar a {{pipelineName}}",
      title: "Monte sua lista e envie tudo de uma vez",
      firstStageNotice: "Os itens serão adicionados à primeira etapa ({{stageName}}).",
      fieldsFromSettings: "Estes campos vêm de Configurações do pipeline → etapa {{stageName}}.",
      firstStageFallback: "primeira etapa",
      addAnotherItem: "Adicionar outro item",
      addAtLeastOne: "Adicione pelo menos um item.",
      countUpdatesLive: "A contagem é atualizada em tempo real.",
      submitting: "Enviando…",
      submit: "Enviar {{itemCount}}",
      submitted_one: "{{formattedCount}} item enviado",
      submitted_other: "{{formattedCount}} itens enviados",
      itemCount_one: "{{formattedCount}} item",
      itemCount_other: "{{formattedCount}} itens",
      itemFallback: "Item {{index}}",
      itemNumber: "Item {{index}}",
      collapseItem: "Recolher item",
      expandItem: "Expandir item",
      removeItem: "Remover item",
      preview: "Prévia",
      firstStageOnSubmit: "Primeira etapa ao enviar:",
      required: "obrigatório",
      chooseOption: "Escolha…",
      validation: {
        requiredField: "O campo {{fieldLabel}} é obrigatório.",
        invalidSelectValue: "{{fieldLabel}} precisa ser uma das opções disponíveis.",
        duplicateItem: "Este item duplica outra linha.",
        blockerCycle: "Este item aguarda outra linha que também aguarda por ele.",
        generic: "Este item precisa de atenção antes de ser enviado.",
      },
    },
    reviewQueue: {
      title: "Fila de revisão",
      sections: {
        suggestions: "Sugestões para revisar",
        finalCalls: "Decisões finais",
        headsUp: "Avisos",
      },
      prompts: {
        suggestionReady: "{{pipelineName}} considera que {{itemTitle}} está pronto para avançar.",
        reviewDecision: "Decida se {{itemTitle}} está pronto para avançar.",
        upstreamChanged: "{{upstreamTitle}} mudou no fluxo de origem. Confira antes de o trabalho continuar.",
        needsQuickLook: "{{itemTitle}} precisa de uma rápida revisão antes de o trabalho continuar.",
      },
      status: { needsAttention: "Precisa de atenção" },
      dialog: {
        titleFallback: "Revisar item",
        pipelineWaiting: "{{pipelineName}} aguarda sua decisão.",
        fallbackDescription: "Revise o item e decida o que acontece em seguida.",
        whatIsBeingDecided: "O que está sendo decidido",
        itemPreview: "Prévia do item",
        noPreviewDetails: "Ainda não há detalhes para a prévia.",
        openFullItem: "Abrir o item completo",
        note: "Nota",
        requiredNote: "Obrigatória ao solicitar alterações.",
        optionalNote: "Nota opcional.",
      },
      actions: { approve: "Aprovar", notYet: "Ainda não", requestChanges: "Solicitar alterações" },
      close: "Fechar",
      cancel: "Cancelar",
      itemCount_one: "{{formattedCount}} item",
      itemCount_other: "{{formattedCount}} itens",
      selectItem: "Selecionar {{itemTitle}}",
      recently: "recentemente",
      selectOrganization: "Selecione uma organização para ver a fila de revisão.",
      needsAttention: "Precisa da sua atenção ({{formattedCount}})",
      bulkApprove_zero: "Aprovar nenhum item",
      bulkApprove_one: "Aprovar {{formattedCount}} item",
      bulkApprove_other: "Aprovar {{formattedCount}} itens",
      loadError: "Alguns itens precisam de atenção. Tente novamente em instantes.",
      empty: "Nada precisa da sua atenção agora.",
      shortcuts: {
        label: "Atalhos:",
        move: "ou as setas navegam pelos itens",
        openItem: "abre o item",
        approve: "aprova",
      },
    },
  },
};

const englishReviewQueueMessages = {
  pipelineManagement: {
    reviewQueue: {
      title: "Review queue",
      sections: { suggestions: "Suggestions to review", finalCalls: "Final calls", headsUp: "Heads-up" },
      prompts: {
        suggestionReady: "{{pipelineName}} thinks {{itemTitle}} is ready to move forward.",
        reviewDecision: "Decide whether {{itemTitle}} is ready to move forward.",
        upstreamChanged: "{{upstreamTitle}} changed upstream. Take a quick look before work continues.",
        needsQuickLook: "{{itemTitle}} needs a quick look before work continues.",
      },
      status: { needsAttention: "Needs attention" },
      dialog: {
        titleFallback: "Review item",
        pipelineWaiting: "{{pipelineName}} is waiting for your decision.",
        fallbackDescription: "Review the item and decide what happens next.",
        whatIsBeingDecided: "What is being decided",
        itemPreview: "Item preview",
        noPreviewDetails: "No preview details yet.",
        openFullItem: "Open the full item",
        note: "Note",
        requiredNote: "Required when requesting changes.",
        optionalNote: "Optional note.",
      },
      actions: { approve: "Approve", notYet: "Not yet", requestChanges: "Request changes" },
      close: "Close",
      cancel: "Cancel",
      itemCount_one: "{{formattedCount}} item",
      itemCount_other: "{{formattedCount}} items",
      selectItem: "Select {{itemTitle}}",
      recently: "recently",
      selectOrganization: "Select an organization to view the review queue.",
      needsAttention: "Needs your attention ({{formattedCount}})",
      bulkApprove_zero: "Approve no items",
      bulkApprove_one: "Approve {{formattedCount}} item",
      bulkApprove_other: "Approve {{formattedCount}} items",
      loadError: "Some items need attention. Try again in a moment.",
      empty: "Nothing needs you right now.",
      shortcuts: {
        label: "Shortcuts:",
        move: "or arrow keys move",
        openItem: "opens item",
        approve: "approves",
      },
    },
  },
};

let previousLanguage = "pt-BR";
let previousPortugueseTranslation: unknown;
let previousEnglishTranslation: unknown;
const mountedRoots: Root[] = [];

async function useTestPortugueseResources() {
  previousLanguage = i18n.language;
  previousPortugueseTranslation = i18n.getResourceBundle("pt-BR", "translation");
  previousEnglishTranslation = i18n.getResourceBundle("en", "translation");
  i18n.addResourceBundle("pt-BR", "translation", pageMessages, true, true);
  await i18n.changeLanguage("pt-BR");
}

async function restoreI18n() {
  i18n.removeResourceBundle("pt-BR", "translation");
  i18n.removeResourceBundle("en", "translation");
  if (previousPortugueseTranslation !== undefined) {
    i18n.addResourceBundle("pt-BR", "translation", previousPortugueseTranslation as Record<string, unknown>, true, true);
  }
  if (previousEnglishTranslation !== undefined) {
    i18n.addResourceBundle("en", "translation", previousEnglishTranslation as Record<string, unknown>, true, true);
  }
  await i18n.changeLanguage(previousLanguage);
}

async function useTestEnglishReviewQueueResources() {
  i18n.addResourceBundle("en", "translation", englishReviewQueueMessages, true, true);
  await i18n.changeLanguage("en");
}

function queryKey(key: unknown[]) {
  mocks.queryData.set(JSON.stringify(key), {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe("Pipelines localization", () => {
  beforeEach(async () => {
    mocks.queryData.clear();
    mocks.pathname = "/pipelines/pipeline-1/items/item-1";
    mocks.pipelineId = "";
    mocks.setBreadcrumbs.mockClear();
    await useTestPortugueseResources();
  });

  afterEach(async () => {
    for (const root of mountedRoots.splice(0)) root.unmount();
    document.body.replaceChildren();
    mocks.queryData.clear();
    await restoreI18n();
  });

  it("renders translated catalog controls while keeping pipeline data unchanged", () => {
    const pipeline: PipelineListItem = {
      id: "pipeline-1",
      companyId: "company-1",
      key: "custom-key",
      name: "CUSTOM PIPELINE NAME",
      description: "Keep this user-authored description.",
      projectId: null,
      enforceTransitions: false,
      archivedAt: null,
      stageCount: 1,
      openCaseCount: 2,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
      lastActivityAt: new Date(),
    };
    const html = renderToStaticMarkup(createElement(PipelinesIndexTable, {
      pipelines: [pipeline],
      viewMode: "flat",
      onViewModeChange: vi.fn(),
      connectionsAvailable: false,
      search: "",
      onSearchChange: vi.fn(),
    }));

    expect(html).toContain("Buscar pipelines");
    expect(html).toContain("Itens abertos");
    expect(html).toContain("Ativo");
    expect(html).toContain("Agora mesmo");
    expect(html).toContain("CUSTOM PIPELINE NAME");
    expect(html).toContain("Keep this user-authored description.");
  });

  it("renders translated board filters, item states, and counts without translating pipeline data", () => {
    const pipeline = {
      id: "pipeline-board",
      companyId: "company-1",
      key: "board-key",
      name: "CUSTOM BOARD PIPELINE",
      description: null,
      projectId: null,
      enforceTransitions: false,
      archivedAt: null,
      stageCount: 1,
      openCaseCount: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
      stages: [{ id: "stage-1", pipelineId: "pipeline-board", key: "working", name: "CUSTOM BOARD STAGE", kind: "working", position: 0 }],
      transitions: [],
    } as PipelineDetail;
    const boardCase = {
      id: "board-item-1",
      pipelineId: "pipeline-board",
      stageId: "stage-1",
      title: "USER BOARD ITEM",
      fields: { working: true, openBlockers: 1, thisChanged: true, childrenSummary: 2 },
      version: 3,
    };
    mocks.pathname = "/pipelines/pipeline-board";
    mocks.pipelineId = "pipeline-board";
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.detail("pipeline-board")), { data: pipeline, isLoading: false });
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.cases("pipeline-board")), {
      data: [{ case: boardCase, parentCase: null, activeWork: null, descendantActiveWorkCount: 1 }],
      isLoading: false,
    });
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.health("pipeline-board")), { data: { warnings: [] }, isLoading: false });
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.list("company-1")), { data: [pipeline], isLoading: false });
    mocks.queryData.set(JSON.stringify(queryKeys.agents.list("company-1")), { data: [], isLoading: false });

    const html = renderToStaticMarkup(createElement(Pipelines));

    expect(html).toContain("Agrupar por");
    expect(html).toContain("Nenhum");
    expect(html).toContain("Criado para");
    expect(html).toContain("Configurações do pipeline");
    expect(html).toContain("CUSTOM BOARD PIPELINE");
    expect(html).toContain("CUSTOM BOARD STAGE");
    expect(html).toContain("USER BOARD ITEM");
    expect(html).toContain("Precisa de atenção");
    expect(html).toContain("Este item mudou");
    expect(html).toContain("1 item ativo nas etapas seguintes");
    expect(html).toContain("Criado a partir de 2 itens");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    flushSync(() => root.render(createElement(Pipelines)));
    expect(mocks.setBreadcrumbs).toHaveBeenCalledWith([
      { label: "Pipelines", href: "/pipelines" },
      { label: "CUSTOM BOARD PIPELINE" },
    ]);
  });

  it("renders translated board move confirmation copy and preserves item/stage names", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    mountedRoots.push(root);
    const pendingMove = {
      caseId: "item-1",
      caseVersion: 7,
      itemTitle: "USER AUTHORED ITEM",
      sourceName: "CUSTOM SOURCE STAGE",
      targetStageId: "stage-next",
      targetStageKey: "next",
      targetName: "CUSTOM TARGET STAGE",
    };
    flushSync(() => root.render(createElement(PipelineBoardMoveDialog, {
      pendingMove: {
        ...pendingMove,
        allowed: false,
      },
      overrideReason: "",
      isPending: false,
      onReasonChange: vi.fn(),
      onDismiss: vi.fn(),
      onConfirm: vi.fn(),
    })));

    const text = document.body.textContent ?? "";
    expect(text).toContain("Esta movimentação ignora o fluxo normal");
    expect(text).toContain("USER AUTHORED ITEM iria de CUSTOM SOURCE STAGE para CUSTOM TARGET STAGE");
    expect(document.body.innerHTML).toContain("placeholder=\"Explique por que este item deve ignorar o fluxo normal.\"");
    expect(text).toContain("Substituir fluxo e mover");
    expect(text).toContain("Fechar");

    flushSync(() => root.render(createElement(PipelineBoardMoveDialog, {
      pendingMove: { ...pendingMove, allowed: true },
      overrideReason: "",
      isPending: false,
      onReasonChange: vi.fn(),
      onDismiss: vi.fn(),
      onConfirm: vi.fn(),
    })));
    const allowedText = document.body.textContent ?? "";
    expect(allowedText).toContain("Mover USER AUTHORED ITEM?");
    expect(allowedText).toContain("Mover USER AUTHORED ITEM para CUSTOM TARGET STAGE manualmente?");
    expect(allowedText).toContain("Mover item");
  });

  it("renders the translated add-items flow while preserving pipeline and first-stage data", () => {
    const pipeline = {
      id: "pipeline-intake",
      companyId: "company-1",
      key: "intake-key",
      name: "CUSTOM INTAKE PIPELINE",
      description: null,
      projectId: null,
      enforceTransitions: false,
      archivedAt: null,
      stageCount: 1,
      openCaseCount: 0,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
      stages: [{ id: "stage-intake", pipelineId: "pipeline-intake", key: "intake", name: "CUSTOM FIRST STAGE", kind: "working", position: 0 }],
      transitions: [],
    } as PipelineDetail;
    const intake = {
      pipelineId: "pipeline-intake",
      stageId: "stage-intake",
      stageName: "CUSTOM FIRST STAGE",
      fields: [
        { key: "title", label: "Título", type: "text", required: true },
        { key: "context", label: "Contexto da equipe", type: "multiline" },
      ],
    };
    mocks.pathname = "/pipelines/pipeline-intake/add";
    mocks.pipelineId = "pipeline-intake";
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.detail("pipeline-intake")), { data: pipeline, isLoading: false });
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.intakeForm("pipeline-intake")), { data: intake, isLoading: false });

    const html = renderToStaticMarkup(createElement(Pipelines));

    expect(html).toContain("Adicionar a CUSTOM INTAKE PIPELINE");
    expect(html).toContain("Monte sua lista e envie tudo de uma vez");
    expect(html).toContain("CUSTOM FIRST STAGE");
    expect(html).toContain("Configurações do pipeline → etapa CUSTOM FIRST STAGE");
    expect(html).toContain("Adicionar outro item");
    expect(html).toContain("O campo Título é obrigatório.");
    expect(html).toContain("Prévia");
    expect(html).toContain("Primeira etapa ao enviar:");
    expect(html).toContain("Enviar 1 item");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    flushSync(() => root.render(createElement(Pipelines)));
    expect(mocks.setBreadcrumbs).toHaveBeenCalledWith([
      { label: "Pipelines", href: "/pipelines" },
      { label: "CUSTOM INTAKE PIPELINE", href: "/pipelines/pipeline-intake" },
      { label: "Adicionar itens" },
    ]);
  });

  it("renders translated item-review UI and preserves item, pipeline, stage, and field data", () => {
    const stages = [
      { id: "stage-review", pipelineId: "pipeline-1", key: "review", name: "CUSTOM REVIEW STAGE", kind: "review", position: 1 },
      { id: "stage-done", pipelineId: "pipeline-1", key: "done", name: "CUSTOM DONE STAGE", kind: "done", position: 2 },
      { id: "stage-cancelled", pipelineId: "pipeline-1", key: "cancelled", name: "CUSTOM REMOVED STAGE", kind: "cancelled", position: 3 },
      { id: "stage-working", pipelineId: "pipeline-1", key: "working", name: "CUSTOM WORKING STAGE", kind: "working", position: 0 },
    ];
    const pipeline = {
      id: "pipeline-1",
      companyId: "company-1",
      key: "user-pipeline-key",
      name: "CUSTOM PIPELINE NAME",
      description: null,
      projectId: null,
      enforceTransitions: false,
      archivedAt: null,
      stageCount: stages.length,
      openCaseCount: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
      stages,
      transitions: [],
    } as PipelineDetail;
    const detail = {
      case: {
        id: "item-1",
        companyId: "company-1",
        pipelineId: "pipeline-1",
        stageId: "stage-review",
        caseKey: "user-item-key",
        title: "USER AUTHORED ITEM TITLE",
        summary: null,
        fields: { custom_field: "USER FIELD VALUE" },
        parentCaseId: null,
        requestKey: null,
        version: 4,
        terminalKind: "in_review",
      },
      stage: {
        ...stages[0],
        config: { approveToStageKey: "done", rejectToStageKey: "cancelled", requestChangesToStageKey: "working" },
      },
      pipeline,
      allowedNextStages: [],
      links: [],
      blockers: [],
      blocks: [],
      childrenSummary: { childCount: 0, terminalChildCount: 0, loadedChildren: 0 },
      activeWork: null,
      liveness: null,
    } as unknown as PipelineCaseDetail;

    mocks.queryData.set(JSON.stringify(["pipelines", "detail", "pipeline-1"]), { data: pipeline, isLoading: false });
    mocks.queryData.set(JSON.stringify(["pipelines", "item", "item-1"]), { data: detail, isLoading: false });
    mocks.queryData.set(JSON.stringify(["pipelines", "item", "item-1", "children"]), { data: [], isLoading: false });
    mocks.queryData.set(JSON.stringify(["pipelines", "item", "item-1", "events"]), { data: { items: [] }, isLoading: false });
    mocks.queryData.set(JSON.stringify(["pipelines", "item", "item-1", "issue-links"]), { data: [], isLoading: false });
    mocks.queryData.set(JSON.stringify(["pipelines", "item", "item-1", "outputs"]), { data: { items: [] }, isLoading: false });
    mocks.queryData.set(JSON.stringify(["pipelines", "review-cases", "company-1", "pipeline", "pipeline-1"]), { data: [], isLoading: false });
    queryKey(["pipelines", "item", "item-1", "automation-retry-plan", "previous_stage"]);

    const html = renderToStaticMarkup(createElement(PipelineItemDetailView, {
      pipelineId: "pipeline-1",
      caseId: "item-1",
    }));

    expect(html).toContain("CUSTOM PIPELINE NAME");
    expect(html).toContain("USER AUTHORED ITEM TITLE");
    expect(html).toContain("CUSTOM REVIEW STAGE");
    expect(html).toContain("USER FIELD VALUE");
    expect(html).toContain("Status localizado: em revisão");
    expect(html).toContain("Revisão localizada");
    expect(html).toContain("Solicitar alterações");
    expect(html).toContain("Trabalho vinculado");
  });

  it("localizes the review queue in Portuguese and English while preserving server-provided copy", async () => {
    const caseRef = (id: string, title: string, pipelineName: string) => ({
      id,
      caseKey: null,
      title,
      summary: null,
      version: 2,
      terminalKind: null,
      updatedAt: null,
      createdAt: null,
      pipeline: { id: `pipeline-${id}`, key: `key-${id}`, name: pipelineName },
      stage: { id: `stage-${id}`, key: "review", name: "USER REVIEW STAGE", kind: "review" },
    });
    const attention = {
      suggestions: [{
        case: caseRef("suggestion-1", "USER SUGGESTED ITEM", "USER SUGGESTION PIPELINE"),
        suggestion: {
          id: "suggestion-1",
          fromStageKey: "working",
          fromStageName: "USER WORKING STAGE",
          toStageKey: "done",
          toStageName: "USER DONE STAGE",
          rationale: "",
          confidence: 0.9,
          createdAt: null,
          suggestedBy: null,
        },
      }],
      reviews: [{
        case: caseRef("review-1", "USER REVIEW ITEM", "USER REVIEW PIPELINE"),
        review: {
          expectedVersion: 2,
          approveToStageKey: "done",
          rejectToStageKey: "cancelled",
          requestChangesToStageKey: "working",
          requireRejectReason: true,
          requireRequestChangesReason: true,
          reviewerKind: "person",
        },
      }],
      headsUp: [{
        case: caseRef("drift-1", "USER DRIFTED ITEM", "USER DRIFT PIPELINE"),
        drift: {
          eventId: "event-1",
          createdAt: null,
          previousVersion: 1,
          version: 2,
          upstream: {
            caseId: "upstream-1",
            caseKey: null,
            title: "USER UPSTREAM ITEM",
            pipelineId: "upstream-pipeline",
            pipelineName: "USER SOURCE PIPELINE",
          },
        },
      }],
      counts: { suggestions: 1, reviews: 1, headsUp: 1 },
    } as unknown as PipelineAttentionFeed;
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.attention("company-1")), { data: attention, isLoading: false });
    mocks.queryData.set(JSON.stringify(queryKeys.pipelines.reviewCases("company-1")), { data: [], isLoading: false });

    const portuguese = renderToStaticMarkup(createElement(ReviewQueue));
    expect(portuguese).toContain("Fila de revisão");
    expect(portuguese).toContain("Sugestões para revisar");
    expect(portuguese).toContain("Decisões finais");
    expect(portuguese).toContain("Avisos");
    expect(portuguese).toContain("USER SUGGESTION PIPELINE considera que USER SUGGESTED ITEM está pronto para avançar.");
    expect(portuguese).toContain("Decida se USER REVIEW ITEM está pronto para avançar.");
    expect(portuguese).toContain("USER UPSTREAM ITEM mudou no fluxo de origem.");
    expect(portuguese).toContain("Aprovar nenhum item");
    expect(portuguese).toContain("Atalhos:");

    await useTestEnglishReviewQueueResources();
    const english = renderToStaticMarkup(createElement(ReviewQueue));
    expect(english).toContain("Review queue");
    expect(english).toContain("Suggestions to review");
    expect(english).toContain("Final calls");
    expect(english).toContain("Heads-up");
    expect(english).toContain("USER SUGGESTION PIPELINE thinks USER SUGGESTED ITEM is ready to move forward.");
    expect(english).toContain("Decide whether USER REVIEW ITEM is ready to move forward.");
    expect(english).toContain("USER UPSTREAM ITEM changed upstream.");
    expect(english).toContain("Approve no items");
    expect(english).toContain("Shortcuts:");
  });

  it("localizes ReviewQueue detail actions and keeps pipeline, prompt, and field values unchanged", async () => {
    const row: ReviewQueueRow = {
      id: "review:item-1",
      caseId: "item-1",
      pipelineId: "pipeline-1",
      pipelineName: "USER PIPELINE NAME",
      title: "USER ITEM TITLE",
      prompt: "USER PROVIDED REVIEW PROMPT",
      kind: "review",
      createdAt: null,
      expectedVersion: 4,
      suggestionId: null,
      requireRejectReason: true,
      requireRequestChangesReason: true,
      fields: { custom_label: "USER FIELD VALUE" },
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedRoots.push(root);
    const renderDialog = () => createElement(ReviewQueueDetailDialog, {
      row,
      open: true,
      pending: false,
      onOpenChange: vi.fn(),
      onApprove: vi.fn(),
      onRequestChanges: vi.fn(),
    });
    flushSync(() => root.render(renderDialog()));

    const portuguese = document.body.textContent ?? "";
    expect(portuguese).toContain("USER ITEM TITLE");
    expect(portuguese).toContain("USER PIPELINE NAME aguarda sua decisão.");
    expect(portuguese).toContain("O que está sendo decidido");
    expect(portuguese).toContain("Prévia do item");
    expect(portuguese).toContain("USER PROVIDED REVIEW PROMPT");
    expect(portuguese).toContain("USER FIELD VALUE");
    expect(portuguese).toContain("Solicitar alterações");
    expect(portuguese).toContain("Aprovar");
    expect(document.body.innerHTML).toContain("placeholder=\"Obrigatória ao solicitar alterações.\"");

    await useTestEnglishReviewQueueResources();
    flushSync(() => root.render(renderDialog()));
    const english = document.body.textContent ?? "";
    expect(english).toContain("USER PIPELINE NAME is waiting for your decision.");
    expect(english).toContain("What is being decided");
    expect(english).toContain("Item preview");
    expect(english).toContain("USER PROVIDED REVIEW PROMPT");
    expect(english).toContain("Request changes");
    expect(english).toContain("Approve");
    expect(document.body.innerHTML).toContain("placeholder=\"Required when requesting changes.\"");
  });
});
