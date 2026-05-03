import type {
  FilemakerJobApplicationArtifactKind,
  FilemakerJobApplicationMatchAnalysisStatus,
  FilemakerJobApplicationStatus,
} from '../filemaker-job-application.types';

export const normalizeRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeRequiredString = (value: unknown, fallback = ''): string =>
  normalizeString(value) ?? fallback;

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): string | null => normalizeString(entry))
    .filter((entry): entry is string => entry !== null);
};

export const normalizeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const normalizeStatus = (value: unknown): FilemakerJobApplicationStatus => {
  if (
    value === 'ready' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'archived' ||
    value === 'draft'
  ) {
    return value;
  }
  return 'draft';
};

export const normalizeOptionalStatus = (
  value: unknown
): FilemakerJobApplicationStatus | null => {
  if (
    value === 'ready' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'archived' ||
    value === 'draft'
  ) {
    return value;
  }
  return null;
};

export const normalizeMatchAnalysisStatus = (
  value: unknown
): FilemakerJobApplicationMatchAnalysisStatus | null => {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value;
  }
  return null;
};

export const normalizeArtifactKind = (
  value: unknown
): FilemakerJobApplicationArtifactKind | null => {
  if (value === 'application_email') return value;
  if (value === 'cover_letter') return value;
  if (value === 'tailored_cv') return value;
  return null;
};

export const normalizeLimit = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return 24;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
};
