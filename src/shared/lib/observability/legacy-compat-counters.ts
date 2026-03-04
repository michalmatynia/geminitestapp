import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export type LegacyCompatCounterName =
  | 'legacy_key_read'
  | 'legacy_payload_received'
  | 'compat_route_hit';
export type LegacyCompatCounterSnapshot = Record<LegacyCompatCounterName, number>;

type LegacyCompatCounterRecordInput = {
  source: string;
  context?: Record<string, unknown>;
};

const parseIntWithBounds = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
};

const LOG_EVERY_N = parseIntWithBounds(process.env['LEGACY_COMPAT_COUNTER_LOG_EVERY'], 25, 1, 500);
const LOG_MIN_INTERVAL_MS = parseIntWithBounds(
  process.env['LEGACY_COMPAT_COUNTER_MIN_INTERVAL_MS'],
  15_000,
  1_000,
  300_000
);

const counters: Record<LegacyCompatCounterName, number> = {
  legacy_key_read: 0,
  legacy_payload_received: 0,
  compat_route_hit: 0,
};

const lastLoggedAtMs: Partial<Record<LegacyCompatCounterName, number>> = {};

const shouldLogCounter = (
  counter: LegacyCompatCounterName,
  nextCount: number,
  nowMs: number
): boolean => {
  if (nextCount === 1) return true;
  if (nextCount % LOG_EVERY_N === 0) return true;
  const previous = lastLoggedAtMs[counter] ?? 0;
  return nowMs - previous >= LOG_MIN_INTERVAL_MS;
};

const buildLegacyCompatCounterSnapshot = (): LegacyCompatCounterSnapshot => ({
  legacy_key_read: counters.legacy_key_read,
  legacy_payload_received: counters.legacy_payload_received,
  compat_route_hit: counters.compat_route_hit,
});

export const recordLegacyCompatCounter = (
  counter: LegacyCompatCounterName,
  input: LegacyCompatCounterRecordInput
): void => {
  const nextCount = (counters[counter] ?? 0) + 1;
  counters[counter] = nextCount;
  const nowMs = Date.now();
  if (!shouldLogCounter(counter, nextCount, nowMs)) return;

  lastLoggedAtMs[counter] = nowMs;
  void logSystemEvent({
    level: 'info',
    message: '[legacy-compat] counter increment',
    source: 'legacy-compat-counter',
    context: {
      counter,
      total: nextCount,
      source: input.source,
      ...(input.context ?? {}),
    },
  });
};

export const getLegacyCompatCounterSnapshot = (): LegacyCompatCounterSnapshot =>
  buildLegacyCompatCounterSnapshot();

export const __testOnlyGetLegacyCompatCounterSnapshot = (): LegacyCompatCounterSnapshot =>
  buildLegacyCompatCounterSnapshot();

export const __testOnlyResetLegacyCompatCounters = (): void => {
  counters.legacy_key_read = 0;
  counters.legacy_payload_received = 0;
  counters.compat_route_hit = 0;
  delete lastLoggedAtMs.legacy_key_read;
  delete lastLoggedAtMs.legacy_payload_received;
  delete lastLoggedAtMs.compat_route_hit;
};
