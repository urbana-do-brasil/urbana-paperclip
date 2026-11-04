import { describe, expect, it } from "vitest";
import type { ChatActivityItem, ChatEndpointStatus } from "@/api/chatEndpoints";
import { i18n } from "@/i18n";
import {
  connectionHealthPresentation,
  isIndividuallyToggleableResource,
  isReplayEligible,
  isResolutionEligible,
  activityResolutionActions,
  activityResolutionDescription,
} from "./ChatEndpointDetail";

const en = i18n.getFixedT("en");
const pt = i18n.getFixedT("pt-BR");
type InactiveChatEndpointStatus = Exclude<ChatEndpointStatus, "active">;

describe("chat endpoint lifecycle health presentation", () => {
  it.each([
    {
      locale: "en",
      t: en,
      messages: {
        paused: "Connection is paused. Resume it to receive new messages.",
        draft: "Connection setup is incomplete.",
        verifying: "Connection verification is in progress.",
        attention: "Connection needs attention.",
        revoked: "Connection access is revoked. Reconnect to verify access.",
        archived: "Connection has been removed from Paperclip.",
      },
    },
    {
      locale: "pt-BR",
      t: pt,
      messages: {
        paused: "A conexão está pausada. Retome-a para receber novas mensagens.",
        draft: "A configuração da conexão está incompleta.",
        verifying: "A verificação da conexão está em andamento.",
        attention: "A conexão precisa de atenção.",
        revoked: "O acesso da conexão foi revogado. Reconecte para verificar o acesso.",
        archived: "A conexão foi removida do Paperclip.",
      },
    },
  ])(
    "prioritizes lifecycle state over stale connected health in $locale",
    ({ t, messages }) => {
      const expectedMessages: Record<InactiveChatEndpointStatus, string> = {
        paused: messages.paused,
        draft: messages.draft,
        verifying: messages.verifying,
        attention: messages.attention,
        revoked: messages.revoked,
        archived: messages.archived,
      };

      for (const status of [
        "paused",
        "draft",
        "verifying",
        "attention",
        "revoked",
        "archived",
      ] as const) {
        const presentation = connectionHealthPresentation(
          { status, healthMessage: "Connected", lastError: null },
          t,
        );
        expect(presentation.message).toBe(expectedMessages[status]);
        expect(presentation.previousHealth).toBe("Connected");
        expect(presentation.error).toBeNull();
      }
    },
  );

  it.each([
    {
      locale: "en",
      t: en,
      message: "Connection is paused. Resume it to receive new messages.",
    },
    {
      locale: "pt-BR",
      t: pt,
      message: "A conexão está pausada. Retome-a para receber novas mensagens.",
    },
  ])(
    "shows the paused lifecycle without a previous health event in $locale",
    ({ t, message }) => {
      expect(connectionHealthPresentation({ status: "paused" }, t).message).toBe(message);
    },
  );

  it.each([
    { locale: "en", t: en, label: "Last reported error" },
    { locale: "pt-BR", t: pt, label: "Último erro informado" },
  ])(
    "labels retained errors as historical in $locale",
    ({ t, label }) => {
      for (const status of ["paused", "draft", "verifying", "archived"] as const) {
        expect(
          connectionHealthPresentation({ status, lastError: "Gateway timed out" }, t),
        ).toMatchObject({ error: "Gateway timed out", errorLabel: label });
      }
    },
  );

  it.each([
    { locale: "en", t: en, label: "Reason" },
    { locale: "pt-BR", t: pt, label: "Motivo" },
  ])(
    "preserves current error details in $locale",
    ({ t, label }) => {
      for (const status of ["active", "attention", "revoked"] as const) {
        expect(
          connectionHealthPresentation({ status, lastError: "Access denied" }, t),
        ).toMatchObject({ error: "Access denied", errorLabel: label });
      }
    },
  );

  it.each([
    { locale: "en", t: en },
    { locale: "pt-BR", t: pt },
  ])(
    "preserves active health and does not invent a connected state in $locale",
    ({ t }) => {
      expect(
        connectionHealthPresentation(
          {
            status: "active",
            healthMessage: "Reconnecting",
          },
          t,
        ),
      ).toMatchObject({ message: "Reconnecting", previousHealth: null });
      expect(connectionHealthPresentation({ status: "active" }, t)).toMatchObject({
        message: null,
        previousHealth: null,
        error: null,
      });
    },
  );
});

function activity(overrides: Partial<ChatActivityItem> = {}): ChatActivityItem {
  return {
    id: "activity-1",
    kind: "delivery",
    status: "failed",
    summary: "Delivery failed",
    createdAt: "2026-09-05T12:00:00.000Z",
    replayable: true,
    ...overrides,
  };
}

describe("chat endpoint activity replay eligibility", () => {
  it.each([activity(), activity({ kind: "publication" })])(
    "allows server-approved failed activity %#",
    (item) => {
      expect(isReplayEligible(item)).toBe(true);
    },
  );

  it.each([
    activity({ replayable: false }),
    activity({ replayable: undefined }),
    activity({ status: "processed" }),
    activity({ kind: "delivery", status: "delivery_unknown" }),
    activity({ kind: "publication", status: "delivery_unknown" }),
    activity({ kind: "health" }),
    activity({ kind: "repair" }),
  ])("hides replay for ineligible activity %#", (item) => {
    expect(isReplayEligible(item)).toBe(false);
  });
});

describe("chat endpoint ambiguous-delivery resolution eligibility", () => {
  it.each([
    { locale: "en", t: en, explanation: "not the file bytes" },
    { locale: "pt-BR", t: pt, explanation: "não os bytes do arquivo" },
  ])(
    "uses server-offered stage-aware file notification actions in $locale",
    ({ t, explanation }) => {
      const item = activity({
        kind: "publication",
        status: "delivery_unknown",
        fileTransfer: {
          provider: "microsoft-teams",
          phase: "file_info_unknown",
          filename: "report.txt",
          version: 3,
        },
        resolutionActions: ["retry_anyway"],
      });
      expect(activityResolutionActions(item)).toEqual(["retry_anyway"]);
      expect(activityResolutionDescription(item, t)).toContain(explanation);
      expect(
        activityResolutionActions({ ...item, resolutionActions: [] }),
      ).toEqual([]);
      expect(
        activityResolutionActions({
          ...item,
          fileTransfer: { ...item.fileTransfer!, version: 0 },
        }),
      ).toEqual([]);
      expect(isResolutionEligible({ ...item, status: "awaiting_consent" })).toBe(
        false,
      );
    },
  );
  it.each(["consent_unknown", "upload_unknown", "conflict"] as const)(
    "suppresses generic delivery/retry resolution for Teams %s",
    (phase) => {
      const fileTransfer = {
        provider: "microsoft-teams" as const,
        phase,
        filename: "report.txt",
        version: 2,
      };
      expect(
        isResolutionEligible(
          activity({
            kind: "publication",
            status: "delivery_unknown",
            fileTransfer,
            resolutionActions: ["mark_delivered", "retry_anyway"],
          }),
        ),
      ).toBe(false);
      expect(
        isResolutionEligible(
          activity({
            kind: "publication",
            status: "delivery_unknown",
            fileTransfer,
            resolutionActions: ["cancel"],
          }),
        ),
      ).toBe(true);
      expect(
        isReplayEligible(activity({ kind: "publication", fileTransfer })),
      ).toBe(false);
    },
  );
  it.each([
    activity({
      kind: "publication",
      status: "delivery_unknown",
      replayable: false,
      resolutionActions: ["mark_delivered", "retry_anyway", "cancel"],
    }),
    activity({
      kind: "action",
      actionType: "provider_effect",
      status: "delivery_unknown",
      replayable: false,
      resolutionActions: ["mark_delivered", "retry_anyway", "cancel"],
    }),
  ])("shows explicit resolution for server-approved activity %#", (item) => {
    expect(isResolutionEligible(item)).toBe(true);
  });

  it.each([
    activity({ kind: "action", status: "processed" }),
    activity({
      kind: "action",
      status: "delivery_unknown",
      resolutionActions: [],
    }),
    activity({
      kind: "delivery",
      status: "delivery_unknown",
      resolutionActions: ["cancel"],
    }),
  ])("hides resolution when the server did not offer it %#", (item) => {
    expect(isResolutionEligible(item)).toBe(false);
  });
});

describe("chat endpoint destination controls", () => {
  it("uses the reach toggles instead of meaningless Teams DM/group rows", () => {
    expect(
      isIndividuallyToggleableResource("microsoft-teams", "direct_message"),
    ).toBe(false);
    expect(
      isIndividuallyToggleableResource("microsoft-teams", "group_chat"),
    ).toBe(false);
    expect(isIndividuallyToggleableResource("microsoft-teams", "channel")).toBe(
      true,
    );
  });

  it("retains individually discovered destinations for other providers", () => {
    expect(isIndividuallyToggleableResource("slack", "direct_message")).toBe(
      true,
    );
    expect(isIndividuallyToggleableResource("telegram", "direct_message")).toBe(
      true,
    );
    expect(isIndividuallyToggleableResource("github", "repository")).toBe(true);
  });
});
