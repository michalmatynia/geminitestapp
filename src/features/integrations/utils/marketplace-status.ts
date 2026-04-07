export const normalizeMarketplaceStatus = (value: string): string => value.trim().toLowerCase();

export const SUCCESS_STATUSES = new Set(['active', 'success', 'completed', 'listed', 'ok']);
export const PENDING_STATUSES = new Set([
  'warning',
  'pending',
  'queued',
  'queued_relist',
]);
export const PROCESSING_STATUSES = new Set([
  'processing',
  'in_progress',
  'running',
]);
export const FAILURE_STATUSES = new Set([
  'failed',
  'error',
  'auth_required',
  'needs_login',
  'removed',
  'archived',
]);
