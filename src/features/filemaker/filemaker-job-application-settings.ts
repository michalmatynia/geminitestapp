export const FILEMAKER_JOB_APPLICATION_SETTINGS_KEY = 'filemaker_job_application_settings_v1';

export type FilemakerJobApplicationSettings = {
  defaultPersonId: string;
  defaultPersonName: string;
};

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const parseRawJobApplicationSettings = (raw: string | null | undefined): unknown => {
  if (raw === null || raw === undefined || raw.trim().length === 0) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
};

export const createDefaultFilemakerJobApplicationSettings =
  (): FilemakerJobApplicationSettings => ({
    defaultPersonId: '',
    defaultPersonName: '',
  });

export const normalizeFilemakerJobApplicationSettings = (
  value: unknown
): FilemakerJobApplicationSettings => {
  if (typeof value === 'string') {
    return {
      defaultPersonId: value.trim(),
      defaultPersonName: '',
    };
  }

  const input =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    defaultPersonId: readString(input['defaultPersonId'] ?? input['personId']),
    defaultPersonName: readString(input['defaultPersonName'] ?? input['personName']),
  };
};

export const parseFilemakerJobApplicationSettings = (
  raw: string | null | undefined
): FilemakerJobApplicationSettings =>
  normalizeFilemakerJobApplicationSettings(parseRawJobApplicationSettings(raw));
