import type { TriggerEntitySnapshotMode } from '@/shared/contracts/ai-paths-core/nodes-primitives';
import { type TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';

import { toRecord } from './trigger-event-utils';

export const TRIGGER_ENTITY_SNAPSHOT_MAX_DEPTH = 6;
export const TRIGGER_ENTITY_OMITTED_VALUE = '[omitted_large_field]';
export const TRIGGER_ENTITY_HEAVY_KEY_PATTERNS: RegExp[] = [
  /^imagebase64s?$/i,
  /^base64s?$/i,
  /(?:^|[_-])base64(?:$|[_-])/i,
  /(?:^|[_-])binary(?:$|[_-])/i,
  /(?:^|[_-])buffer(?:$|[_-])/i,
  /(?:^|[_-])blob(?:$|[_-])/i,
  /(?:^|[_-])arraybuffer(?:$|[_-])/i,
];

export const shouldOmitTriggerEntityKey = (key: string): boolean =>
  TRIGGER_ENTITY_HEAVY_KEY_PATTERNS.some((pattern) => pattern.test(key));

export const isBase64DataUrl = (value: string): boolean =>
  /^data:[^;]+;base64,/i.test(value.trim());

export const sanitizeTriggerEntityValue = (
  value: unknown,
  depth: number,
  key?: string
): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if ((key && shouldOmitTriggerEntityKey(key)) || isBase64DataUrl(value)) {
      return TRIGGER_ENTITY_OMITTED_VALUE;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .map((item: unknown) => sanitizeTriggerEntityValue(item, depth + 1, key))
      .filter((item: unknown) => item !== undefined);
  }
  if (typeof value !== 'object') return undefined;
  if (depth >= TRIGGER_ENTITY_SNAPSHOT_MAX_DEPTH) {
    return {};
  }

  const next: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
    if (shouldOmitTriggerEntityKey(entryKey)) return;
    const sanitized = sanitizeTriggerEntityValue(entryValue, depth + 1, entryKey);
    if (sanitized !== undefined) {
      next[entryKey] = sanitized;
    }
  });
  return next;
};

export const sanitizeTriggerEntitySnapshot = (
  entityJson?: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!entityJson) return null;
  return toRecord(sanitizeTriggerEntityValue(entityJson, 0));
};

export const resolveTriggerEntitySnapshotMode = (
  value: unknown
): TriggerEntitySnapshotMode => {
  if (value === 'always' || value === 'never' || value === 'auto') {
    return value;
  }
  return 'auto';
};

export const shouldEmbedTriggerEntitySnapshot = (args: {
  mode?: TriggerEntitySnapshotMode | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  sourceLocation?: string | null | undefined;
}): boolean => {
  const mode = resolveTriggerEntitySnapshotMode(args.mode);
  if (mode === 'always') return true;
  if (mode === 'never') return false;

  const normalizedSourceLocation =
    typeof args.sourceLocation === 'string' ? args.sourceLocation.trim().toLowerCase() : null;
  if (args.entityType === 'custom') return true;
  if (
    normalizedSourceLocation === 'product_modal' ||
    normalizedSourceLocation === 'product_row' ||
    normalizedSourceLocation === 'product_marketplace_copy_row' ||
    normalizedSourceLocation === 'note_modal'
  ) {
    return true;
  }
  return typeof args.entityId !== 'string' || args.entityId.trim().length === 0;
};
