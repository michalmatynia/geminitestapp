import { getAiPathsSetting } from '@/features/ai/ai-paths/server';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { parsePathMetas } from '@/features/ai/ai-paths/server/settings-store.parsing';
import { badRequestError } from '@/shared/errors/app-error';

const normalizePathId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const assertTriggerButtonPathExists = async (
  pathId: string | null | undefined
): Promise<void> => {
  const normalizedPathId = normalizePathId(pathId);
  if (!normalizedPathId) return;

  const rawIndex = await getAiPathsSetting(AI_PATHS_INDEX_KEY);
  const metas = parsePathMetas(rawIndex);

  if (metas.some((meta) => meta.id === normalizedPathId)) {
    const rawConfig = await getAiPathsSetting(`${AI_PATHS_CONFIG_KEY_PREFIX}${normalizedPathId}`);
    if (typeof rawConfig === 'string' && rawConfig.trim().length > 0) {
      return;
    }

    throw badRequestError(`AI Path "${normalizedPathId}" is missing its config payload.`, {
      source: 'ai_paths.trigger_buttons',
      reason: 'missing_bound_path_config',
      pathId: normalizedPathId,
    });
  }

  throw badRequestError(`AI Path "${normalizedPathId}" does not exist.`, {
    source: 'ai_paths.trigger_buttons',
    reason: 'missing_bound_path',
    pathId: normalizedPathId,
  });
};
