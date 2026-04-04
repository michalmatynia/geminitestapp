import type {
  BaseOrderImportPersistResponse,
  BaseOrderImportPreviewItem,
  BaseOrderImportPreviewResponse,
  BaseOrderImportQuickImportResponse,
} from '@/shared/contracts/products';

const IMPORTABLE_ORDER_STATES = new Set(['new', 'changed']);

export const listImportablePreviewOrders = (
  preview: BaseOrderImportPreviewResponse
): BaseOrderImportPreviewItem[] =>
  preview.orders.filter((order) => IMPORTABLE_ORDER_STATES.has(order.importState));

export const countSkippedImportedPreviewOrders = (
  preview: BaseOrderImportPreviewResponse
): number => preview.orders.filter((order) => order.importState === 'imported').length;

export const buildQuickImportNoopResponse = (
  preview: BaseOrderImportPreviewResponse
): BaseOrderImportQuickImportResponse => ({
  preview,
  importableCount: 0,
  skippedImportedCount: countSkippedImportedPreviewOrders(preview),
  importedCount: 0,
  createdCount: 0,
  updatedCount: 0,
  syncedAt: null,
  results: [],
});

export const buildQuickImportPersistedResponse = ({
  preview,
  patchedPreview,
  importableOrders,
  importResult,
}: {
  preview: BaseOrderImportPreviewResponse;
  patchedPreview: BaseOrderImportPreviewResponse;
  importableOrders: BaseOrderImportPreviewItem[];
  importResult: BaseOrderImportPersistResponse;
}): BaseOrderImportQuickImportResponse => ({
  preview: patchedPreview,
  importableCount: importableOrders.length,
  skippedImportedCount: countSkippedImportedPreviewOrders(preview),
  importedCount: importResult.createdCount + importResult.updatedCount,
  createdCount: importResult.createdCount,
  updatedCount: importResult.updatedCount,
  syncedAt: importResult.syncedAt,
  results: importResult.results,
});
