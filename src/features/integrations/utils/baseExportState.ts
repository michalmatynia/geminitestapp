const BASE_EXPORT_BLOCKING_STATUSES = new Set([
  'pending',
  'queued',
  'running',
  'processing',
  'in_progress',
]);

export const isBaseExportBlockingStatus = (
  status: string | null | undefined
): boolean => BASE_EXPORT_BLOCKING_STATUSES.has((status ?? '').trim().toLowerCase());
