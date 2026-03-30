import type { BaseOrderImportQuickImportResponse } from '@/shared/contracts/products';

export type BaseOrderQuickImportFeedback = {
  variant: 'success' | 'info';
  message: string;
};

const formatSkippedImportedSuffix = (skippedImportedCount: number): string =>
  skippedImportedCount > 0 ? ` ${skippedImportedCount} already imported.` : '';

export function buildBaseOrderQuickImportFeedback(
  response: BaseOrderImportQuickImportResponse
): BaseOrderQuickImportFeedback {
  if (response.importedCount > 0) {
    return {
      variant: 'success',
      message: `Imported ${response.importedCount} orders from Base.com. Created ${response.createdCount}, updated ${response.updatedCount}.${formatSkippedImportedSuffix(
        response.skippedImportedCount
      )}`,
    };
  }

  if (response.preview.stats.total === 0) {
    return {
      variant: 'info',
      message: 'No Base.com orders matched the current import scope.',
    };
  }

  return {
    variant: 'info',
    message: `No new or changed orders to import. Loaded ${response.preview.stats.total} orders and skipped ${response.skippedImportedCount} already imported.`,
  };
}
