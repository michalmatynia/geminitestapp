import {
  updateBaseImportRunItem,
  recomputeBaseImportRunStats,
  listBaseImportRunItems,
  putBaseImportRunItems,
} from '@/features/integrations/services/imports/base-import-run-repository';
import { BaseImportErrorCode, BaseImportErrorClass, BaseImportItemRecord, BaseImportItemStatus } from '@/shared/contracts/integrations/base-com';

import { nowIso } from '../base-import-service-shared';

export const markRunItem = async (
  runId: string,
  item: BaseImportItemRecord,
  patch: Partial<BaseImportItemRecord>,
  options?: { recompute?: boolean }
): Promise<void> => {
  await updateBaseImportRunItem(runId, item.itemId, patch);
  if (options?.recompute !== false) {
    await recomputeBaseImportRunStats(runId);
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
