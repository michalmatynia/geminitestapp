import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { queueState } from './state';
import { SYSTEM_LOG_ALERT_COOLDOWN_SECONDS, SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS } from './config';

export const isInCooldown = (now: number): boolean => {
  if (queueState.lastAlertAt === 0) return false;
  const elapsedSeconds = (now - queueState.lastAlertAt) / 1000;
  return elapsedSeconds < SYSTEM_LOG_ALERT_COOLDOWN_SECONDS;
};

export const isInSilenceCooldown = (now: number): boolean => {
  if (queueState.lastSilenceAlertAt === 0) return false;
  const elapsedSeconds = (now - queueState.lastSilenceAlertAt) / 1000;
  return elapsedSeconds < SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS;
};

export const isPerSourceInCooldown = (source: string, now: number): boolean => {
  const last = queueState.perSourceLastAlertAt[source] ?? 0;
  if (!last) return false;
  const elapsedSeconds = (now - last) / 1000;
  return elapsedSeconds < SYSTEM_LOG_ALERT_COOLDOWN_SECONDS;
};

export const isScopedCooldown = (
  value: string,
  now: number,
  map: Record<string, number>,
  cooldownSeconds: number
): boolean => {
  const last = map[value] ?? 0;
  if (!last) return false;
  const elapsedSeconds = (now - last) / 1000;
  return elapsedSeconds < cooldownSeconds;
};

export const readDurationMs = (log: SystemLogRecord): number | null => {
  const raw = log.context?.['durationMs'];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
