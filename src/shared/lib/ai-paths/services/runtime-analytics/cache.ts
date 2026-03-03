'use client';

 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
 
 
 

import { 
  AiPathRuntimeAnalyticsRange, 
  AiPathRuntimeAnalyticsSummary 
} from '@/shared/contracts/ai-paths';
import { 
  SUMMARY_CACHE_TTL_MS, 
  SUMMARY_RANGE_BUCKET_MS 
} from './config';

type SummaryCacheEntry = {
  value: AiPathRuntimeAnalyticsSummary;
  expiresAt: number;
};

const summaryCache = new Map<string, SummaryCacheEntry>();
export const summaryInFlight = new Map<string, Promise<AiPathRuntimeAnalyticsSummary>>();

export const buildSummaryCacheKey = (
  fromMs: number,
  toMs: number,
  range: AiPathRuntimeAnalyticsRange | 'custom'
): string => {
  if (range === 'custom') {
    return `custom:${fromMs}:${toMs}`;
  }
  const bucket = Math.floor(toMs / SUMMARY_RANGE_BUCKET_MS);
  return `${range}:${bucket}`;
};

export const pruneSummaryCache = (now: number): void => {
  summaryCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      summaryCache.delete(key);
    }
  });
};

export const readCachedSummary = (cacheKey: string, now: number): AiPathRuntimeAnalyticsSummary | null => {
  const cached = summaryCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    summaryCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

export const readStaleSummary = (cacheKey: string): AiPathRuntimeAnalyticsSummary | null => {
  const cached = summaryCache.get(cacheKey);
  return cached?.value ?? null;
};

export const setCachedSummary = (
  cacheKey: string,
  summary: AiPathRuntimeAnalyticsSummary,
  now: number
): void => {
  summaryCache.set(cacheKey, {
    value: summary,
    expiresAt: now + SUMMARY_CACHE_TTL_MS,
  });
  pruneSummaryCache(now);
};
