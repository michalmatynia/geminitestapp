import type { AiPathLocalRunRecord } from '@/shared/contracts/ai-paths';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

const AI_PATHS_LOCAL_RUN_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);

const isAiPathsLocalRunSource = (source: string | null): boolean =>
  Boolean(source && AI_PATHS_LOCAL_RUN_SOURCES.has(source));

const matchesAiPathsUiSourceFilter = (
  source: string | null,
  sourceMode: 'include' | 'exclude' | undefined,
): boolean =>
  sourceMode === 'exclude'
    ? source !== null && !isAiPathsLocalRunSource(source)
    : source === null || isAiPathsLocalRunSource(source);

export const shouldIncludeLocalRun = (
  run: AiPathLocalRunRecord,
  sourceFilter?: string | null | undefined,
  sourceMode?: 'include' | 'exclude' | undefined,
): boolean => {
  if (!sourceFilter) {
    return true;
  }

  const sourceValue = run.source ?? null;
  if (sourceFilter === 'ai_paths_ui') {
    return matchesAiPathsUiSourceFilter(sourceValue, sourceMode);
  }

  return sourceMode === 'exclude' ? sourceValue !== sourceFilter : sourceValue === sourceFilter;
};
