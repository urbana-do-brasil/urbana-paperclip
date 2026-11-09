// @vitest-environment node

import type { ProviderTraceMetadata } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { i18n } from "@/i18n";
import { ProviderTraceStatusBadge } from "./ProviderTraceStatusBadge";

const trace: ProviderTraceMetadata = {
  schema: "paperclip.provider_trace_metadata.v1",
  id: "trace-id",
  runId: "run-id",
  companyId: "company-id",
  status: "complete",
  provider: "openai",
  frameCount: 4,
  byteCount: 2048,
  digest: null,
  reason: null,
  requestedBy: "user-id",
  createdAt: "2026-10-29T12:00:00.000Z",
  expiresAt: "2099-10-29T12:00:00.000Z",
  deletedAt: null,
};

describe("ProviderTraceStatusBadge", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it("localizes the trace status and expiry details", () => {
    const html = renderToStaticMarkup(<ProviderTraceStatusBadge trace={trace} />);
    expect(html).toContain("Rastreamento capturado");
    expect(html).toContain("4 quadros · 2048 bytes · expira em");
  });

  it("localizes the disabled state and explanatory title", () => {
    const html = renderToStaticMarkup(<ProviderTraceStatusBadge showOff />);
    expect(html).toContain("Rastreamento desativado");
    expect(html).toContain("A captura de quadros brutos do provedor foi desativada");
  });

  it("uses English when English is selected", async () => {
    await i18n.changeLanguage("en");
    const html = renderToStaticMarkup(<ProviderTraceStatusBadge trace={trace} />);
    expect(html).toContain("Trace captured");
    expect(html).toContain("4 frames · 2048 bytes · expires");
  });
});
