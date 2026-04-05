export type FileUploadEventsFilterStatus = 'all' | 'success' | 'error';
export type FileUploadEventsFilterTextKey = 'category' | 'projectId' | 'fromDate' | 'toDate';
export type FileUploadEventsFilterUpdate =
  | { key: 'status'; value: FileUploadEventsFilterStatus }
  | { key: FileUploadEventsFilterTextKey; value: string };

const FILE_UPLOAD_EVENTS_TEXT_FILTER_KEYS = new Set<FileUploadEventsFilterTextKey>([
  'category',
  'projectId',
  'fromDate',
  'toDate',
]);

const coerceFileUploadEventsStatus = (value: unknown): FileUploadEventsFilterStatus =>
  value === 'error' || value === 'success' || value === 'all' ? value : 'all';

const coerceFileUploadEventsText = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export const resolveFileUploadEventsFilterUpdate = (
  key: string,
  value: unknown
): FileUploadEventsFilterUpdate | null => {
  if (key === 'status') {
    return {
      key: 'status',
      value: coerceFileUploadEventsStatus(value),
    };
  }

  if (!FILE_UPLOAD_EVENTS_TEXT_FILTER_KEYS.has(key as FileUploadEventsFilterTextKey)) {
    return null;
  }

  return {
    key: key as FileUploadEventsFilterTextKey,
    value: coerceFileUploadEventsText(value),
  };
};
