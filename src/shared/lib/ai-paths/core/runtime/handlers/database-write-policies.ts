import type { DatabaseConfig } from '@/shared/contracts/ai-paths';
import { stableStringify } from '@/shared/utils/stable-stringify';

import { normalizeNonEmptyString, toRecord } from './database-parameter-inference-utils';

const CANONICAL_LOCALIZED_PARAMETER_TARGET_PATH = 'parameters';

export type ResolvedLocalizedParameterMergeConfig = {
  targetPath: string;
  languageCode: string;
  requireFullCoverage: boolean;
};

const trimStringValuesDeep = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map((entry: unknown): unknown => trimStringValuesDeep(entry));
  }
  const record = toRecord(value);
  if (!record) {
    return value;
  }
  const nextRecord: Record<string, unknown> = {};
  Object.entries(record).forEach(([key, entry]) => {
    nextRecord[key] = trimStringValuesDeep(entry);
  });
  return nextRecord;
};

const isSkippableTopLevelWriteValue = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.length === 0);

export const resolveLocalizedParameterMergeConfig = (
  dbConfig: DatabaseConfig
): ResolvedLocalizedParameterMergeConfig | null => {
  const config = dbConfig.localizedParameterMerge;
  if (!config?.enabled) return null;

  const targetPath =
    normalizeNonEmptyString(config.targetPath) ?? CANONICAL_LOCALIZED_PARAMETER_TARGET_PATH;
  const languageCode = normalizeNonEmptyString(config.languageCode)?.toLowerCase() ?? '';
  if (targetPath !== CANONICAL_LOCALIZED_PARAMETER_TARGET_PATH || !languageCode) {
    return null;
  }

  return {
    targetPath,
    languageCode,
    requireFullCoverage: config.requireFullCoverage === true,
  };
};

export const applyTopLevelWriteValuePolicies = (args: {
  updates: Record<string, unknown>;
  dbConfig: DatabaseConfig;
}): {
  updates: Record<string, unknown>;
  changedTargets: string[];
} => {
  const changedTargets = new Set<string>();
  const nextUpdates: Record<string, unknown> = {};

  Object.entries(args.updates).forEach(([targetPath, rawValue]) => {
    const nextValue = args.dbConfig.trimStrings ? trimStringValuesDeep(rawValue) : rawValue;
    if (args.dbConfig.skipEmpty && isSkippableTopLevelWriteValue(nextValue)) {
      changedTargets.add(targetPath);
      return;
    }
    if (stableStringify(rawValue) !== stableStringify(nextValue)) {
      changedTargets.add(targetPath);
    }
    nextUpdates[targetPath] = nextValue;
  });

  return {
    updates: nextUpdates,
    changedTargets: Array.from(changedTargets),
  };
};
