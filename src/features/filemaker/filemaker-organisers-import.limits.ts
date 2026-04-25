import { toPersistedFilemakerDatabase } from './filemaker-settings.database';
import type { FilemakerDatabase } from './types';

const ORGANISER_BROWSER_IMPORT_MAX_BYTES = 25 * 1024 * 1024;
const FILEMAKER_DATABASE_SETTING_MAX_BYTES = 12 * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
};

const getTextByteLength = (value: string): number => new Blob([value]).size;

export const assertBrowserOrganiserImportFileSize = (file: {
  name: string;
  size: number;
}): void => {
  if (file.size <= ORGANISER_BROWSER_IMPORT_MAX_BYTES) return;
  throw new Error(
    `Organiser import "${file.name}" is ${formatFileSize(file.size)}. Browser import is capped at ${formatFileSize(ORGANISER_BROWSER_IMPORT_MAX_BYTES)} to avoid tab crashes; this export needs collection-backed FileMaker storage instead of the browser settings importer.`
  );
};

export const toBrowserOrganiserImportPersistedValue = (
  database: FilemakerDatabase,
  importedOrganizationCount: number
): string => {
  const persistedValue = JSON.stringify(toPersistedFilemakerDatabase(database));
  const persistedValueBytes = getTextByteLength(persistedValue);
  if (persistedValueBytes <= FILEMAKER_DATABASE_SETTING_MAX_BYTES) return persistedValue;
  throw new Error(
    `Organiser import parsed ${importedOrganizationCount} records, but the resulting FileMaker database payload is ${formatFileSize(persistedValueBytes)}. The current browser settings importer is capped at ${formatFileSize(FILEMAKER_DATABASE_SETTING_MAX_BYTES)}; this export needs collection-backed FileMaker storage before it can be written.`
  );
};
