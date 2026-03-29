'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/features/kangur/shared/ui';
import { useGenerateKangurSocialPost } from '@/features/kangur/ui/hooks/useKangurSocialPosts';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import type {
  KangurSocialGeneratedDraft,
  KangurSocialPost,
  KangurSocialVisualAnalysis,
} from '@/shared/contracts/kangur-social-posts';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';

type SocialGenerationDeps = {
  activePost: KangurSocialPost | null;
  resolveDocReferences: () => string[];
  generationNotes: string;
  brainModelId: string | null;
  visionModelId: string | null;
  canGenerateDraft: boolean;
  generateDraftBlockedReason: string | null;
  imageAddonIds: string[];
  projectUrl: string;
  setActivePostId: (value: string | null) => void;
  setEditorState: (value: {
    titlePl: string;
    titleEn: string;
    bodyPl: string;
    bodyEn: string;
  }) => void;
  setContextSummary: (value: string | null) => void;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

type GenerationJobResult = {
  type: 'manual-post-generation';
  generatedPost: KangurSocialPost | null;
  draft: KangurSocialGeneratedDraft | null;
};

type GenerationJobRecord = {
  id: string;
  status: string;
  progress: {
    type: 'manual-post-generation';
    step: 'loading_assets' | 'generating' | 'saving' | 'previewing';
    message: string | null;
    updatedAt: number;
    postId: string | null;
    imageAddonCount: number;
    docReferenceCount: number;
    visualSummaryPresent: boolean;
    highlightCount: number | null;
  } | null;
  result: GenerationJobResult | null;
  failedReason: string | null;
};

const GENERATION_POLL_INTERVAL_MS = 2_000;
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;
const GENERATION_REQUEST_TIMEOUT_MS = 60_000;
const KANGUR_SOCIAL_POSTS_QUERY_KEY = ['kangur', 'social-posts'] as const;

const isManualGenerationJobResult = (value: unknown): value is GenerationJobResult =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'manual-post-generation'
  );

const hasUsableGeneratedContent = <
  T extends
    | Pick<KangurSocialGeneratedDraft, 'titlePl' | 'titleEn' | 'bodyPl' | 'bodyEn'>
    | Pick<KangurSocialPost, 'titlePl' | 'titleEn' | 'bodyPl' | 'bodyEn'>,
>(
  draftLike: T | null | undefined
): draftLike is T =>
  Boolean(
    draftLike &&
      [draftLike.titlePl, draftLike.titleEn, draftLike.bodyPl, draftLike.bodyEn].some((value) =>
        Boolean(value?.trim())
      )
  );

type RunGenerationOptions = {
  prefetchedVisualAnalysis?: KangurSocialVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
};

export function useSocialGeneration(deps: SocialGenerationDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateMutation = useGenerateKangurSocialPost();
  const [generatePending, setGeneratePending] = useState(false);
  const [currentGenerationJob, setCurrentGenerationJob] = useState<GenerationJobRecord | null>(
    null
  );
  const generateDelayTimeoutRef = useRef<SafeTimerId | null>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      safeClearTimeout(generateDelayTimeoutRef.current);
      generateDelayTimeoutRef.current = null;
    };
  }, []);

  useEffect(() => {
    setCurrentGenerationJob(null);
  }, [deps.activePost?.id]);

  const waitForNextPoll = async (ms: number): Promise<boolean> => {
    if (isUnmountedRef.current) {
      return false;
    }

    return new Promise((resolve) => {
      generateDelayTimeoutRef.current = safeSetTimeout(() => {
        generateDelayTimeoutRef.current = null;
        resolve(!isUnmountedRef.current);
      }, ms);
    });
  };

  const handleGenerateInternal = async (
    options?: RunGenerationOptions
  ): Promise<boolean> => {
    if (!deps.canGenerateDraft) {
      toast(
        deps.generateDraftBlockedReason ??
          'Choose a StudiQ Social post model in Settings or assign AI Brain routing first.',
        { variant: 'warning' }
      );
      return false;
    }
    if (!deps.activePost) return false;

    const usesPrefetchedVisualAnalysis = Boolean(options?.prefetchedVisualAnalysis);
    const generationContext = deps.buildSocialContext({
      usesPrefetchedVisualAnalysis,
      requireVisualAnalysisInBody: options?.requireVisualAnalysisInBody ?? false,
      visualHighlightCount: options?.prefetchedVisualAnalysis?.highlights?.length ?? 0,
    });

    trackKangurClientEvent(
      'kangur_social_post_generate_attempt',
      generationContext
    );

    try {
      setGeneratePending(true);

      const response = await generateMutation.mutateAsync({
        postId: deps.activePost.id,
        docReferences: deps.resolveDocReferences(),
        notes: deps.generationNotes,
        modelId: deps.brainModelId ?? undefined,
        visionModelId: deps.visionModelId ?? undefined,
        imageAddonIds: deps.imageAddonIds,
        projectUrl: deps.projectUrl || undefined,
        ...(options?.prefetchedVisualAnalysis
          ? { prefetchedVisualAnalysis: options.prefetchedVisualAnalysis }
          : {}),
        ...(options?.requireVisualAnalysisInBody ? { requireVisualAnalysisInBody: true } : {}),
      });

      if (response.jobType !== 'manual-post-generation') {
        throw new Error('Generation queue returned an unexpected job type.');
      }

      setCurrentGenerationJob({
        id: response.jobId,
        status: 'waiting',
        progress: null,
        result: null,
        failedReason: null,
      });

      const pollStartedAt = Date.now();
      let finalJob: GenerationJobRecord | null = null;

      while (Date.now() - pollStartedAt < GENERATION_TIMEOUT_MS) {
        const job = await api.get<GenerationJobRecord | null>(
          '/api/kangur/social-pipeline/jobs',
          {
            params: { id: response.jobId },
            timeout: GENERATION_REQUEST_TIMEOUT_MS,
          }
        );

        if (!job) {
          if (!(await waitForNextPoll(GENERATION_POLL_INTERVAL_MS))) {
            return false;
          }
          continue;
        }

        finalJob = job;
        setCurrentGenerationJob(job);
        if (job.status === 'completed') {
          break;
        }
        if (job.status === 'failed') {
          throw new Error(job.failedReason ?? 'Server generation job failed.');
        }
        if (!(await waitForNextPoll(GENERATION_POLL_INTERVAL_MS))) {
          return false;
        }
      }

      if (finalJob?.status !== 'completed') {
        throw new Error('Generation timed out while waiting for the server job.');
      }

      if (!isManualGenerationJobResult(finalJob.result)) {
        throw new Error('Generation completed without a usable result payload.');
      }

      const generated = finalJob.result.generatedPost;
      if (hasUsableGeneratedContent(generated)) {
        deps.setActivePostId(generated.id);
        deps.setEditorState({
          titlePl: generated.titlePl ?? '',
          titleEn: generated.titleEn ?? '',
          bodyPl: generated.bodyPl ?? '',
          bodyEn: generated.bodyEn ?? '',
        });
        deps.setContextSummary(generated.contextSummary ?? generated.generatedSummary ?? null);
        const postsQueryKey = QUERY_KEYS.kangur.socialPosts({
          scope: 'admin',
          limit: null,
        });
        queryClient.setQueryData<KangurSocialPost[]>(postsQueryKey, (current) =>
          (current ?? []).map((post) => (post.id === generated.id ? generated : post))
        );
      } else if (hasUsableGeneratedContent(finalJob.result.draft)) {
        deps.setEditorState({
          titlePl: finalJob.result.draft.titlePl ?? '',
          titleEn: finalJob.result.draft.titleEn ?? '',
          bodyPl: finalJob.result.draft.bodyPl ?? '',
          bodyEn: finalJob.result.draft.bodyEn ?? '',
        });
        deps.setContextSummary(finalJob.result.draft.summary ?? null);
      } else {
        throw new Error(
          'Generation completed, but no post copy was returned. Check the queued result and retry.'
        );
      }

      void queryClient.invalidateQueries({ queryKey: KANGUR_SOCIAL_POSTS_QUERY_KEY });
      toast('Draft updated — review the generated post.', { variant: 'success' });
      trackKangurClientEvent(
        'kangur_social_post_generate_success',
        generationContext
      );
      return true;
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'generatePost',
        ...generationContext,
        error: true,
      });
      toast(
        error instanceof Error ? error.message : 'Failed to generate the social post draft.',
        { variant: 'error' }
      );
      trackKangurClientEvent(
        'kangur_social_post_generate_failed',
        {
          ...generationContext,
          error: true,
        }
      );
      return false;
    } finally {
      setGeneratePending(false);
    }
  };

  const handleGenerate = async (): Promise<boolean> => {
    return await handleGenerateInternal();
  };

  const handleGenerateWithVisualAnalysis = async (
    prefetchedVisualAnalysis: KangurSocialVisualAnalysis
  ): Promise<boolean> => {
    return await handleGenerateInternal({
      prefetchedVisualAnalysis,
      requireVisualAnalysisInBody: true,
    });
  };

  return {
    generateMutation: {
      ...generateMutation,
      isPending: generatePending || generateMutation.isPending,
    } as typeof generateMutation,
    currentGenerationJob,
    handleGenerate,
    handleGenerateWithVisualAnalysis,
  };
}
