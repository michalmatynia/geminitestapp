/**
 * AI Insights Generator Utilities
 * 
 * Utility functions for AI insights generation and data processing.
 * Provides:
 * - Analytics event sanitization
 * - Record type validation and conversion
 * - Event data normalization
 * - Safe data transformation
 * - Input validation for insights
 */

import type { AnalyticsEvent, AnalyticsSummary } from '@/shared/contracts/analytics';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

export const sanitizeEvents = (
  events: AnalyticsSummary['recent'] | undefined
): Record<string, unknown>[] =>
  (events ?? []).map((event: AnalyticsEvent) => ({
    id: event.id,
    ts: event.ts,
    type: event.type,
    scope: event.scope,
    path: event.path,
    referrer: event.referrer ?? null,
    country: event.country ?? null,
    language: event.language ?? null,
    meta: event.meta ?? null,
  }));

export const stripCodeFence = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }
  return trimmed;
};

const enqueueRecordErrors = (record: Record<string, unknown>, queue: unknown[]): void => {
  if ('error' in record) queue.push(record['error']);
  if (isUnknownArray(record['errors'])) {
    queue.push(...record['errors']);
  }
};

const collectErrorMessage = (current: unknown, queue: unknown[]): string | null => {
  if (current instanceof Error) {
    if (current.cause !== undefined) queue.push(current.cause);
    return current.message;
  }

  if (typeof current === 'string') return current;

  const record = asRecord(current);
  if (record === null) return null;

  enqueueRecordErrors(record, queue);
  const message = record['message'];
  return typeof message === 'string' ? message : null;
};

export const collectErrorMessages = (error: unknown): string[] => {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const messages: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === null || current === undefined || seen.has(current)) continue;
    seen.add(current);

    const message = collectErrorMessage(current, queue);
    if (message !== null) messages.push(message);
  }

  return [...new Set(messages)];
};
