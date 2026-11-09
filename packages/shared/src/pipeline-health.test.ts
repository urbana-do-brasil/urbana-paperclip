import { describe, expect, it } from "vitest";
import {
  computePipelineHealth,
  type PipelineHealthFailedAutomationInput,
  type PipelineHealthInput,
} from "./pipeline-health.js";

describe("computePipelineHealth", () => {
  const baseInput: PipelineHealthInput = {
    pipelineId: "pipeline-1",
    stages: [],
    agentsById: {},
    pipelinesById: {},
  };

  it("emits one warning per failed automation item and stage", () => {
    const failure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      caseId: "case-1",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };

    const report = computePipelineHealth({
      ...baseInput,
      failedAutomations: [failure],
    });

    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toMatchObject({
      code: "automation_failed",
      translationKey: "automationFailed",
      translationParams: { caseTitle: "Case 1" },
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      href: "/pipelines/pipeline-1/items/case-1",
      hrefLabel: "Open item",
      hrefLabelKey: "openItem",
      message: `Automation failed on "Case 1". Open the item to inspect the log and retry it.`,
    });
  });

  it("emits semantic translation keys and dynamic params for health warning variants", () => {
    const report = computePipelineHealth({
      ...baseInput,
      stages: [
        {
          id: "gone-agent",
          key: "gone-agent",
          name: "Gone agent",
          kind: "active",
          config: { automation: { assigneeAgentId: "gone" } },
          instructionsBody: "Do the work",
        },
        {
          id: "paused-agent",
          key: "paused-agent",
          name: "Paused agent",
          kind: "active",
          config: { automation: { assigneeAgentId: "paused" } },
          instructionsBody: "Do the work",
        },
        {
          id: "no-instructions",
          key: "no-instructions",
          name: "No instructions",
          kind: "active",
          config: { automation: { assigneeAgentId: "ready" } },
        },
        {
          id: "no-agent",
          key: "no-agent",
          name: "No agent",
          kind: "active",
          config: {},
          instructionsBody: "Do the work",
        },
        {
          id: "no-automation",
          key: "no-automation",
          name: "No automation",
          kind: "active",
          config: {},
        },
        {
          id: "no-approver",
          key: "no-approver",
          name: "No approver",
          kind: "review",
          config: { approver: { kind: "agent", id: "gone" } },
        },
        {
          id: "paused-approver",
          key: "paused-approver",
          name: "Paused approver",
          kind: "review",
          config: { approver: { kind: "agent", id: "paused" } },
        },
        {
          id: "missing-destination",
          key: "missing-destination",
          name: "Missing destination",
          kind: "active",
          config: { breakdown: { targetPipelineId: "missing", targetStageKey: "start" } },
        },
        {
          id: "unsafe-destination",
          key: "unsafe-destination",
          name: "Unsafe destination",
          kind: "active",
          config: {
            breakdown: {
              targetPipelineId: "target",
              targetStageKey: "later",
              pieceNoun: "report",
              waitForPieces: false,
            },
          },
        },
        {
          id: "deleted-workflow",
          key: "deleted-workflow",
          name: "Deleted workflow",
          kind: "active",
          config: { onEnter: { type: "run_routine", routineId: "existing" } },
          instructionsBody: "Hand off to [workflow](pipeline://deleted).",
        },
        {
          id: "deleted-stage",
          key: "deleted-stage",
          name: "Deleted stage",
          kind: "active",
          config: { onEnter: { type: "run_routine", routineId: "existing" } },
          instructionsBody: "Hand off to [stage](pipeline://target?stage=deleted).",
        },
      ],
      agentsById: {
        ready: { id: "ready", name: "Ready", status: "idle" },
        paused: { id: "paused", name: "Sam Agent", status: "paused" },
      },
      pipelinesById: {
        target: {
          id: "target",
          name: "Target Workflow",
          stages: [
            { key: "start", name: "Start", kind: "active", config: {} },
            { key: "later", name: "Later", kind: "active", config: {} },
          ],
        },
      },
    });

    expect(report.warnings.map(({ stageId, translationKey }) => `${stageId}:${translationKey}`)).toEqual([
      "gone-agent:assignedAgentMissing",
      "paused-agent:assignedAgentPaused",
      "no-instructions:assignedNoInstructions",
      "no-agent:instructionsNoAgent",
      "no-automation:stageNoAutomation",
      "no-approver:reviewNoApprover",
      "paused-approver:reviewApproverPaused",
      "missing-destination:breakdownDestinationMissing",
      "unsafe-destination:breakdownDoesNotWait",
      "unsafe-destination:breakdownUnsafeEntry",
      "deleted-workflow:workflowDeleted",
      "deleted-stage:stageDeleted",
    ]);

    expect(report.warnings.find((warning) => warning.translationKey === "assignedAgentPaused")?.translationParams)
      .toEqual({ agentName: "Sam Agent" });
    expect(report.warnings.find((warning) => warning.translationKey === "reviewApproverPaused")?.translationParams)
      .toEqual({ agentName: "Sam Agent" });
    expect(report.warnings.filter((warning) =>
      warning.translationKey === "breakdownDoesNotWait" || warning.translationKey === "breakdownUnsafeEntry"
    )
      .map((warning) => warning.translationParams)).toEqual([
      { pieceNoun: "report" },
      { pieceNoun: "report" },
    ]);
    expect(report.warnings.find((warning) => warning.translationKey === "stageDeleted")?.translationParams)
      .toEqual({ pipelineName: "Target Workflow" });
  });

  it("deduplicates duplicate failed automation rows for the same stage and case", () => {
    const failure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      caseId: "case-1",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };
    const duplicateFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      caseId: "case-1",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };

    const report = computePipelineHealth({
      ...baseInput,
      failedAutomations: [failure, duplicateFailure],
    });

    const automationWarnings = report.warnings.filter((warning) => warning.code === "automation_failed");

    expect(automationWarnings).toHaveLength(1);
  });

  it("keeps separate warnings for different case IDs in the same stage", () => {
    const firstFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      caseId: "case-1",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };
    const secondFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      caseId: "case-2",
      caseTitle: "Case 2",
      error: "Routine timed out",
    };

    const report = computePipelineHealth({
      ...baseInput,
      failedAutomations: [firstFailure, secondFailure],
    });

    const automationWarnings = report.warnings.filter((warning) => warning.code === "automation_failed");

    expect(automationWarnings).toHaveLength(2);
    expect(automationWarnings.map((warning) => warning.href)).toEqual([
      "/pipelines/pipeline-1/items/case-1",
      "/pipelines/pipeline-1/items/case-2",
    ]);
  });

  it("keeps separate warnings for the same case ID in different stages", () => {
    const firstFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-1",
      stageKey: "build",
      stageName: "Build",
      caseId: "case-1",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };
    const secondFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage-2",
      stageKey: "verify",
      stageName: "Verify",
      caseId: "case-1",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };

    const report = computePipelineHealth({
      ...baseInput,
      failedAutomations: [firstFailure, secondFailure],
    });

    const automationWarnings = report.warnings.filter((warning) => warning.code === "automation_failed");

    expect(automationWarnings).toHaveLength(2);
    expect(automationWarnings.map((warning) => warning.stageId)).toEqual(["stage-1", "stage-2"]);
  });

  it("keeps separate warnings when stage and case IDs would collide with colon-delimited keys", () => {
    const firstFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage:one",
      stageKey: "build",
      stageName: "Build",
      caseId: "case",
      caseTitle: "Case 1",
      error: "Routine timed out",
    };
    const secondFailure: PipelineHealthFailedAutomationInput = {
      stageId: "stage",
      stageKey: "verify",
      stageName: "Verify",
      caseId: "one:case",
      caseTitle: "Case 2",
      error: "Routine timed out",
    };

    const report = computePipelineHealth({
      ...baseInput,
      failedAutomations: [firstFailure, secondFailure],
    });

    const automationWarnings = report.warnings.filter((warning) => warning.code === "automation_failed");

    expect(automationWarnings).toHaveLength(2);
    expect(automationWarnings.map((warning) => warning.href)).toEqual([
      "/pipelines/pipeline-1/items/case",
      "/pipelines/pipeline-1/items/one:case",
    ]);
  });
});
