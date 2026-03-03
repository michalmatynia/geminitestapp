import {
  type CaseResolverAssetFile,
  type CaseResolverNodeFileSnapshot,
} from '@/shared/contracts/case-resolver';
import {
  parseNodeFileSnapshot,
  serializeNodeFileSnapshot,
} from './settings';
import {
  logCaseResolverWorkspaceEvent,
} from './workspace-observability';
import {
  buildSettingRecordFetchAttempts,
  resolveSettingRecordFromSettingsPayload,
} from './utils/workspace-settings-persistence-helpers';

const CASE_RESOLVER_NODE_FILE_SNAPSHOT_KEY_PREFIX = 'case_resolver_node_file_snapshot::';
export const CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY =
  'nodeFileSnapshotStorage';
const LEGACY_NODE_FILE_PORT_REMAP: Record<string, string> = {
  textfield: 'wysiwygText',
  content: 'plaintextContent',
};

export const buildCaseResolverNodeFileSnapshotKey = (assetId: string): string =>
  `${CASE_RESOLVER_NODE_FILE_SNAPSHOT_KEY_PREFIX}${assetId.trim()}`;

export const readCaseResolverNodeFileSnapshotStorageMode = (
  asset: Pick<CaseResolverAssetFile, 'metadata'>
): string | null => {
  const metadata = asset.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const candidate = metadata[
    CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY
  ];
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
};

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
    const migratedRawValue = tryNormalizeLegacyNodeFileSnapshotRawValue(rawValue);
    if (migratedRawValue) {
      try {
        const migratedSnapshot = parseNodeFileSnapshot(migratedRawValue);
        const didPersistMigratedSnapshot = await persistCaseResolverNodeFileSnapshotText({
          assetId,
          textContent: migratedRawValue,
          source: `${source}:migrate_legacy_edges`,
        });
        logCaseResolverWorkspaceEvent({
          source,
          action: didPersistMigratedSnapshot
            ? 'node_file_snapshot_legacy_edge_normalized'
            : 'node_file_snapshot_legacy_edge_normalized_not_persisted',
          message: `asset_id=${assetId}`,
        });
        return migratedSnapshot;
      } catch (migrationError: unknown) {
        logCaseResolverWorkspaceEvent({
          source,
          action: 'node_file_snapshot_legacy_edge_normalize_failed',
          message: `asset_id=${assetId} ${migrationError instanceof Error ? migrationError.message : 'unknown_error'}`,
        });
      }
    }
    const didPurgeInvalidSnapshot = await deleteCaseResolverNodeFileSnapshot(
      assetId,
      `${source}:purge_invalid_snapshot`
    );
    logCaseResolverWorkspaceEvent({
      source,
      action: 'node_file_snapshot_validation_failed_fallback',
      message: `asset_id=${assetId} purge=${didPurgeInvalidSnapshot ? 'success' : 'failed'}`,
    });
    return null;
  }
};

const normalizeLegacyEdgePort = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return LEGACY_NODE_FILE_PORT_REMAP[trimmed] ?? trimmed;
};

const tryNormalizeLegacyNodeFileSnapshotRawValue = (rawValue: string): string | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const snapshotRecord = parsed as Record<string, unknown>;
  if (!Array.isArray(snapshotRecord['edges'])) {
    return null;
  }

  let didNormalizeLegacyEdge = false;
  const normalizedEdges = (snapshotRecord['edges'] as unknown[]).map((edge: unknown): unknown => {
    if (!edge || typeof edge !== 'object' || Array.isArray(edge)) {
      return edge;
    }
    const edgeRecord = edge as Record<string, unknown>;
    const hasLegacyKeys =
      Object.prototype.hasOwnProperty.call(edgeRecord, 'from') ||
      Object.prototype.hasOwnProperty.call(edgeRecord, 'to') ||
      Object.prototype.hasOwnProperty.call(edgeRecord, 'fromPort') ||
      Object.prototype.hasOwnProperty.call(edgeRecord, 'toPort');

    const source =
      typeof edgeRecord['source'] === 'string' && edgeRecord['source'].trim().length > 0
        ? edgeRecord['source'].trim()
        : typeof edgeRecord['from'] === 'string' && edgeRecord['from'].trim().length > 0
          ? edgeRecord['from'].trim()
          : edgeRecord['source'];
    const target =
      typeof edgeRecord['target'] === 'string' && edgeRecord['target'].trim().length > 0
        ? edgeRecord['target'].trim()
        : typeof edgeRecord['to'] === 'string' && edgeRecord['to'].trim().length > 0
          ? edgeRecord['to'].trim()
          : edgeRecord['target'];
    const sourceHandle = normalizeLegacyEdgePort(
      edgeRecord['sourceHandle'] ?? edgeRecord['fromPort'] ?? null
    );
    const targetHandle = normalizeLegacyEdgePort(
      edgeRecord['targetHandle'] ?? edgeRecord['toPort'] ?? null
    );

    const normalizedEdge: Record<string, unknown> = {
      ...edgeRecord,
      ...(source !== undefined ? { source } : {}),
      ...(target !== undefined ? { target } : {}),
      ...(sourceHandle !== null ? { sourceHandle } : { sourceHandle: null }),
      ...(targetHandle !== null ? { targetHandle } : { targetHandle: null }),
    };
    delete normalizedEdge['from'];
    delete normalizedEdge['to'];
    delete normalizedEdge['fromPort'];
    delete normalizedEdge['toPort'];

    if (
      hasLegacyKeys ||
      sourceHandle !== edgeRecord['sourceHandle'] ||
      targetHandle !== edgeRecord['targetHandle']
    ) {
      didNormalizeLegacyEdge = true;
    }
    return normalizedEdge;
  });

  if (!didNormalizeLegacyEdge) {
    return null;
  }

  return JSON.stringify({
    ...snapshotRecord,
    edges: normalizedEdges,
  });
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
