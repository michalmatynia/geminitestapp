import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import {
  type FilemakerEmailCampaignRun,
  type FilemakerEmailCampaignRunRegistry,
  type FilemakerEmailCampaignRunStatus,
} from '../types';
import {
  FILEMAKER_CAMPAIGN_RUN_VERSION,
} from './campaign-factories.constants';
import {
  sortRegistryEntriesNewestFirst,
  parseCampaignRegistryJson,
  dedupeByNormalizedId,
} from './campaign-factory-utils.helpers';

const resolveRunId = (input: Partial<FilemakerEmailCampaignRun>): string => {
  const id = normalizeString(input.id);
  if (id.length > 0) return id;
  const now = new Date().toISOString();
  const token = toIdToken(`${input.campaignId}-${now}`);
  return `filemaker-email-campaign-run-${token.length > 0 ? token : 'entry'}`;
};

const resolveRunStatus = (status: string): FilemakerEmailCampaignRunStatus => {
  const normalized = normalizeString(status).toLowerCase();
  const valid = ['queued', 'running', 'completed', 'failed', 'cancelled', 'pending'];
  if (valid.includes(normalized)) return normalized as FilemakerEmailCampaignRunStatus;
  return 'pending';
};

export const createFilemakerEmailCampaignRun = (
  input: Partial<FilemakerEmailCampaignRun> & Pick<FilemakerEmailCampaignRun, 'campaignId'>
): FilemakerEmailCampaignRun => {
  const now = new Date().toISOString();
  const mode = normalizeString(input.mode).toLowerCase();
  const launchReason = normalizeString(input.launchReason);
  const startedAt = normalizeString(input.startedAt);
  const completedAt = normalizeString(input.completedAt);

  return {
    id: resolveRunId(input),
    campaignId: normalizeString(input.campaignId),
    mode: mode === 'dry_run' ? 'dry_run' : 'live',
    status: resolveRunStatus(input.status ?? ''),
    launchReason: launchReason.length > 0 ? launchReason : null,
    startedAt: startedAt.length > 0 ? startedAt : null,
    completedAt: completedAt.length > 0 ? completedAt : null,
    recipientCount: Math.max(0, Math.trunc(Number(input.recipientCount) || 0)),
    deliveredCount: Math.max(0, Math.trunc(Number(input.deliveredCount) || 0)),
    failedCount: Math.max(0, Math.trunc(Number(input.failedCount) || 0)),
    skippedCount: Math.max(0, Math.trunc(Number(input.skippedCount) || 0)),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignRunRegistry =
  (): FilemakerEmailCampaignRunRegistry => ({
    version: FILEMAKER_CAMPAIGN_RUN_VERSION,
    runs: [],
  });

export const normalizeFilemakerEmailCampaignRunRegistry = (
  value: FilemakerEmailCampaignRunRegistry | null | undefined
): FilemakerEmailCampaignRunRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignRunRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawRuns = Array.isArray(record['runs']) ? record['runs'] : [];
  const runs = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(
      rawRuns.map((entry: unknown): FilemakerEmailCampaignRun => {
        if (entry !== null && typeof entry === 'object') {
          return createFilemakerEmailCampaignRun(
            entry as Partial<FilemakerEmailCampaignRun> & Pick<FilemakerEmailCampaignRun, 'campaignId'>
          );
        }
        return {
          id: '',
          campaignId: '',
          mode: 'live',
          status: 'pending',
          recipientCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          skippedCount: 0,
          createdAt: '',
          updatedAt: '',
        } as FilemakerEmailCampaignRun;
      })
    )
  );

  return {
    version: FILEMAKER_CAMPAIGN_RUN_VERSION,
    runs,
  };
};

export const parseFilemakerEmailCampaignRunRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignRunRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (parsed === null || parsed === undefined) return createDefaultFilemakerEmailCampaignRunRegistry();
  return normalizeFilemakerEmailCampaignRunRegistry(parsed as FilemakerEmailCampaignRunRegistry);
};

export const toPersistedFilemakerEmailCampaignRunRegistry = (
  value: FilemakerEmailCampaignRunRegistry | null | undefined
): FilemakerEmailCampaignRunRegistry => normalizeFilemakerEmailCampaignRunRegistry(value);
