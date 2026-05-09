import { type CaseResolverNodeFileSnapshot } from '@/shared/contracts/case-resolver';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from './settings';
import {
  buildCaseResolverNodeFileSnapshotKey,
  fetchSettingsPayloadWithTimeout,
  fetchSettingRecordValue,
  persistSettingValue,
} from '@/features/case-resolver/services/node-file';
import { logCaseResolverWorkspaceEvent } from './workspace-observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export { buildCaseResolverNodeFileSnapshotKey, fetchSettingsPayloadWithTimeout };

export const fetchCaseResolverNodeFileSnapshotText = async (
  assetId: string,
  timeoutMs: number,
  source = 'node_file_workspace_load'
): Promise<string | null> => {
  const normalizedAssetId = assetId.trim();
  if (normalizedAssetId.length === 0) return null;
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
    logClientError(error);
    logCaseResolverWorkspaceEvent({
      source,
      action: 'node_file_snapshot_validation_failed',
      message: `asset_id=${assetId} ${error instanceof Error ? error.message : 'unknown_error'}`,
    });
    throw error;
  }
};

export const persistCaseResolverNodeFileSnapshotText = ({
  assetId,
  textContent,
  source,
}: {
  assetId: string;
  textContent: string;
  source: string;
}): Promise<boolean> => {
  const normalizedAssetId = assetId.trim();
  if (normalizedAssetId.length === 0) return Promise.resolve(false);
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
