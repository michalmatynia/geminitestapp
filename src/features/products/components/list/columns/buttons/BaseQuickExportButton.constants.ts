import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
export const defaultExportInventoryQueryKey = QUERY_KEYS.integrations.defaultExportInventory();
export const oneClickExportInFlight = new Set<string>();
export const BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY = 'base-quick-export-feedback';
export const ACTIVE_EXPORT_FEEDBACK_TTL_MS = 15 * 60 * 1000;
export const TERMINAL_EXPORT_FEEDBACK_TTL_MS = 30 * 60 * 1000;

export const TERMINAL_EXPORT_RUN_STATUSES = new Set<TriggerButtonRunFeedbackStatus>([
  'completed',
  'failed',
  'canceled',
]);
