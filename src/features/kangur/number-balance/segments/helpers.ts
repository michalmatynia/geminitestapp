import {
  DEFAULT_ROUND_DURATION_MS,
  MATCH_TTL_MS,
} from './constants';

export const normalizeDuration = (value?: number): number => {
  if (!value || !Number.isFinite(value)) return DEFAULT_ROUND_DURATION_MS;
  return Math.max(5_000, Math.min(60_000, Math.trunc(value)));
};

export const normalizeBalancedProbability = (value?: number): number | undefined => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value));
};

export const computeExpiresAt = (nowMs: number): Date => new Date(nowMs + MATCH_TTL_MS);
