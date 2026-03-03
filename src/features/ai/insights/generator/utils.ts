import type { AnalyticsEvent, AnalyticsSummary } from '@/shared/contracts/analytics';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

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

export const collectErrorMessages = (error: unknown): string[] => {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const messages: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (current instanceof Error) {
      messages.push(current.message);
      if (current.cause) queue.push(current.cause);
    } else if (typeof current === 'object') {
      const record = asRecord(current);
      if (!record) continue;
      if (typeof record['message'] === 'string') {
        messages.push(record['message']);
      }
      if ('error' in record) queue.push(record['error']);
      if (Array.isArray(record['errors'])) {
        for (const nestedError of record['errors'] as unknown[]) {
          queue.push(nestedError);
        }
      }
    } else if (typeof current === 'string') {
      messages.push(current);
    }
  }

  return [...new Set(messages)];
};
