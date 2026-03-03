import type { AnalyticsEventDto, AnalyticsSummaryDto } from '@/shared/contracts/analytics';

export const sanitizeEvents = (
  events: AnalyticsSummaryDto['recent'] | undefined
): Record<string, unknown>[] =>
  (events ?? []).map((event: AnalyticsEventDto) => ({
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
      if ('message' in current && typeof (current as any).message === 'string') {
        messages.push((current as any).message);
      }
      if ('error' in current) queue.push((current as any).error);
      if ('errors' in current && Array.isArray((current as any).errors)) {
        queue.push(...(current as any).errors);
      }
    } else if (typeof current === 'string') {
      messages.push(current);
    }
  }

  return [...new Set(messages)];
};
