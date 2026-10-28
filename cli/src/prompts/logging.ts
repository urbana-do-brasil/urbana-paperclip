import * as p from "@clack/prompts";
import type { LoggingConfig } from "../config/schema.js";
import { resolveDefaultLogsDir, resolvePaperclipInstanceId } from "../config/home.js";
import { setupMessage } from "../localization/setup.js";

export async function promptLogging(): Promise<LoggingConfig> {
  const defaultLogDir = resolveDefaultLogsDir(resolvePaperclipInstanceId());
  const mode = await p.select({
    message: setupMessage("loggingModeMessage"),
    options: [
      { value: "file" as const, label: setupMessage("loggingFileOption"), hint: setupMessage("recommendedHint") },
      { value: "cloud" as const, label: setupMessage("loggingCloudOption"), hint: setupMessage("loggingCloudSoonHint") },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  if (mode === "file") {
    const logDir = await p.text({
      message: setupMessage("loggingDirMessage"),
      defaultValue: defaultLogDir,
      placeholder: defaultLogDir,
    });

    if (p.isCancel(logDir)) {
      p.cancel(setupMessage("setupCancelled"));
      process.exit(0);
    }

    return { mode: "file", logDir: logDir || defaultLogDir };
  }

  p.note(setupMessage("loggingCloudSoonNote"));
  return { mode: "file", logDir: defaultLogDir };
}
