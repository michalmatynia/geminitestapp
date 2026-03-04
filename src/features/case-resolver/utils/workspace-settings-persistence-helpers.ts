import {
  type CaseResolverWorkspaceMetadata,
  type CaseResolverWorkspaceFetchAttemptProfile,
} from '@/shared/contracts/case-resolver';

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';

export type SettingsRecordLike = {
  key?: unknown;
  value?: unknown;
  conflict?: unknown;
  idempotent?: unknown;
  currentRevision?: unknown;
};

export type WorkspaceMetadataLike = {
  key?: unknown;
  revision?: unknown;
  lastMutationId?: unknown;
  exists?: unknown;
};

export type WorkspaceSettingsPayloadLike = {
  settings?: unknown;
  key?: unknown;
  value?: unknown;
};

export const readWorkspaceMetadata = (
  payload: WorkspaceMetadataLike | null
): CaseResolverWorkspaceMetadata => {
  const revisionRaw = payload?.revision;
  const revision =
    typeof revisionRaw === 'number' && Number.isFinite(revisionRaw) && revisionRaw > 0
      ? Math.floor(revisionRaw)
      : 0;
  const lastMutationIdRaw = payload?.lastMutationId;
  const lastMutationId =
    typeof lastMutationIdRaw === 'string' && lastMutationIdRaw.trim().length > 0
      ? lastMutationIdRaw
      : null;
  const exists = payload?.exists !== false;
  return {
    revision,
    lastMutationId,
    exists,
  };
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

export const resolveWorkspaceRecordFromSettingsPayload = (
  payload: unknown
): SettingsRecordLike | null => {
  const records = readSettingsRecordsFromPayload(payload);
  return (
    records.find(
      (entry: SettingsRecordLike): boolean =>
        entry?.key === CASE_RESOLVER_WORKSPACE_KEY && typeof entry?.value === 'string'
    ) ?? null
  );
};

export const resolveSettingRecordFromSettingsPayload = (
  payload: unknown,
  key: string
): SettingsRecordLike | null => {
  const records = readSettingsRecordsFromPayload(payload);
  return (
    records.find(
      (entry: SettingsRecordLike): boolean => entry?.key === key && typeof entry?.value === 'string'
    ) ?? null
  );
};

export const buildSettingRecordFetchAttempts = ({
  key,
  strategy,
  fresh,
}: {
  key: string;
  strategy: 'light_then_heavy' | 'light_only' | 'heavy_only';
  fresh: boolean;
}): Array<{ scope: 'light' | 'heavy'; key: string; url: string }> => {
  const attemptScopes: Array<'light' | 'heavy'> =
    strategy === 'heavy_only'
      ? ['heavy']
      : strategy === 'light_only'
        ? ['light']
        : ['light', 'heavy'];
  const attempts: Array<{ scope: 'light' | 'heavy'; key: string; url: string }> = [];
  attemptScopes.forEach((scope): void => {
    if (fresh) {
      attempts.push({
        scope,
        key: `${scope}_fresh_key`,
        url: `/api/settings?scope=${scope}&fresh=1&key=${encodeURIComponent(key)}`,
      });
    }
    attempts.push({
      scope,
      key: `${scope}_cached_key`,
      url: `/api/settings?scope=${scope}&key=${encodeURIComponent(key)}`,
    });
  });
  return attempts;
};

export const buildWorkspaceRecordFetchAttempts = ({
  strategy,
  fresh,
  attemptProfile,
}: {
  strategy: 'light_then_heavy' | 'light_only' | 'heavy_only';
  fresh: boolean;
  attemptProfile: CaseResolverWorkspaceFetchAttemptProfile;
}): Array<{ key: string; url: string; scope: 'light' | 'heavy' }> => {
  const attemptScopes: Array<'light' | 'heavy'> =
    strategy === 'heavy_only'
      ? ['heavy']
      : strategy === 'light_only'
        ? ['light']
        : ['light', 'heavy'];
  if (!fresh) {
    return attemptScopes.map((scope) => ({
      key: `${scope}_cached_key`,
      scope,
      url: `/api/settings?scope=${scope}&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
    }));
  }

  if (attemptProfile === 'context_fast' && strategy === 'light_then_heavy') {
    return [
      {
        key: 'light_fresh_key',
        scope: 'light',
        url: `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: 'heavy_fresh_key',
        scope: 'heavy',
        url: `/api/settings?scope=heavy&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: 'light_cached_key',
        scope: 'light',
        url: `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: 'heavy_cached_key',
        scope: 'heavy',
        url: `/api/settings?scope=heavy&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
    ];
  }

  const attempts: Array<{ key: string; url: string; scope: 'light' | 'heavy' }> = [];
  attemptScopes.forEach((scope): void => {
    attempts.push(
      {
        key: `${scope}_fresh_key`,
        scope,
        url: `/api/settings?scope=${scope}&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: `${scope}_cached_key`,
        scope,
        url: `/api/settings?scope=${scope}&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      }
    );
  });
  return attempts;
};
