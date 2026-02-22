import type { PromptExploderParamEntry } from '../params-editor';

export const promptExploderClampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const promptExploderFormatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const promptExploderBenchmarkSuiteLabel = (suite: unknown): string => {
  if (suite === 'extended') return 'extended';
  if (suite === 'custom') return 'custom';
  return 'default';
};

export const promptExploderSafeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const promptExploderIsFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const promptExploderInferParamTypeLabel = (entry: PromptExploderParamEntry): string => {
  if (entry.spec?.kind) return entry.spec.kind;
  const value = entry.value;
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};
