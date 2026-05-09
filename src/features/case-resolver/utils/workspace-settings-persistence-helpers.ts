import { z } from 'zod';
import { type CaseResolverWorkspaceMetadata, type CaseResolverWorkspaceFetchAttemptProfile } from '@/shared/contracts/case-resolver';

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
export const CASE_RESOLVER_WORKSPACE_HISTORY_KEY = 'case_resolver_workspace_v2_history';
export const CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY = 'case_resolver_workspace_v2_documents';

/**
 * Zod schema for validating workspace metadata.
 */
export const WorkspaceMetadataSchema = z.object({
  revision: z.number().int().positive().default(0),
  lastMutationId: z.string().trim().min(1).nullable().default(null),
  exists: z.boolean().default(true),
});

export type SettingsRecordLike = {
  key?: unknown;
  value?: unknown;
  conflict?: unknown;
  idempotent?: unknown;
  currentRevision?: unknown;
};

export type WorkspaceSettingsPayloadLike = {
  settings?: unknown;
  key?: unknown;
  value?: unknown;
};

export const readWorkspaceMetadata = (
  payload: unknown
): CaseResolverWorkspaceMetadata => {
  const result = WorkspaceMetadataSchema.safeParse(payload);
  return result.success ? result.data : WorkspaceMetadataSchema.parse({});
};

export const readSettingsRecordsFromPayload = (payload: unknown): SettingsRecordLike[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (entry: unknown): entry is SettingsRecordLike => Boolean(entry) && typeof entry === 'object'
    );
  }
  if (!payload || typeof payload !== 'object') return [];
  const payloadRecord = payload as WorkspaceSettingsPayloadLike;
  if (Array.isArray(payloadRecord.settings)) {
    return payloadRecord.settings.filter(
      (entry: unknown): entry is SettingsRecordLike => Boolean(entry) && typeof entry === 'object'
    );
  }
  if (typeof payloadRecord.key === 'string' && typeof payloadRecord.value === 'string') {
    return [payloadRecord as SettingsRecordLike];
  }
  return [];
};

/**
 * Zod schema for validating a single settings record.
 */
export const SettingsRecordSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  conflict: z.unknown().optional(),
  idempotent: z.unknown().optional(),
  currentRevision: z.unknown().optional(),
});

export type SettingsRecord = z.infer<typeof SettingsRecordSchema>;

/**
 * Resolves a workspace record from the given settings payload.
 */
export const resolveWorkspaceRecordFromSettingsPayload = (
  payload: unknown
): SettingsRecord | null => {
  const records = readSettingsRecordsFromPayload(payload);
  const record = records.find(
    (entry) => entry.key === CASE_RESOLVER_WORKSPACE_KEY && typeof entry.value === 'string'
  );

  if (!record) return null;
  const result = SettingsRecordSchema.safeParse(record);
  return result.success ? result.data : null;
};

/**
 * Resolves a specific setting record by key from the given settings payload.
 */
export const resolveSettingRecordFromSettingsPayload = (
  payload: unknown,
  key: string
): SettingsRecord | null => {
  const records = readSettingsRecordsFromPayload(payload);
  const record = records.find((entry) => entry.key === key && typeof entry.value === 'string');

  if (!record) return null;
  const result = SettingsRecordSchema.safeParse(record);
  return result.success ? result.data : null;
};

/**
 * Helper to build a URL for a given settings scope, key, and freshness.
 */
const buildSettingsUrl = (scope: 'light' | 'heavy', key: string, fresh: boolean): string => {
  const params = new URLSearchParams({ scope, key });
  if (fresh) params.append('fresh', '1');
  return `/api/settings?${params.toString()}`;
};

/**
 * Builds fetch attempts for a single setting record.
 */
export const buildSettingRecordFetchAttempts = ({
  key,
  strategy,
  fresh,
}: {
  key: string;
  strategy: 'light_then_heavy' | 'light_only' | 'heavy_only';
  fresh: boolean;
}): Array<{ scope: 'light' | 'heavy'; key: string; url: string }> => {
  const scopes: Array<'light' | 'heavy'> =
    strategy === 'heavy_only' ? ['heavy'] : strategy === 'light_only' ? ['light'] : ['light', 'heavy'];

  return scopes.flatMap((scope) => {
    const attempts = [];
    if (fresh) {
      attempts.push({ scope, key: `${scope}_fresh_key`, url: buildSettingsUrl(scope, key, true) });
    }
    attempts.push({ scope, key: `${scope}_cached_key`, url: buildSettingsUrl(scope, key, false) });
    return attempts;
  });
};

/**
 * Builds fetch attempts for the workspace record.
 */
export const buildWorkspaceRecordFetchAttempts = ({
  strategy,
  fresh,
  attemptProfile,
}: {
  strategy: 'light_then_heavy' | 'light_only' | 'heavy_only';
  fresh: boolean;
  attemptProfile: CaseResolverWorkspaceFetchAttemptProfile;
}): Array<{ key: string; url: string; scope: 'light' | 'heavy' }> => {
  const scopes: Array<'light' | 'heavy'> =
    strategy === 'heavy_only' ? ['heavy'] : strategy === 'light_only' ? ['light'] : ['light', 'heavy'];

  if (!fresh) {
    return scopes.map((scope) => ({
      key: `${scope}_cached_key`,
      scope,
      url: buildSettingsUrl(scope, CASE_RESOLVER_WORKSPACE_KEY, false),
    }));
  }

  // Handle context_fast strategy override
  if (attemptProfile === 'context_fast' && strategy === 'light_then_heavy') {
    return [
      { key: 'light_fresh_key', scope: 'light', url: buildSettingsUrl('light', CASE_RESOLVER_WORKSPACE_KEY, true) },
      { key: 'heavy_fresh_key', scope: 'heavy', url: buildSettingsUrl('heavy', CASE_RESOLVER_WORKSPACE_KEY, true) },
      { key: 'light_cached_key', scope: 'light', url: buildSettingsUrl('light', CASE_RESOLVER_WORKSPACE_KEY, false) },
      { key: 'heavy_cached_key', scope: 'heavy', url: buildSettingsUrl('heavy', CASE_RESOLVER_WORKSPACE_KEY, false) },
    ];
  }

  return scopes.flatMap((scope) => [
    { key: `${scope}_fresh_key`, scope, url: buildSettingsUrl(scope, CASE_RESOLVER_WORKSPACE_KEY, true) },
    { key: `${scope}_cached_key`, scope, url: buildSettingsUrl(scope, CASE_RESOLVER_WORKSPACE_KEY, false) },
  ]);
};
