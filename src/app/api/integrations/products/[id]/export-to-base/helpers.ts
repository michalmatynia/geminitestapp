export * from './segments/index';
export { exportSchema, type BaseExportRequestData, type BaseFieldMapping } from './segments/common';

export const BASE_EXPORT_RUN_PATH_ID = 'integration-base-export';
export const BASE_EXPORT_RUN_PATH_NAME = 'Base.com Export Jobs';
export const BASE_EXPORT_SOURCE = 'integration_base_export';

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
