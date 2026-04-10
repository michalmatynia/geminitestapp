import {
  updateBaseImportRunItem,
  recomputeBaseImportRunStats,
  listBaseImportRunItems,
  putBaseImportRunItems,
  updateBaseImportRunStatus,
} from '@/features/integrations/services/imports/base-import-run-repository';
import { BaseImportErrorCode, BaseImportErrorClass, BaseImportItemRecord, BaseImportItemStatus } from '@/shared/contracts/integrations/base-com';
import {
  buildSummaryMessage,
  determineBaseImportTerminalStatus,
} from '@/features/integrations/services/imports/base-import-error-utils';

import { nowIso } from '../base-import-service-shared';

const TERMINAL_RUN_STATUSES = new Set(['completed', 'partial_success', 'failed', 'canceled']);
const TERMINAL_ITEM_STATUSES = new Set<BaseImportItemStatus>([
  'imported',
  'updated',
  'skipped',
  'failed',
]);

export const markRunItem = async (
  runId: string,
  item: BaseImportItemRecord,
  patch: Partial<BaseImportItemRecord>,
  options?: { recompute?: boolean }
): Promise<void> => {
  const normalizedPatch: Partial<BaseImportItemRecord> = {
    ...patch,
    ...(patch.status && TERMINAL_ITEM_STATUSES.has(patch.status) && patch.finishedAt === undefined
      ? { finishedAt: nowIso() }
      : {}),
  };

  await updateBaseImportRunItem(runId, item.itemId, normalizedPatch);
  if (options?.recompute !== false) {
    const refreshed = await recomputeBaseImportRunStats(runId);
    const stats = refreshed.stats;
    const pending = stats?.pending ?? 0;
    const processing = stats?.processing ?? 0;
    const total = stats?.total ?? 0;
    const runAlreadyTerminal = TERMINAL_RUN_STATUSES.has(refreshed.status);

    if (!runAlreadyTerminal && total > 0 && pending === 0 && processing === 0) {
      await updateBaseImportRunStatus(runId, determineBaseImportTerminalStatus(stats), {
        finishedAt: nowIso(),
        summaryMessage: buildSummaryMessage(stats, Boolean(refreshed.params?.dryRun)),
      });
    }
  }
};

export const failRemainingItems = async (input: {
  runId: string;
  allowedStatuses: Set<BaseImportItemStatus>;
  code: BaseImportErrorCode;
  errorClass: BaseImportErrorClass;
  retryable: boolean;
  message: string;
}): Promise<void> => {
  const items = await listBaseImportRunItems(input.runId);
  const now = nowIso();
  const toFail: BaseImportItemRecord[] = [];

  for (const item of items) {
    if (!input.allowedStatuses.has(item.status)) continue;
    toFail.push({
      ...item,
      status: 'failed',
      action: 'failed',
      errorCode: input.code,
      errorClass: input.errorClass,
      retryable: input.retryable,
      errorMessage: input.message,
      lastErrorAt: now,
      nextRetryAt: null,
      finishedAt: now,
    });
  }

  if (toFail.length > 0) {
    await putBaseImportRunItems(toFail);
  }
  await recomputeBaseImportRunStats(input.runId);
};
