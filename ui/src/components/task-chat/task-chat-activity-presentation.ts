import {
  AlertTriangle,
  BookOpen,
  Bot,
  Box,
  Clock3,
  Database,
  FileCheck2,
  FilePenLine,
  FileText,
  GitBranch,
  Info,
  ListChecks,
  PackageCheck,
  Search,
  ShieldCheck,
  TerminalSquare,
  Users,
} from "lucide-react";
import type {
  TaskChatMaterializedResourceItem,
  TaskChatProtocolItem,
  TaskChatProviderActivityItem,
  TaskChatWorkspaceChangeItem,
  TaskChatWorkspaceFileItem,
} from "./task-chat-model";
import {
  humanizeToolName,
  isGenericToolName,
  mcpToolIdentity,
  toolActivityPresentation,
  type ToolIcon,
} from "./tool-taxonomy";

export interface TaskChatActivityPresentation {
  icon: ToolIcon;
  runningLabel: string;
  completedLabel: string;
  failedLabel?: string;
  interruptedLabel?: string;
  detail?: string;
}

export type TaskChatActivityTranslator = (
  key: string,
  options?: { count?: number; first?: string; label?: string; second?: string; tool?: string },
) => string;

function activityText(
  translate: TaskChatActivityTranslator | undefined,
  key: string,
  fallback: string,
  options?: { count?: number; first?: string; label?: string; second?: string; tool?: string },
): string {
  return translate
    ? translate(`taskDetail.chatTranscript.providerActivity.experimental.${key}`, options)
    : fallback;
}

export function providerActivityStatusLabel(
  status: string,
  translate?: TaskChatActivityTranslator,
): string {
  const keys: Record<string, string> = {
    running: "running",
    completed: "completed",
    failed: "failed",
    interrupted: "interrupted",
    informational: "informational",
  };
  const key = keys[status];
  return key
    ? activityText(translate, `status.${key}`, status)
    : status;
}

const PROVIDER_DETAIL_LABEL_KEYS: Record<string, string> = {
  Action: "action",
  Available: "available",
  Blocking: "blocking",
  Buffering: "buffering",
  "Byte Count": "byteCount",
  Category: "category",
  Complete: "complete",
  "Document Revision": "documentRevision",
  "Duration Ms": "durationMs",
  "Effective Model": "effectiveModel",
  Event: "event",
  "Exit Code": "exitCode",
  Failure: "failure",
  "From Model": "fromModel",
  Label: "label",
  MediaType: "mediaType",
  "Media Type": "mediaType",
  Name: "name",
  Namespace: "namespace",
  Operation: "operation",
  "Output Bytes": "outputBytes",
  Pattern: "pattern",
  "Post Tokens": "postTokens",
  "Pre Tokens": "preTokens",
  Progress: "progress",
  Provider: "provider",
  Query: "query",
  Reason: "reason",
  Recoverable: "recoverable",
  Reference: "reference",
  Registered: "registered",
  "Requested Model": "requestedModel",
  "Same Session": "sameSession",
  Scope: "scope",
  Severity: "severity",
  "Target Execution ID": "targetExecutionId",
  "Target Execution Id": "targetExecutionId",
  "Sync Status": "syncStatus",
  Title: "title",
  Transport: "transport",
  Url: "url",
  URL: "url",
  "User Actionable": "userActionable",
  "Read Only": "readOnly",
  "Transparent Background": "transparentBackground",
  Status: "status",
  Summary: "summary",
  "Target": "target",
  "To Model": "toModel",
  "Input Class": "inputClass",
  Origin: "origin",
  "Planned Duration Ms": "plannedDurationMs",
  "Elapsed Duration Ms": "elapsedDurationMs",
  "Output Truncated": "outputTruncated",
  "Tool Output": "output",
  "Transport Name": "transport",
  "Work Product": "workProduct",
  "Line Number": "lineNumber",
};

export function providerActivityDetailLabel(
  label: string,
  translate?: TaskChatActivityTranslator,
): string {
  const key = PROVIDER_DETAIL_LABEL_KEYS[label];
  return key
    ? activityText(translate, `details.${key}`, label)
    : label;
}

function activityCopy(
  translate: TaskChatActivityTranslator | undefined,
  key: string,
  fallback: Pick<TaskChatActivityPresentation, "runningLabel" | "completedLabel" | "failedLabel" | "interruptedLabel">,
  detail?: string,
  icon: ToolIcon = Info,
): TaskChatActivityPresentation {
  return {
    icon,
    runningLabel: activityText(translate, `${key}.running`, fallback.runningLabel),
    completedLabel: activityText(translate, `${key}.completed`, fallback.completedLabel),
    failedLabel: activityText(translate, `${key}.failed`, fallback.failedLabel ?? fallback.completedLabel),
    interruptedLabel: activityText(translate, `${key}.interrupted`, fallback.interruptedLabel ?? fallback.runningLabel),
    detail,
  };
}

export function providerNoticeSeverity(item: TaskChatProviderActivityItem): "info" | "warning" | "error" {
  const severity = item.details.find((entry) => entry.label === "Severity")?.value;
  if (item.status === "failed" || severity === "error") return "error";
  return severity === "info" ? "info" : "warning";
}

function providerDetail(item: TaskChatProviderActivityItem, ...labels: string[]): string | undefined {
  return item.details.find((entry) => labels.includes(entry.label))?.value;
}

function meaningfulToolDetail(value: string | undefined): string | undefined {
  if (!value || isGenericToolName(value) || /^tool(?:\s+|_)call\b/i.test(value)) return undefined;
  return value;
}

export function providerActivityPresentation(
  item: TaskChatProviderActivityItem,
  translate?: TaskChatActivityTranslator,
): TaskChatActivityPresentation {
  const detail = item.summary
    ?? providerDetail(item, "Query", "URL", "Target", "Name", "Reference", "Reason", "Summary");
  switch (item.family) {
    case "research": {
      const action = providerDetail(item, "Action")?.toLowerCase();
      if (action === "open_page") {
        return activityCopy(translate, "research.openPage", { runningLabel: "Opening a web page", completedLabel: "Opened a web page", failedLabel: "Couldn’t open the web page", interruptedLabel: "Stopped opening the web page" }, detail, Search);
      }
      if (action === "find_in_page") {
        return activityCopy(translate, "research.findInPage", { runningLabel: "Searching the page", completedLabel: "Searched the page", failedLabel: "Page search failed", interruptedLabel: "Page search stopped" }, detail, Search);
      }
      return activityCopy(translate, "research.search", { runningLabel: "Searching the web", completedLabel: "Searched the web", failedLabel: "Web search failed", interruptedLabel: "Web search stopped" }, detail, Search);
    }
    case "tool_execution": {
      const name = providerDetail(item, "Name");
      const target = providerDetail(item, "Target");
      const progress = providerDetail(item, "Progress");
      const tool = toolActivityPresentation({
        name,
        transport: providerDetail(item, "Transport"),
        namespace: providerDetail(item, "Namespace"),
        operation: providerDetail(item, "Operation"),
        target,
        progress,
      });
      const boundedActivity = meaningfulToolDetail(item.summary)
        ?? meaningfulToolDetail(progress)
        ?? meaningfulToolDetail(target);
      const activityIsIdentity = Boolean(
        boundedActivity && name && humanizeToolName(boundedActivity) === humanizeToolName(name),
      );
      const technicalName = name ? mcpToolIdentity(name)?.name ?? name : tool.displayName;
      const source = tool.sourceLabel
        ? `${tool.sourceLabel} · ${technicalName}`
        : name && !isGenericToolName(name) && humanizeToolName(name) !== tool.runningLabel.replace(/^Running /, "")
          ? name
          : undefined;
      return {
        icon: tool.icon,
        runningLabel: translate ? activityText(translate, "toolExecution.running", tool.runningLabel, { tool: tool.displayName }) : tool.runningLabel,
        completedLabel: translate ? activityText(translate, "toolExecution.completed", tool.completedLabel, { tool: tool.displayName }) : tool.completedLabel,
        failedLabel: translate ? activityText(translate, "toolExecution.failed", tool.failedLabel, { tool: tool.displayName }) : tool.failedLabel,
        interruptedLabel: translate ? activityText(translate, "toolExecution.interrupted", tool.interruptedLabel, { tool: tool.displayName }) : tool.interruptedLabel,
        detail: [activityIsIdentity ? undefined : boundedActivity, source].filter(Boolean).join(" · ") || undefined,
      };
    }
    case "plan":
      return activityCopy(translate, "plan", { runningLabel: "Updating the plan", completedLabel: "Updated the plan", failedLabel: "Plan update failed", interruptedLabel: "Plan update stopped" }, detail, ListChecks);
    case "delegation": {
      const action = providerDetail(item, "Action")?.toLowerCase();
      if (action === "message") return activityCopy(translate, "delegation.message", { runningLabel: "Messaging a subagent", completedLabel: "Messaged a subagent", failedLabel: "Subagent message failed", interruptedLabel: "Subagent message stopped" }, detail, Users);
      if (action === "resume") return activityCopy(translate, "delegation.resume", { runningLabel: "Resuming a subagent", completedLabel: "Resumed a subagent", failedLabel: "Couldn’t resume the subagent", interruptedLabel: "Subagent resume stopped" }, detail, Users);
      if (action === "close") return activityCopy(translate, "delegation.close", { runningLabel: "Closing a subagent", completedLabel: "Closed a subagent", failedLabel: "Couldn’t close the subagent", interruptedLabel: "Subagent close stopped" }, detail, Users);
      if (action === "wait") return activityCopy(translate, "delegation.wait", { runningLabel: "Waiting for subagents", completedLabel: "Finished waiting for subagents", failedLabel: "Subagent wait failed", interruptedLabel: "Stopped waiting for subagents" }, detail, Users);
      return activityCopy(translate, "delegation.start", { runningLabel: "Starting a subagent", completedLabel: "Started a subagent", failedLabel: "Subagent start failed", interruptedLabel: "Subagent start stopped" }, detail, Users);
    }
    case "model_identity":
      return item.eventType === "model.route.changed"
        ? activityCopy(translate, "modelIdentity.switch", { runningLabel: "Switching models", completedLabel: "Switched models", failedLabel: "Model switch failed", interruptedLabel: "Model switch stopped" }, detail, Bot)
        : activityCopy(translate, "modelIdentity.verify", { runningLabel: "Verifying the model", completedLabel: "Verified the model", failedLabel: "Model verification failed", interruptedLabel: "Model verification stopped" }, detail, Bot);
    case "context":
      return activityCopy(translate, "context", { runningLabel: "Compacting context", completedLabel: "Compacted context", failedLabel: "Context compaction failed", interruptedLabel: "Context compaction stopped" }, detail, Database);
    case "artifact": {
      const viewed = item.eventType === "artifact.viewed";
      return viewed
        ? activityCopy(translate, "artifact.view", { runningLabel: "Viewing an artifact", completedLabel: "Viewed an artifact", failedLabel: "Couldn’t view the artifact", interruptedLabel: "Artifact view stopped" }, detail, Box)
        : activityCopy(translate, "artifact.generate", { runningLabel: "Generating an artifact", completedLabel: "Generated an artifact", failedLabel: "Artifact generation failed", interruptedLabel: "Artifact generation stopped" }, detail, Box);
    }
    case "review": {
      const state = providerDetail(item, "State")?.toLowerCase();
      return state === "exited"
        ? activityCopy(translate, "review.leave", { runningLabel: "Leaving review mode", completedLabel: "Left review mode", failedLabel: "Couldn’t leave review mode", interruptedLabel: "Review-mode change stopped" }, detail, FileCheck2)
        : activityCopy(translate, "review.enter", { runningLabel: "Entering review mode", completedLabel: "Entered review mode", failedLabel: "Couldn’t enter review mode", interruptedLabel: "Review-mode change stopped" }, detail, FileCheck2);
    }
    case "hook":
      return activityCopy(translate, "hook", { runningLabel: "Running a hook", completedLabel: "Ran a hook", failedLabel: "Hook failed", interruptedLabel: "Hook stopped" }, detail, GitBranch);
    case "memory":
      return activityCopy(translate, "memory", { runningLabel: "Checking memory", completedLabel: "Referenced memory", failedLabel: "Memory lookup failed", interruptedLabel: "Memory lookup stopped" }, detail, BookOpen);
    case "safety":
      return activityCopy(translate, "safety", { runningLabel: "Reviewing safety", completedLabel: "Reviewed safety", failedLabel: "Safety review failed", interruptedLabel: "Safety review stopped" }, detail, ShieldCheck);
    case "terminal":
      return activityCopy(translate, "terminal", { runningLabel: "Sending terminal input", completedLabel: "Sent terminal input", failedLabel: "Terminal input failed", interruptedLabel: "Terminal input stopped" }, detail, TerminalSquare);
    case "wait":
      return activityCopy(translate, "wait", { runningLabel: "Waiting", completedLabel: "Finished waiting", failedLabel: "Wait failed", interruptedLabel: "Wait stopped" }, detail, Clock3);
    case "provider_notice":
      return activityCopy(translate, "providerNotice", { runningLabel: "Provider notice", completedLabel: "Provider notice", failedLabel: "Provider error", interruptedLabel: "Provider notice" }, detail, providerNoticeSeverity(item) === "info" ? Info : AlertTriangle);
  }
}

function workspaceChangePresentation(item: TaskChatWorkspaceChangeItem): TaskChatActivityPresentation {
  const count = item.totals.files || item.files.length;
  const detail = count > 0 ? `${count} ${count === 1 ? "file" : "files"}` : undefined;
  return { icon: FilePenLine, runningLabel: "Editing files", completedLabel: "Edited files", detail };
}

function workspaceFilePresentation(item: TaskChatWorkspaceFileItem): TaskChatActivityPresentation {
  return {
    icon: FileText,
    runningLabel: "Referencing a file",
    completedLabel: "Referenced a file",
    detail: item.line == null ? item.path : `${item.path}:${item.line}`,
  };
}

function resourcePresentation(item: TaskChatMaterializedResourceItem): TaskChatActivityPresentation {
  return {
    icon: item.resourceKind === "document" ? FileText : PackageCheck,
    runningLabel: "Saving a resource",
    completedLabel: item.resourceKind === "document" ? "Added a document" : "Added a deliverable",
    detail: item.title,
  };
}

export function protocolActivityPresentation(
  item: TaskChatProtocolItem,
  translate?: TaskChatActivityTranslator,
): TaskChatActivityPresentation | null {
  switch (item.surface) {
    case "provider_activity": return providerActivityPresentation(item, translate);
    case "workspace_change": return workspaceChangePresentation(item);
    case "workspace_file": return workspaceFilePresentation(item);
    case "resource": return resourcePresentation(item);
    case "runtime_request":
    case "run_result":
    case "run_terminal":
      return null;
  }
}

export function protocolActivityIsRunning(item: TaskChatProtocolItem): boolean {
  if (item.surface === "provider_activity") return item.status === "running";
  if (item.surface === "workspace_change") return !item.complete;
  return false;
}

export function protocolActivityLabel(
  item: TaskChatProtocolItem,
  presentation: TaskChatActivityPresentation,
  translate?: TaskChatActivityTranslator,
): string {
  if (item.surface !== "provider_activity") {
    return protocolActivityIsRunning(item) ? presentation.runningLabel : presentation.completedLabel;
  }
  if (item.status === "failed") return presentation.failedLabel ?? `${presentation.completedLabel} · failed`;
  if (item.status === "interrupted") return presentation.interruptedLabel ?? `${presentation.completedLabel} · interrupted`;
  if (item.status === "running") return presentation.runningLabel;
  if (item.status === "completed" || item.status === "informational") return presentation.completedLabel;
  return providerActivityStatusLabel(item.status, translate);
}
