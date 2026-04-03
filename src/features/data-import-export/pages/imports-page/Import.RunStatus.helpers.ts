import type {
  BaseImportItemRecord,
  BaseImportParameterImportSummary,
  BaseImportRunParameterImportSummary,
} from '@/shared/contracts/integrations';

const DEFAULT_PARAMETER_IMPORT_SUMMARY: BaseImportRunParameterImportSummary = {
  itemsApplied: 0,
  extracted: 0,
  resolved: 0,
  created: 0,
  written: 0,
};

const normalizeParameterImportSummaryCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

const hasParameterImportSummaryActivity = (
  summary: BaseImportParameterImportSummary | BaseImportRunParameterImportSummary | null | undefined
): boolean => {
  if (!summary) {
    return false;
  }

  return (
    summary.extracted > 0 || summary.resolved > 0 || summary.created > 0 || summary.written > 0
  );
};

const getItemCompletionTimestamp = (item: BaseImportItemRecord): number => {
  const parsed = Date.parse(item.finishedAt ?? item.updatedAt ?? '');
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const hasRetryableImportItems = (items: BaseImportItemRecord[]): boolean =>
  items.some((item: BaseImportItemRecord) => item.status === 'failed' || item.status === 'pending');

export const getImportRunErrorItems = (
  items: BaseImportItemRecord[],
  limit = 10
): BaseImportItemRecord[] => {
  return items
    .filter((item: BaseImportItemRecord) => item.status === 'failed' || Boolean(item.errorMessage))
    .slice(0, limit);
};

export const buildParameterImportSummaryFromItems = (
  items: BaseImportItemRecord[]
): BaseImportRunParameterImportSummary | null => {
  const aggregated = items.reduce(
    (
      acc: BaseImportRunParameterImportSummary,
      item: BaseImportItemRecord
    ): BaseImportRunParameterImportSummary => {
      const summary = item.parameterImportSummary;
      if (!summary) {
        return acc;
      }

      return {
        itemsApplied: acc.itemsApplied + 1,
        extracted: acc.extracted + normalizeParameterImportSummaryCount(summary.extracted),
        resolved: acc.resolved + normalizeParameterImportSummaryCount(summary.resolved),
        created: acc.created + normalizeParameterImportSummaryCount(summary.created),
        written: acc.written + normalizeParameterImportSummaryCount(summary.written),
      };
    },
    DEFAULT_PARAMETER_IMPORT_SUMMARY
  );

  return hasParameterImportSummaryActivity(aggregated) || aggregated.itemsApplied > 0
    ? aggregated
    : null;
};

export const resolveImportRunParameterImportSummary = (
  runSummary: BaseImportRunParameterImportSummary | null | undefined,
  items: BaseImportItemRecord[]
): BaseImportRunParameterImportSummary | null => {
  if (hasParameterImportSummaryActivity(runSummary) || (runSummary?.itemsApplied ?? 0) > 0) {
    return runSummary ?? null;
  }

  if (items.length === 0) {
    return null;
  }

  return buildParameterImportSummaryFromItems(items);
};

export const compareImportItemsByLatestCompletion = (
  left: BaseImportItemRecord,
  right: BaseImportItemRecord
): number => {
  const leftTime = getItemCompletionTimestamp(left);
  const rightTime = getItemCompletionTimestamp(right);

  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
  if (!Number.isFinite(leftTime)) return 1;
  if (!Number.isFinite(rightTime)) return -1;
  return rightTime - leftTime;
};

export const getParameterSyncHistoryItems = (
  items: BaseImportItemRecord[],
  limit = 8
): BaseImportItemRecord[] => {
  return items
    .filter((item: BaseImportItemRecord) => Boolean(item.parameterImportSummary))
    .sort(compareImportItemsByLatestCompletion)
    .slice(0, limit);
};
