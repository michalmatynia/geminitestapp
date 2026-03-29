import type { ContextConfig } from '@/shared/contracts/ai-paths';

import { CONTEXT_PRESET_FIELDS } from '../constants';
import { omitByPaths, pickByPaths } from './json';

export const getContextPresetSet = (entityType?: string): Record<string, string[]> => {
  const key = entityType === 'auto' ? '' : (entityType ?? '');
  return (CONTEXT_PRESET_FIELDS[key] ?? CONTEXT_PRESET_FIELDS['default'])!;
};

export const applyContextPreset = (
  current: ContextConfig,
  preset: 'light' | 'medium' | 'full' | 'suggested'
): ContextConfig => {
  const set = getContextPresetSet(current.entityType);
  const paths = set ? (set[preset] ?? []) : [];
  if (paths.length === 0) return { ...current, scopeMode: 'full' };
  return {
    ...current,
    scopeMode: 'include',
    includePaths: paths,
    excludePaths: [],
  };
};

export const toggleContextTarget = (current: ContextConfig, field: string): ContextConfig => {
  const isIncluded = (current.includePaths ?? []).includes(field);
  if (current.scopeMode === 'include') {
    const includePaths = current.includePaths ?? [];
    return {
      ...current,
      includePaths: isIncluded
        ? includePaths.filter((p: string) => p !== field)
        : [...includePaths, field],
    };
  }
  const excludePaths = current.excludePaths ?? [];
  const isExcluded = excludePaths.includes(field);
  return {
    ...current,
    excludePaths: isExcluded
      ? excludePaths.filter((p: string) => p !== field)
      : [...excludePaths, field],
  };
};

export const applyContextScope = (
  payload: Record<string, unknown>,
  config?: ContextConfig
): Record<string, unknown> => {
  const scopeMode = config?.scopeMode ?? 'full';
  const scopedPaths = scopeMode === 'include' ? config?.includePaths ?? [] : config?.excludePaths ?? [];
  if (scopedPaths.length === 0) return payload;
  if (scopeMode === 'include') return pickByPaths(payload, scopedPaths);
  if (scopeMode === 'exclude') return omitByPaths(payload, scopedPaths);
  return payload;
};
