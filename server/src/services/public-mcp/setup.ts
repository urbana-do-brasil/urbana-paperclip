import {
  DEFAULT_USER_LOCALE,
  assistantClientNames,
  mcpAuthorizationHandoffInstructionsFor,
  mcpSetupMarkdown,
  mcpSetupPageMessages,
  mcpSetupSteps,
  type AssistantClient,
} from "@paperclipai/shared";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** No organization lookup: a public hint must not disclose private company data. */
export function renderMcpSetup(
  serverUrl: string,
  companyId?: string,
  locale: SupportedLocale = DEFAULT_USER_LOCALE,
) {
  const messages = mcpSetupPageMessages(locale);
  const markdownUrl = new URL("/mcp/setup.md", serverUrl);
  if (companyId) markdownUrl.searchParams.set("company", companyId);
  if (locale) markdownUrl.searchParams.set("locale", locale);
  const requestedOrganization = companyId
    ? messages.requestedOrganization.replace("{{id}}", `<code>${escapeHtml(companyId)}</code>`)
    : "";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(messages.title)}</title></head><body><main>
<h1>${escapeHtml(messages.title)}</h1>
<p>${escapeHtml(messages.introduction)}</p>
<p>${escapeHtml(messages.accessNotice)}</p>
<p><a href="${escapeHtml(markdownUrl.toString())}">${escapeHtml(messages.markdownLink)}</a></p>
<p>${escapeHtml(mcpAuthorizationHandoffInstructionsFor(locale))}</p>
<p>${escapeHtml(messages.mcpServer)}: <code>${escapeHtml(serverUrl)}</code></p>
${requestedOrganization ? `<p>${requestedOrganization}</p>` : ""}
${Object.entries(assistantClientNames).map(([id, name]) => `<section><h2>${escapeHtml(name)}</h2><ol>${mcpSetupSteps(serverUrl, id as AssistantClient, locale).map(step => `<li><p>${escapeHtml(step.text)}</p>${step.code ? `<pre><code>${escapeHtml(step.code)}</code></pre>` : ""}</li>`).join("")}</ol></section>`).join("")}
<p>${escapeHtml(messages.finalGuidance)}</p>
</main></body></html>`;
}
export { mcpSetupMarkdown };
