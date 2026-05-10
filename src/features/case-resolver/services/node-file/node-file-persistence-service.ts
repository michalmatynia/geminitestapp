/**
 * Node File Persistence Service
 * 
 * Manages the fetch and persistence logic for node file snapshots in 
 * the Case Resolver workspace.
 */
import { buildSettingRecordFetchAttempts, resolveSettingRecordFromSettingsPayload } from '@/features/case-resolver/utils/workspace-settings-persistence-helpers';
import { logCaseResolverWorkspaceEvent } from '@/features/case-resolver/workspace-observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const CASE_RESOLVER_NODE_FILE_SNAPSHOT_KEY_PREFIX = 'case_resolver_node_file_snapshot::';
const logNodeFileSnapshotError = logClientError as (error: unknown) => void;

/**
 * Builds a unique key for a node file snapshot.
 */
export const buildCaseResolverNodeFileSnapshotKey = (assetId: string): string =>
  `${CASE_RESOLVER_NODE_FILE_SNAPSHOT_KEY_PREFIX}${assetId.trim()}`;

/**
 * Fetches a settings payload with an abort timeout.
 */
export const fetchSettingsPayloadWithTimeout = async (input: {
  url: string;
  timeoutMs: number;
}): Promise<Response> => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller !== null
    ? setTimeout((): void => {
      controller.abort();
    }, input.timeoutMs)
    : null;
  try {
    return await fetch(input.url, {
      method: 'GET',
      cache: 'no-store',
      ...(controller !== null ? { signal: controller.signal } : {}),
    });
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

type SettingRecordFetchAttempt = ReturnType<typeof buildSettingRecordFetchAttempts>[number];

const logSettingRecordFetchFailure = ({
  attempt,
  error,
  key,
  source,
}: {
  attempt: SettingRecordFetchAttempt;
  error: unknown;
  key: string;
  source: string;
}): void => {
  logNodeFileSnapshotError(error);
  logCaseResolverWorkspaceEvent({
    source,
    action: 'node_file_snapshot_fetch_failed',
    message: `key=${key} attempt=${attempt.key} ${error instanceof Error ? error.message : 'unknown_error'}`,
  });
};

const fetchSettingRecordAttemptValue = async ({
  attempt,
  key,
  source,
  timeoutMs,
}: {
  attempt: SettingRecordFetchAttempt;
  key: string;
  source: string;
  timeoutMs: number;
}): Promise<string | null> => {
  try {
    const response = await fetchSettingsPayloadWithTimeout({
      url: attempt.url,
      timeoutMs,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    const record = resolveSettingRecordFromSettingsPayload(payload, key);
    return record !== null && typeof record.value === 'string' ? record.value : null;
  } catch (error: unknown) {
    logSettingRecordFetchFailure({ attempt, error, key, source });
    return null;
  }
};

/**
 * Fetches a setting record value using multiple strategies and logging.
 */
export const fetchSettingRecordValue = async ({
  key,
  source,
  strategy = 'light_then_heavy',
  fresh = true,
  timeoutMs,
}: {
  key: string;
  source: string;
  strategy?: 'light_then_heavy' | 'light_only' | 'heavy_only';
  fresh?: boolean;
  timeoutMs: number;
}): Promise<string | null> => {
  const attempts = buildSettingRecordFetchAttempts({ key, strategy, fresh });
  return attempts.reduce<Promise<string | null>>(
    async (previousValue, attempt) => {
      const value = await previousValue;
      if (value !== null) return value;
      return fetchSettingRecordAttemptValue({ attempt, key, source, timeoutMs });
    },
    Promise.resolve(null)
  );
};

/**
 * Persists a setting value via API.
 */
export const persistSettingValue = async ({
  key,
  value,
  source,
}: {
  key: string;
  value: string;
  source: string;
}): Promise<boolean> => {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value,
      }),
    });
    if (!response.ok) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'node_file_snapshot_persist_failed',
        message: `key=${key} status=${response.status}`,
      });
      return false;
    }
    return true;
  } catch (error: unknown) {
    logNodeFileSnapshotError(error);
    logCaseResolverWorkspaceEvent({
      source,
      action: 'node_file_snapshot_persist_failed',
      message: `key=${key} ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
    return false;
  }
};
