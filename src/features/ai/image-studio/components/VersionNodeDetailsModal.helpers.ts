type OperationSummary = {
  label: string;
  relationType: string;
  timestamp: string | null;
  operationMetadata: Record<string, unknown> | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

type OperationSummaryRule = {
  prefix: string;
  label: string;
  metadataKey?: string;
  timestampKeys?: readonly string[];
};

const OPERATION_SUMMARY_RULES: readonly OperationSummaryRule[] = [
  { prefix: 'crop:', label: 'Crop', metadataKey: 'crop', timestampKeys: ['timestamp'] },
  { prefix: 'center:', label: 'Center', metadataKey: 'center', timestampKeys: ['timestamp'] },
  { prefix: 'upscale:', label: 'Upscale', metadataKey: 'upscale', timestampKeys: ['timestamp'] },
  {
    prefix: 'autoscale:',
    label: 'Auto Scaler',
    metadataKey: 'autoscale',
    timestampKeys: ['timestamp'],
  },
  { prefix: 'mask:', label: 'Mask', timestampKeys: ['attachedAt'] },
  { prefix: 'merge:', label: 'Merge' },
  { prefix: 'composite:', label: 'Composite' },
  { prefix: 'generation:', label: 'Generation' },
] as const;

const resolveOperationTimestamp = (
  metadata: Record<string, unknown>,
  operationMetadata: Record<string, unknown> | null,
  keys: readonly string[] | undefined
): string | null => {
  if (keys) {
    for (const key of keys) {
      const operationValue = asString(operationMetadata?.[key]);
      if (operationValue) return operationValue;
      const metadataValue = asString(metadata[key]);
      if (metadataValue) return metadataValue;
    }
  }

  return asString(metadata['timestamp']) ?? null;
};

const toRoleLabel = (role: string): string =>
  role ? `${role[0]?.toUpperCase() ?? ''}${role.slice(1)}` : 'Unknown';

export const formatVersionNodeIdList = (values: readonly string[]): string =>
  values.length > 0 ? values.join(', ') : 'n/a';

export const resolveOperationSummary = (
  metadata: Record<string, unknown> | null
): OperationSummary => {
  const metadataRecord = metadata ?? {};
  const relationType = asString(metadataRecord['relationType'])?.toLowerCase() ?? '';
  const matchingRule = OPERATION_SUMMARY_RULES.find((rule) => relationType.startsWith(rule.prefix));

  if (matchingRule) {
    const operationMetadata = matchingRule.metadataKey
      ? asRecord(metadataRecord[matchingRule.metadataKey])
      : metadataRecord;
    return {
      label: matchingRule.label,
      relationType,
      timestamp: resolveOperationTimestamp(
        metadataRecord,
        operationMetadata,
        matchingRule.timestampKeys
      ),
      operationMetadata,
    };
  }

  const role = asString(metadataRecord['role'])?.toLowerCase() ?? '';
  return {
    label: toRoleLabel(role),
    relationType: relationType || 'n/a',
    timestamp: null,
    operationMetadata: metadataRecord,
  };
};

export type { OperationSummary };
