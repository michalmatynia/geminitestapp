import { createHash } from 'node:crypto';

import type {
  AiPathsValidationModule,
  AiPathsValidationSeverity,
} from '@/shared/contracts/ai-paths';

import {
  ENUM_FALLBACK_LISTS_BY_SUFFIX,
  ENUM_INFERENCE_SUFFIX_HINT,
  ENUM_STOPWORDS,
  ENUM_VALUE_TOKEN_REGEX,
} from './docs-registry-adapter.constants';
import {
  type AiPathsDocAssertion,
  type AiPathsDocsManifestSource,
  type CoverageMatrixDimensionValue,
} from './docs-registry-adapter.types';

export const hashText = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const toModuleFromNodeType = (nodeType: string): AiPathsValidationModule => {
  if (nodeType === 'trigger') return 'trigger';
  if (nodeType === 'simulation') return 'simulation';
  if (nodeType === 'fetcher') return 'simulation';
  if (nodeType === 'context') return 'context';
  if (nodeType === 'parser' || nodeType === 'regex') return 'parser';
  if (nodeType === 'database') return 'database';
  if (nodeType === 'model' || nodeType === 'agent' || nodeType === 'learner_agent') {
    return 'model';
  }
  if (nodeType === 'poll') return 'poll';
  if (nodeType === 'router') return 'router';
  if (nodeType === 'gate') return 'gate';
  if (nodeType === 'validation_pattern') return 'validation_pattern';
  return 'custom';
};

export const normalizeLabel = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const uniqueStringList = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0)
    )
  );

export const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';
    const next = line[index + 1] ?? '';
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values.map((value: string): string =>
    value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).trim() : value
  );
};

export const parseCsvRecords = (csvText: string): Array<Record<string, string>> => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0] ?? '').map((field: string): string =>
    field.trim().toLowerCase()
  );
  return lines.slice(1).map((line: string): Record<string, string> => {
    const cells = parseCsvLine(line);
    return header.reduce<Record<string, string>>(
      (acc: Record<string, string>, key: string, index: number): Record<string, string> => {
        acc[key] = (cells[index] ?? '').trim();
        return acc;
      },
      {}
    );
  });
};

export const normalizeCoverageDimension = (value: string): CoverageMatrixDimensionValue => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes') return 'yes';
  if (normalized === 'partial') return 'partial';
  if (normalized === 'n/a') return 'n/a';
  return 'no';
};

export const sanitizeFieldPathForId = (value: string): string =>
  value.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

export const inferEnumListFromDescription = (
  fieldPath: string,
  description: string,
  defaultValue?: string
): string[] => {
  const harvested: string[] = [];
  const normalizedDescription = description.trim();
  const normalizedPath = fieldPath.trim();

  const pushToken = (token: string): void => {
    const normalized = token.trim();
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    if (!ENUM_VALUE_TOKEN_REGEX.test(normalized)) return;
    if (ENUM_STOPWORDS.has(lower)) return;
    harvested.push(normalized);
  };

  for (const match of normalizedDescription.matchAll(/\(([A-Za-z0-9_.|/\- ]{3,120})\)/g)) {
    const chunk = match[1] ?? '';
    if (chunk.includes('|')) {
      chunk.split('|').forEach(pushToken);
      continue;
    }
    if (chunk.includes('/')) {
      chunk.split('/').forEach(pushToken);
    }
  }

  for (const match of normalizedDescription.matchAll(
    /\b([A-Za-z][A-Za-z0-9_.-]{1,40}(?:\/[A-Za-z][A-Za-z0-9_.-]{1,40}){1,7})\b/g
  )) {
    const chunk = match[1] ?? '';
    chunk.split('/').forEach(pushToken);
  }

  for (const match of normalizedDescription.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,40})\s*=/g)) {
    const token = match[1] ?? '';
    pushToken(token);
  }

  for (const match of normalizedDescription.matchAll(/:\s*([A-Za-z0-9_.\-, ]{4,160})\./g)) {
    const chunk = match[1] ?? '';
    if (!chunk.includes(',')) continue;
    chunk.split(',').forEach(pushToken);
  }

  const normalizedDefault = `${defaultValue ?? ''}`.replace(/^"|"$/g, '').trim();
  if (normalizedDefault && ENUM_VALUE_TOKEN_REGEX.test(normalizedDefault)) {
    pushToken(normalizedDefault);
  }

  const fallback = ENUM_FALLBACK_LISTS_BY_SUFFIX.find(({ suffix }) => suffix.test(normalizedPath));
  if (fallback) {
    fallback.values.forEach(pushToken);
  }

  const uniqueValues = uniqueStringList(harvested);
  if (!ENUM_INFERENCE_SUFFIX_HINT.test(normalizedPath) && uniqueValues.length < 3) {
    return [];
  }
  if (uniqueValues.length < 2) return [];
  return uniqueValues.slice(0, 12);
};

export const shouldInferRequiredBooleanFromDefault = (
  fieldPath: string,
  defaultValue?: string
): boolean => {
  if (!defaultValue) return false;
  const normalized = defaultValue.replace(/^"|"$/g, '').trim().toLowerCase();
  if (normalized !== 'true' && normalized !== 'false') return false;
  return /enabled|waitFor|auto|include|dryRun|skip|trim|strict|stop|vision|silent/i.test(fieldPath);
};

export const coverageDimensionSeverity = (
  dimension: CoverageMatrixDimensionValue,
  coverageStatus: CoverageMatrixDimensionValue
): AiPathsValidationSeverity => {
  if (dimension === 'yes' && coverageStatus === 'yes') return 'warning';
  return 'info';
};

export const mergeAssertionSourceMetadata = (
  assertion: AiPathsDocAssertion,
  source: AiPathsDocsManifestSource
): AiPathsDocAssertion => {
  const mergedTags = uniqueStringList([...(assertion.tags ?? []), ...(source.tags ?? [])]);
  return {
    ...assertion,
    ...(mergedTags.length > 0 ? { tags: mergedTags } : {}),
    sourceId: source.id,
    sourcePriority: source.priority,
  };
};

export const addAssertionsWithDedup = (args: {
  source: AiPathsDocsManifestSource;
  assertions: AiPathsDocAssertion[];
  assertionById: Map<string, AiPathsDocAssertion>;
  warnings: string[];
}): void => {
  const { source, assertions, assertionById, warnings } = args;
  assertions.forEach((assertion: AiPathsDocAssertion) => {
    const existing = assertionById.get(assertion.id);
    if (existing) {
      warnings.push(
        `Assertion id "${assertion.id}" from source "${source.id}" duplicates "${existing.sourceId ?? existing.sourcePath}" and was ignored.`
      );
      return;
    }
    assertionById.set(assertion.id, mergeAssertionSourceMetadata(assertion, source));
  });
};
