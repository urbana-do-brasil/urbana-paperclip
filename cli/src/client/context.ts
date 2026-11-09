import fs from "node:fs";
import path from "node:path";
import { resolveDefaultContextPath } from "../config/home.js";
import { isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";

const DEFAULT_CONTEXT_BASENAME = "context.json";
const DEFAULT_PROFILE = "default";

export interface ClientContextProfile {
  locale?: SupportedLocale;
  apiBase?: string;
  companyId?: string;
  persona?: "board" | "agent";
  agentId?: string;
  agentName?: string;
  apiKeyEnvVarName?: string;
  tokenName?: string;
  tokenId?: string;
  tokenCreatedAt?: string;
}

export interface ClientContext {
  version: 2;
  currentProfile: string;
  profiles: Record<string, ClientContextProfile>;
}

function findContextFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    const candidate = path.resolve(currentDir, ".paperclip", DEFAULT_CONTEXT_BASENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolveContextPath(overridePath?: string): string {
  if (overridePath) return path.resolve(overridePath);
  if (process.env.PAPERCLIP_CONTEXT) return path.resolve(process.env.PAPERCLIP_CONTEXT);
  return findContextFileFromAncestors(process.cwd()) ?? resolveDefaultContextPath();
}

export function defaultClientContext(): ClientContext {
  return {
    version: 2,
    currentProfile: DEFAULT_PROFILE,
    profiles: {
      [DEFAULT_PROFILE]: {},
    },
  };
}

function parseJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeProfile(value: unknown): ClientContextProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const profile = value as Record<string, unknown>;
  const persona = profile.persona === "board" || profile.persona === "agent"
    ? profile.persona
    : undefined;

  return {
    locale: isSupportedLocale(profile.locale) ? profile.locale : undefined,
    apiBase: toStringOrUndefined(profile.apiBase),
    companyId: toStringOrUndefined(profile.companyId),
    persona,
    agentId: toStringOrUndefined(profile.agentId),
    agentName: toStringOrUndefined(profile.agentName),
    apiKeyEnvVarName: toStringOrUndefined(profile.apiKeyEnvVarName),
    tokenName: toStringOrUndefined(profile.tokenName),
    tokenId: toStringOrUndefined(profile.tokenId),
    tokenCreatedAt: toStringOrUndefined(profile.tokenCreatedAt),
  };
}

function normalizeContext(raw: unknown): ClientContext {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaultClientContext();
  }

  const record = raw as Record<string, unknown>;
  const version = 2;
  const currentProfile = toStringOrUndefined(record.currentProfile) ?? DEFAULT_PROFILE;

  const rawProfiles = record.profiles;
  const profiles: Record<string, ClientContextProfile> = {};

  if (typeof rawProfiles === "object" && rawProfiles !== null && !Array.isArray(rawProfiles)) {
    for (const [name, profile] of Object.entries(rawProfiles as Record<string, unknown>)) {
      if (!name.trim()) continue;
      profiles[name] = normalizeProfile(profile);
    }
  }

  if (!profiles[currentProfile]) {
    profiles[currentProfile] = {};
  }

  if (Object.keys(profiles).length === 0) {
    profiles[DEFAULT_PROFILE] = {};
  }

  return {
    version,
    currentProfile,
    profiles,
  };
}

export function readContext(contextPath?: string): ClientContext {
  const filePath = resolveContextPath(contextPath);
  if (!fs.existsSync(filePath)) {
    return defaultClientContext();
  }

  const raw = parseJson(filePath);
  return normalizeContext(raw);
}

/** Inspect only the selected profile's locale; do not expose unrelated data. */
export function readRawProfileLocale(contextPath?: string, profileName?: string): unknown {
  const filePath = resolveContextPath(contextPath);
  if (!fs.existsSync(filePath)) return undefined;
  // JSON.parse can include fragments of malformed input in its error message.
  // Contexts contain credential metadata, so the early help/error path must
  // not print raw file contents or a potentially sensitive file path.
  let raw: unknown;
  try { raw = parseJson(filePath); }
  catch { throw new Error("Não foi possível ler o contexto da CLI. / Could not read the CLI context."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const name = profileName?.trim() || toStringOrUndefined(record.currentProfile) || DEFAULT_PROFILE;
  const profiles = record.profiles;
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) return undefined;
  const profile = (profiles as Record<string, unknown>)[name];
  return profile && typeof profile === "object" && !Array.isArray(profile)
    ? (profile as Record<string, unknown>).locale : undefined;
}

export function writeContext(context: ClientContext, contextPath?: string): void {
  const filePath = resolveContextPath(contextPath);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const normalized = normalizeContext(context);
  // A bad value in another profile must not be silently erased when this
  // profile is edited. It is rejected if selected, and can be repaired with
  // an explicit --lang plus `context set --locale`.
  if (fs.existsSync(filePath)) {
    try {
      const raw = parseJson(filePath);
      const profiles = raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>).profiles : undefined;
      if (profiles && typeof profiles === "object" && !Array.isArray(profiles)) {
        for (const [name, profile] of Object.entries(normalized.profiles)) {
          const old = (profiles as Record<string, unknown>)[name];
          if (!old || typeof old !== "object" || Array.isArray(old)) continue;
          const oldProfile = old as Record<string, unknown>;
          if (Object.hasOwn(oldProfile, "locale") && !isSupportedLocale(oldProfile.locale) && profile.locale === undefined) {
            (profile as Record<string, unknown>).locale = oldProfile.locale;
          }
        }
      }
    } catch { /* Replacing a malformed context remains possible via writeContext. */ }
  }
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
}

export function upsertProfile(
  profileName: string,
  patch: Partial<ClientContextProfile>,
  contextPath?: string,
): ClientContext {
  if (patch.locale !== undefined && !isSupportedLocale(patch.locale)) {
    throw new Error("Invalid locale. Use pt-BR or en.");
  }
  const context = readContext(contextPath);
  const existing = context.profiles[profileName] ?? {};
  const merged: ClientContextProfile = { ...existing };

  if (patch.locale !== undefined) merged.locale = patch.locale;

  if (patch.apiBase !== undefined) merged.apiBase = patch.apiBase;
  if (patch.companyId !== undefined) merged.companyId = patch.companyId;
  if (patch.persona !== undefined) merged.persona = patch.persona;
  if (patch.agentId !== undefined) merged.agentId = patch.agentId;
  if (patch.agentName !== undefined) merged.agentName = patch.agentName;
  if (patch.apiKeyEnvVarName !== undefined) merged.apiKeyEnvVarName = patch.apiKeyEnvVarName;
  if (patch.tokenName !== undefined) merged.tokenName = patch.tokenName;
  if (patch.tokenId !== undefined) merged.tokenId = patch.tokenId;
  if (patch.tokenCreatedAt !== undefined) merged.tokenCreatedAt = patch.tokenCreatedAt;

  if (patch.apiBase !== undefined && patch.apiBase.trim().length === 0) {
    delete merged.apiBase;
  }
  if (patch.companyId !== undefined && patch.companyId.trim().length === 0) {
    delete merged.companyId;
  }
  if (patch.persona === undefined && "persona" in patch) {
    delete merged.persona;
  }
  if (patch.agentId !== undefined && patch.agentId.trim().length === 0) {
    delete merged.agentId;
  }
  if (patch.agentName !== undefined && patch.agentName.trim().length === 0) {
    delete merged.agentName;
  }
  if (patch.apiKeyEnvVarName !== undefined && patch.apiKeyEnvVarName.trim().length === 0) {
    delete merged.apiKeyEnvVarName;
  }
  if (patch.tokenName !== undefined && patch.tokenName.trim().length === 0) {
    delete merged.tokenName;
  }
  if (patch.tokenId !== undefined && patch.tokenId.trim().length === 0) {
    delete merged.tokenId;
  }
  if (patch.tokenCreatedAt !== undefined && patch.tokenCreatedAt.trim().length === 0) {
    delete merged.tokenCreatedAt;
  }

  context.profiles[profileName] = merged;
  context.currentProfile = context.currentProfile || profileName;
  writeContext(context, contextPath);
  return context;
}

export function setCurrentProfile(profileName: string, contextPath?: string): ClientContext {
  const context = readContext(contextPath);
  if (!context.profiles[profileName]) {
    context.profiles[profileName] = {};
  }
  context.currentProfile = profileName;
  writeContext(context, contextPath);
  return context;
}

export function resolveProfile(
  context: ClientContext,
  profileName?: string,
): { name: string; profile: ClientContextProfile } {
  const name = profileName?.trim() || context.currentProfile || DEFAULT_PROFILE;
  const profile = context.profiles[name] ?? {};
  return { name, profile };
}
