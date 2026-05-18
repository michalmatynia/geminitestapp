import type { QueryClient } from '@tanstack/react-query';

import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import type { SocialPublishingPostGenerationPayload } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import type { useToast } from '@/shared/ui';

import {
  applyGenerationJobResult,
  SOCIAL_PUBLISHING_POSTS_QUERY_KEY,
} from './useSocialGeneration.content';
import { pollGenerationJobUntilComplete } from './useSocialGeneration.polling';
import type {
  GenerationJobResult,
  GenerationJobSetter,
  GenerationMutation,
  RunGenerationOptions,
  SocialGenerationDeps,
} from './useSocialGeneration.types';

const GENERATION_BLOCKED_MESSAGE =
  'Choose a Social Publishing post model in Settings or assign AI Brain routing first.';

type SocialGenerationToast = ReturnType<typeof useToast>['toast'];

type PreparedGenerationRun = {
  context: Record<string, unknown>;
  normalizedProjectUrl: string;
};

type RunSocialGenerationParams = {
  deps: SocialGenerationDeps;
  generateMutation: GenerationMutation;
  options?: RunGenerationOptions;
  queryClient: QueryClient;
  setCurrentGenerationJob: GenerationJobSetter;
  setGeneratePending: (value: boolean) => void;
  toast: SocialGenerationToast;
  waitForNextPoll: (ms: number) => Promise<boolean>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isManualGenerationJobResult = (value: unknown): value is GenerationJobResult =>
  isRecord(value) && value['type'] === 'manual-post-generation';

const resolveGenerationContextOverrides = (
  options?: RunGenerationOptions
): Record<string, unknown> => {
  const prefetchedVisualAnalysis = options?.prefetchedVisualAnalysis;
  return {
    usesPrefetchedVisualAnalysis: prefetchedVisualAnalysis !== undefined,
    requireVisualAnalysisInBody: options?.requireVisualAnalysisInBody === true,
    visualHighlightCount: prefetchedVisualAnalysis?.highlights.length ?? 0,
  };
};

const prepareGenerationRun = ({
  deps,
  options,
  toast,
}: {
  deps: SocialGenerationDeps;
  options?: RunGenerationOptions;
  toast: SocialGenerationToast;
}): PreparedGenerationRun | null => {
  if (deps.canGenerateDraft === false) {
    toast(deps.generateDraftBlockedReason ?? GENERATION_BLOCKED_MESSAGE, { variant: 'warning' });
    return null;
  }
  if (deps.activePost === null) {
    return null;
  }

  const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(deps.projectUrl);
  const projectUrlError = getSocialPublishingProjectUrlError(normalizedProjectUrl);
  if (projectUrlError !== null) {
    toast(projectUrlError, { variant: 'warning' });
    return null;
  }

  return {
    context: deps.buildSocialContext(resolveGenerationContextOverrides(options)),
    normalizedProjectUrl,
  };
};

const buildGenerationPayload = ({
  deps,
  normalizedProjectUrl,
  options,
}: {
  deps: SocialGenerationDeps;
  normalizedProjectUrl: string;
  options?: RunGenerationOptions;
}): SocialPublishingPostGenerationPayload => {
  const payload: SocialPublishingPostGenerationPayload = {
    postId: deps.activePost?.id,
    docReferences: deps.resolveDocReferences(),
    notes: deps.generationNotes,
    modelId: deps.brainModelId ?? undefined,
    visionModelId: deps.visionModelId ?? undefined,
    imageAddonIds: deps.imageAddonIds,
    projectUrl: normalizedProjectUrl,
  };
  const prefetchedVisualAnalysis = options?.prefetchedVisualAnalysis;
  if (prefetchedVisualAnalysis !== undefined) {
    payload.prefetchedVisualAnalysis = prefetchedVisualAnalysis;
  }
  if (options?.requireVisualAnalysisInBody === true) {
    payload.requireVisualAnalysisInBody = true;
  }
  return payload;
};

const getGenerationResult = (result: unknown): GenerationJobResult => {
  if (!isManualGenerationJobResult(result)) {
    throw new Error('Generation completed without a usable result payload.');
  }

  return result;
};

const handleGenerationFailure = ({
  context,
  error,
  toast,
}: {
  context: Record<string, unknown>;
  error: unknown;
  toast: SocialGenerationToast;
}): void => {
  void ErrorSystem.captureException(error);
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'generatePost',
    ...context,
    error: true,
  });
  toast(error instanceof Error ? error.message : 'Failed to generate the social post draft.', {
    variant: 'error',
  });
  trackSocialPublishingClientEvent('social_publishing_post_generate_failed', {
    ...context,
    error: true,
  });
};

export const runSocialGeneration = async (
  params: RunSocialGenerationParams
): Promise<boolean> => {
  const prepared = prepareGenerationRun(params);
  if (prepared === null) {
    return false;
  }

  trackSocialPublishingClientEvent('social_publishing_post_generate_attempt', prepared.context);
  try {
    params.setGeneratePending(true);
    const payload = buildGenerationPayload({
      deps: params.deps,
      normalizedProjectUrl: prepared.normalizedProjectUrl,
      options: params.options,
    });
    const response = await params.generateMutation.mutateAsync(payload);
    params.setCurrentGenerationJob({
      id: response.jobId,
      status: 'waiting',
      progress: null,
      result: null,
      failedReason: null,
    });

    const finalJob = await pollGenerationJobUntilComplete({
      jobId: response.jobId,
      setCurrentGenerationJob: params.setCurrentGenerationJob,
      waitForNextPoll: params.waitForNextPoll,
    });
    if (finalJob === null) {
      return false;
    }

    applyGenerationJobResult({
      deps: params.deps,
      queryClient: params.queryClient,
      result: getGenerationResult(finalJob.result),
    });
    void params.queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_POSTS_QUERY_KEY });
    params.toast('Draft updated — review the generated post.', { variant: 'success' });
    trackSocialPublishingClientEvent('social_publishing_post_generate_success', prepared.context);
    return true;
  } catch (error) {
    handleGenerationFailure({ context: prepared.context, error, toast: params.toast });
    return false;
  } finally {
    params.setGeneratePending(false);
  }
};
