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

const optionalRunString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeRunCount = (value: unknown): number => {
  const parsed = Number(value);
  return Math.max(0, Math.trunc(Number.isFinite(parsed) ? parsed : 0));
};

export const createFilemakerEmailCampaignRun = (
  input: Partial<FilemakerEmailCampaignRun> & Pick<FilemakerEmailCampaignRun, 'campaignId'>
): FilemakerEmailCampaignRun => {
  const now = new Date().toISOString();
  const mode = normalizeString(input.mode).toLowerCase();

  return {
    id: resolveRunId(input),
    campaignId: normalizeString(input.campaignId),
    mode: mode === 'dry_run' ? 'dry_run' : 'live',
    status: resolveRunStatus(input.status ?? ''),
    launchReason: optionalRunString(input.launchReason),
    startedAt: optionalRunString(input.startedAt),
    completedAt: optionalRunString(input.completedAt),
    recipientCount: normalizeRunCount(input.recipientCount),
    deliveredCount: normalizeRunCount(input.deliveredCount),
    failedCount: normalizeRunCount(input.failedCount),
    skippedCount: normalizeRunCount(input.skippedCount),
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
          const runInput: Partial<FilemakerEmailCampaignRun> &
            Pick<FilemakerEmailCampaignRun, 'campaignId'> =
            entry as Partial<FilemakerEmailCampaignRun> &
              Pick<FilemakerEmailCampaignRun, 'campaignId'>;
          return createFilemakerEmailCampaignRun(runInput);
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
        };
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
