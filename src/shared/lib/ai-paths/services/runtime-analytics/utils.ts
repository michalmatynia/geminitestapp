import 'server-only';

import { randomUUID } from 'crypto';
import { RETENTION_MS } from './config';
import { normalizeAiPathRuntimeNodeStatus } from '@/shared/contracts/ai-paths-runtime';

export const toTimestampMs = (value?: Date | string | number | null): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

export const normalizeNodeStatus = (value: unknown): string | null => {
  const normalized = normalizeAiPathRuntimeNodeStatus(value);
  if (normalized) return normalized;
  if (typeof value !== 'string') return null;
  const legacy = value.trim().toLowerCase();
  if (!legacy) return null;
  return legacy === 'started' ? legacy : null;
};

export const buildEventMember = (type: string, id: string, timestampMs: number): string =>
  `${type}|${id}|${timestampMs}|${randomUUID()}`;

export const buildDurationMember = (
  runId: string,
  durationMs: number,
  timestampMs: number
): string => `${timestampMs}|${Math.max(0, Math.round(durationMs))}|${runId}|${randomUUID()}`;

export const pruneBefore = (timestampMs: number): number => Math.max(0, timestampMs - RETENTION_MS);

export const clampRate = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const toPipelineCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
};

export const toPipelineStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item: unknown): item is string => typeof item === 'string');
};

export const parseDurationMember = (member: string): number | null => {
  const parts = member.split('|');
  if (parts.length < 2) return null;
  const value = Number(parts[1]);
  return Number.isFinite(value) ? Math.max(0, value) : null;
};

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const toFiniteDurationMs = (
  value: unknown,
  startedAt: unknown,
  finishedAt: unknown
): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  const startedAtValue = toNonEmptyString(startedAt);
  const finishedAtValue = toNonEmptyString(finishedAt);
  if (!startedAtValue || !finishedAtValue) return null;
  const startedAtMs = Date.parse(startedAtValue);
  const finishedAtMs = Date.parse(finishedAtValue);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) return null;
  return Math.max(0, Math.round(finishedAtMs - startedAtMs));
};
