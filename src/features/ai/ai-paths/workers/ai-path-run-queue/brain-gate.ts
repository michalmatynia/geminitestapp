import { configurationError } from '@/shared/errors/app-error';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { AI_PATHS_ENABLED_CACHE_TTL_MS } from './config';

let aiPathsEnabledCache: { value: boolean; expiresAt: number } | null = null;
let aiPathsEnabledInFlight: Promise<boolean> | null = null;

const isAiPathsEnabled = async (): Promise<boolean> => {
  const brain = await getBrainAssignmentForFeature('ai_paths');
  return brain.enabled;
};

export const getAiPathsEnabledCached = async (options?: {
  bypassCache?: boolean;
}): Promise<boolean> => {
  const now = Date.now();
  const bypassCache = options?.bypassCache === true;
  if (!bypassCache && aiPathsEnabledCache && aiPathsEnabledCache.expiresAt > now) {
    return aiPathsEnabledCache.value;
  }
  if (!bypassCache && aiPathsEnabledInFlight) {
    return await aiPathsEnabledInFlight;
  }

  const fetchEnabled = async (): Promise<boolean> => {
    const enabled = await isAiPathsEnabled();
    aiPathsEnabledCache = {
      value: enabled,
      expiresAt: Date.now() + AI_PATHS_ENABLED_CACHE_TTL_MS,
    };
    return enabled;
  };

  if (bypassCache) {
    return await fetchEnabled();
  }

  const result = fetchEnabled();
  aiPathsEnabledInFlight = result;
  try {
    return await result;
  } finally {
    aiPathsEnabledInFlight = null;
  }
};

export const assertAiPathsEnabled = async (): Promise<void> => {
  const enabled = await getAiPathsEnabledCached();
  if (enabled) return;
  throw configurationError(
    'AI Paths is disabled in AI Brain. Enable it in /admin/brain?tab=routing before queuing runs.'
  );
};

export const clearAiPathsEnabledCache = (): void => {
  aiPathsEnabledCache = null;
  aiPathsEnabledInFlight = null;
};
