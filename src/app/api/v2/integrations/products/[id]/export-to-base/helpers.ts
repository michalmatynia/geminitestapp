export * from './segments/index';
export { exportSchema, type BaseExportRequestData, type BaseFieldMapping } from './segments/common';
export {
  BASE_EXPORT_RUN_PATH_ID,
  BASE_EXPORT_RUN_PATH_NAME,
  BASE_EXPORT_RUN_SOURCE as BASE_EXPORT_SOURCE,
} from '@/features/integrations/services/base-export-segments/constants';

export const inFlightExportRequests = new Map<string, number>();

export const clearExpiredExportRequestLocks = (): void => {
  const now = Date.now();
  const EXPIRE_MS = 60_000 * 15; // 15 minutes
  Array.from(inFlightExportRequests.entries()).forEach(([id, ts]) => {
    if (now - ts > EXPIRE_MS) {
      inFlightExportRequests.delete(id);
    }
  });
};
