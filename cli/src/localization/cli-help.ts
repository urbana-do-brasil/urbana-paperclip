import type { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { applyAdminHelpLocalization } from "./admin-help.js";
import { cliMessage, setCliLocale } from "./index.js";
import { applyOperationHelpLocalization } from "./operation-help.js";
import { applySetupHelpLocalization } from "./setup.js";

/** Apply the locale to all registered human-readable CLI help in one place. */
export function applyCliHelpLocalization(root: Command, locale: SupportedLocale): void {
  setCliLocale(locale);
  root.description(cliMessage("description"));
  applyAdminHelpLocalization(root, locale);
  applyOperationHelpLocalization(root, locale);
  applySetupHelpLocalization(root, locale);
  applyLanguageHelp(root);
}

function applyLanguageHelp(command: Command): void {
  command.helpOption("-h, --help", cliMessage("helpCommand"));
  for (const option of command.options) {
    if (option.long === "--lang") option.description = cliMessage("languageOption");
    if (option.long === "--version") option.description = cliMessage("versionOption");
    if (command.parent?.name() === "context" && command.name() === "set" && option.long === "--locale") {
      option.description = cliMessage("localeOption");
    }
  }
  for (const child of command.commands) applyLanguageHelp(child);
}
