import { describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import {
  localizeInboxApprovalLabel,
  localizeInboxApprovalStatus,
  localizeInboxGroupLabel,
} from "./inbox-localization";

describe("localizeInboxGroupLabel", () => {
  it("translates static group labels and preserves user-provided names", () => {
    const pt = i18n.getFixedT("pt-BR");
    const en = i18n.getFixedT("en");

    expect(localizeInboxGroupLabel("issue", "Tasks", null, pt)).toBe("Tarefas");
    expect(localizeInboxGroupLabel("approval", "Approvals", null, pt)).toBe("Aprovações");
    expect(localizeInboxGroupLabel("project:none", "No project", null, pt)).toBe("Sem projeto");
    expect(localizeInboxGroupLabel("assignee:user:user-1", "You", "user-1", pt)).toBe("Você");
    expect(localizeInboxGroupLabel("assignee:user:local-board", "Board", "user-1", pt)).toBe("Quadro");
    expect(localizeInboxGroupLabel("workspace:project:default", "Main workspace (default)", null, pt))
      .toBe("Main workspace (padrão)");
    expect(localizeInboxGroupLabel("project:project-1", "Projeto Alpha", null, pt)).toBe("Projeto Alpha");
    expect(localizeInboxApprovalLabel("hire_agent", "Nova pessoa", "Hire Agent", pt))
      .toBe("Contratação de agente: Nova pessoa");
    expect(localizeInboxApprovalStatus("revision_requested", pt)).toBe("Revisão solicitada");
    expect(localizeInboxApprovalStatus("future_status", pt)).toBe("future status");

    expect(localizeInboxGroupLabel("issue", "Tasks", null, en)).toBe("Tasks");
    expect(localizeInboxApprovalLabel("hire_agent", "New person", "Hire Agent", en))
      .toBe("Hire Agent: New person");
    expect(localizeInboxGroupLabel("project:project-1", "Alpha Project", null, en)).toBe("Alpha Project");
  });
});
