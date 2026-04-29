import { type TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';

const MAX_TRIGGER_REQUEST_ID_LENGTH = 200;
const MIN_TRIGGER_ENTITY_PART_LENGTH = 16;

export const isTimeoutMessage = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  return normalized.includes('timed out') || normalized.includes('timeout');
};

const compactRequestIdPart = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  if (maxLength <= MIN_TRIGGER_ENTITY_PART_LENGTH) return value.slice(0, maxLength);
  const headLength = Math.ceil((maxLength - 2) * 0.6);
  const tailLength = Math.max(0, maxLength - headLength - 2);
  return `${value.slice(0, headLength)}--${value.slice(-tailLength)}`;
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
  const prefix = `trigger:${args.pathId}:${args.triggerEventId}:${args.entityType}:`;
  const suffix = `:${randomPart}`;
  const entityPartMaxLength = Math.max(
    MIN_TRIGGER_ENTITY_PART_LENGTH,
    MAX_TRIGGER_REQUEST_ID_LENGTH - prefix.length - suffix.length
  );
  const requestId = `${prefix}${compactRequestIdPart(entityPart, entityPartMaxLength)}${suffix}`;
  if (requestId.length <= MAX_TRIGGER_REQUEST_ID_LENGTH) return requestId;
  return `${requestId.slice(
    0,
    Math.max(0, MAX_TRIGGER_REQUEST_ID_LENGTH - suffix.length)
  )}${suffix}`;
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
