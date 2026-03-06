import { type CaseResolverNodeFileSnapshot } from '@/shared/contracts/case-resolver';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from './settings';
import { logCaseResolverWorkspaceEvent } from './workspace-observability';
import {
  buildSettingRecordFetchAttempts,
  resolveSettingRecordFromSettingsPayload,
} from './utils/workspace-settings-persistence-helpers';

const CASE_RESOLVER_NODE_FILE_SNAPSHOT_KEY_PREFIX = 'case_resolver_node_file_snapshot::';

export const buildCaseResolverNodeFileSnapshotKey = (assetId: string): string =>
  `${CASE_RESOLVER_NODE_FILE_SNAPSHOT_KEY_PREFIX}${assetId.trim()}`;

export const fetchSettingsPayloadWithTimeout = async (input: {
  url: string;
  timeoutMs: number;
}): Promise<Response> => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout((): void => {
        controller.abort();
      }, input.timeoutMs)
    : null;
  try {
    return await fetch(input.url, {
      method: 'GET',
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {}),
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

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
  for (const attempt of attempts) {
    try {
      const response = await fetchSettingsPayloadWithTimeout({
        url: attempt.url,
        timeoutMs,
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as unknown;
      const record = resolveSettingRecordFromSettingsPayload(payload, key);
      if (!record || typeof record.value !== 'string') continue;
      return record.value;
    } catch (error: unknown) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'node_file_snapshot_fetch_failed',
        message: `key=${key} attempt=${attempt.key} ${error instanceof Error ? error.message : 'unknown_error'}`,
      });
    }
  }
  return null;
};

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
    logCaseResolverWorkspaceEvent({
      source,
      action: 'node_file_snapshot_persist_failed',
      message: `key=${key} ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
    return false;
  }
};

export const fetchCaseResolverNodeFileSnapshotText = async (
  assetId: string,
  timeoutMs: number,
  source = 'node_file_workspace_load'
): Promise<string | null> => {
  const normalizedAssetId = assetId.trim();
  if (!normalizedAssetId) return null;
  const key = buildCaseResolverNodeFileSnapshotKey(normalizedAssetId);
  const value = await fetchSettingRecordValue({
    key,
    source,
    timeoutMs,
  });
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  return value;
};

export const fetchCaseResolverNodeFileSnapshot = async (
  assetId: string,
  timeoutMs: number,
  source = 'node_file_workspace_load'
): Promise<CaseResolverNodeFileSnapshot | null> => {
  const rawValue = await fetchCaseResolverNodeFileSnapshotText(assetId, timeoutMs, source);
  if (rawValue === null) return null;
  try {
    return parseNodeFileSnapshot(rawValue);
  } catch (error: unknown) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'node_file_snapshot_validation_failed',
      message: `asset_id=${assetId} ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
    throw error;
  }
};

export const persistCaseResolverNodeFileSnapshotText = async ({
  assetId,
  textContent,
  source,
}: {
  assetId: string;
  textContent: string;
  source: string;
}): Promise<boolean> => {
  const normalizedAssetId = assetId.trim();
  if (!normalizedAssetId) return false;
  return persistSettingValue({
    key: buildCaseResolverNodeFileSnapshotKey(normalizedAssetId),
    value: textContent,
    source,
  });
};

export const persistCaseResolverNodeFileSnapshot = async ({
  assetId,
  snapshot,
  source = 'node_file_manual_save',
}: {
  assetId: string;
  snapshot: CaseResolverNodeFileSnapshot;
  source?: string;
}): Promise<boolean> =>
  persistCaseResolverNodeFileSnapshotText({
    assetId,
    textContent: serializeNodeFileSnapshot(snapshot),
    source,
  });

export const deleteCaseResolverNodeFileSnapshot = async (
  assetId: string,
  source = 'node_file_delete'
): Promise<boolean> =>
  persistCaseResolverNodeFileSnapshotText({
    assetId,
    textContent: '',
    source,
  });
