import type { SettingsScope, SettingRecord } from '@/shared/lib/settings-cache';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


const HEAVY_PREFIXES = ['image_studio_', 'base_import_', 'base_export_'];
const HEAVY_KEYS = new Set<string>([
  'agent_personas',
  'case_resolver_workspace_v2',
  'case_resolver_workspace_v2_history',
  'case_resolver_workspace_v2_documents',
  'product_validator_decision_log',
  'ai_insights_analytics_history',
  'ai_insights_runtime_analytics_history',
  'ai_insights_logs_history',
]);

export const AI_PATHS_KEY_PREFIX = 'ai_paths_';
export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
export const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';

export const isHeavySettingKey = (key: string): boolean =>
  HEAVY_KEYS.has(key) || HEAVY_PREFIXES.some((prefix) => key.startsWith(prefix));

export const isAiPathsSettingKey = (key: string): boolean => key.startsWith(AI_PATHS_KEY_PREFIX);

export const isSlowSettingsScope = (scope: SettingsScope): boolean =>
  scope === 'all' || scope === 'heavy';

export const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const SETTINGS_SLOW_SCOPE_TIMEOUT_MS = parsePositiveInt(
  process.env['SETTINGS_SLOW_SCOPE_TIMEOUT_MS'],
  3_000
);

export const isSettingsTimeoutError = (error: unknown): error is Error =>
  error instanceof Error &&
  error.message.includes('[settings]') &&
  error.message.includes('timed out');

export const withSettingsScopeTimeout = async <T>(
  scope: SettingsScope,
  label: string,
  promise: Promise<T>
): Promise<T> => {
  if (!isSlowSettingsScope(scope)) return await promise;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`[settings] ${label} timed out after ${SETTINGS_SLOW_SCOPE_TIMEOUT_MS}ms`));
    }, SETTINGS_SLOW_SCOPE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const applyScopeFilter = (
  settings: SettingRecord[],
  scope: SettingsScope
): SettingRecord[] => {
  const withoutAiPaths = settings.filter(
    (setting: SettingRecord) => !isAiPathsSettingKey(setting.key)
  );
  if (scope === 'all') return withoutAiPaths;
  if (scope === 'heavy') {
    return withoutAiPaths.filter((setting: SettingRecord) => isHeavySettingKey(setting.key));
  }
  return withoutAiPaths.filter((setting: SettingRecord) => !isHeavySettingKey(setting.key));
};

const WORKSPACE_REVISION_PATTERN = /"workspaceRevision"\s*:\s*(\d+)/;
const WORKSPACE_LAST_MUTATION_PATTERN = /"lastMutationId"\s*:\s*(null|"([^"\\]|\\.)*")/;

const parseJsonStringLiteral = (raw: string): string | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'string' ? parsed : null;
  } catch (error) {
    logClientCatch(error, {
      source: 'settings-logic',
      action: 'parseJsonStringLiteral',
      level: 'warn',
    });
    return null;
  }
};

export const parseCaseResolverWorkspaceMetadata = (
  raw: string | null
): {
  revision: number;
  lastMutationId: string | null;
} => {
  if (!raw) {
    return {
      revision: 0,
      lastMutationId: null,
    };
  }
  const revisionMatch = WORKSPACE_REVISION_PATTERN.exec(raw);
  const mutationMatch = WORKSPACE_LAST_MUTATION_PATTERN.exec(raw);
  if (revisionMatch || mutationMatch) {
    const revisionCandidate = revisionMatch?.[1] ? Number.parseInt(revisionMatch[1], 10) : 0;
    const revision =
      Number.isFinite(revisionCandidate) && revisionCandidate > 0
        ? Math.floor(revisionCandidate)
        : 0;
    const mutationLiteral = mutationMatch?.[1] ?? 'null';
    const lastMutationId =
      mutationLiteral === 'null' ? null : parseJsonStringLiteral(mutationLiteral)?.trim() || null;
    return {
      revision,
      lastMutationId,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        revision: 0,
        lastMutationId: null,
      };
    }
    const revisionRaw = parsed['workspaceRevision'];
    const revision =
      typeof revisionRaw === 'number' && Number.isFinite(revisionRaw) && revisionRaw > 0
        ? Math.floor(revisionRaw)
        : 0;
    const mutationRaw = parsed['lastMutationId'];
    const lastMutationId =
      typeof mutationRaw === 'string' && mutationRaw.trim().length > 0 ? mutationRaw.trim() : null;
    return {
      revision,
      lastMutationId,
    };
  } catch (error) {
    logClientCatch(error, {
      source: 'settings-logic',
      action: 'parseCaseResolverWorkspaceMetadata',
      level: 'warn',
    });
    return {
      revision: 0,
      lastMutationId: null,
    };
  }
};

export const parseUpdatedAtMsFromPathConfig = (raw: string): number | null => {
  try {
    const parsed = JSON.parse(raw) as { updatedAt?: unknown };
    if (typeof parsed?.updatedAt !== 'string') return null;
    const ms = Date.parse(parsed.updatedAt);
    return Number.isFinite(ms) ? ms : null;
  } catch (error) {
    logClientCatch(error, {
      source: 'settings-logic',
      action: 'parseUpdatedAtMsFromPathConfig',
      level: 'warn',
    });
    return null;
  }
};

export const parsePathConfigObject = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch (error) {
    logClientCatch(error, {
      source: 'settings-logic',
      action: 'parsePathConfigObject',
      level: 'warn',
    });
    return null;
  }
};

export const mergeRuntimeOnlyPathConfigWrite = (
  currentRaw: string,
  incomingRaw: string
): string | null => {
  const current = parsePathConfigObject(currentRaw);
  const incoming = parsePathConfigObject(incomingRaw);
  if (!current || !incoming) return null;

  const merged: Record<string, unknown> = {
    ...current,
    ...(Object.prototype.hasOwnProperty.call(incoming, 'runtimeState')
      ? { runtimeState: incoming['runtimeState'] }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(incoming, 'lastRunAt')
      ? { lastRunAt: incoming['lastRunAt'] }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(incoming, 'updatedAt')
      ? { updatedAt: incoming['updatedAt'] }
      : {}),
  };
  return JSON.stringify(merged);
};

export const isRuntimeOnlyPathConfigPayload = (raw: string): boolean => {
  const parsed = parsePathConfigObject(raw);
  if (!parsed) return false;
  const hasRuntimeFields =
    Object.prototype.hasOwnProperty.call(parsed, 'runtimeState') ||
    Object.prototype.hasOwnProperty.call(parsed, 'lastRunAt') ||
    Object.prototype.hasOwnProperty.call(parsed, 'updatedAt');
  if (!hasRuntimeFields) return false;
  const hasGraphFields =
    Object.prototype.hasOwnProperty.call(parsed, 'nodes') ||
    Object.prototype.hasOwnProperty.call(parsed, 'edges');
  return !hasGraphFields;
};

export const HEAVY_PREFIX_REGEX = new RegExp(
  `^(${HEAVY_PREFIXES.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`
);
export const AI_PATHS_PREFIX_REGEX = new RegExp(
  `^${AI_PATHS_KEY_PREFIX.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`
);
