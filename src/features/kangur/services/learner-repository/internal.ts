import {
  DEFAULT_DUEL_SEARCH_CONTAINS_CAP,
  MAX_DUEL_SEARCH_CONTAINS_CAP,
} from './types';

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const resolveDuelSearchContainsCap = (): number => {
  const raw = process.env['KANGUR_DUEL_SEARCH_CONTAINS_CAP'];
  if (!raw) {
    return DEFAULT_DUEL_SEARCH_CONTAINS_CAP;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DUEL_SEARCH_CONTAINS_CAP;
  }
  return Math.max(0, Math.min(MAX_DUEL_SEARCH_CONTAINS_CAP, parsed));
};

export const isMongoDuplicateKeyError = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : null;
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return code === 11000 || message.includes('E11000');
};
