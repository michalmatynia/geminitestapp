
import { TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';

export const isTimeoutMessage = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  return normalized.includes('timed out') || normalized.includes('timeout');
};

export const isRecoverableTriggerEnqueueError = (
  message: string | null | undefined
): boolean => {
  if (!message || typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('network request failed') ||
    isTimeoutMessage(message)
  );
};

export const createAiPathTriggerRequestId = (args: {
  pathId: string;
  triggerEventId: string;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
}): string => {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const entityPart =
    typeof args.entityId === 'string' && args.entityId.trim().length > 0
      ? args.entityId.trim()
      : 'entity';
  return `trigger:${args.pathId}:${args.triggerEventId}:${args.entityType}:${entityPart}:${randomPart}`;
};

export const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const waitForMs = async (durationMs: number): Promise<void> => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};
