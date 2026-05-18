'use client';

import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/ui';
import { useGenerateSocialPublishingPost } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import type {
  SocialPublishingVisualAnalysis,
} from '@/shared/contracts/social-publishing-posts';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';

import { runSocialGeneration } from './useSocialGeneration.runner';
import type {
  GenerationJobRecord,
  RunGenerationOptions,
  SocialGenerationDeps,
  SocialGenerationHookResult,
} from './useSocialGeneration.types';

type PollWaiterParams = {
  generateDelayTimeoutRef: MutableRefObject<SafeTimerId | null>;
  isUnmountedRef: MutableRefObject<boolean>;
};

const useGenerationUnmountState = (
  generateDelayTimeoutRef: MutableRefObject<SafeTimerId | null>
): MutableRefObject<boolean> => {
  const isUnmountedRef = useRef(false);
  const timeoutRef = generateDelayTimeoutRef;

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      safeClearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [timeoutRef]);

  return isUnmountedRef;
};

const createPollWaiter = (params: PollWaiterParams) => {
  const timeoutRef = params.generateDelayTimeoutRef;
  const unmountedRef = params.isUnmountedRef;

  return (ms: number): Promise<boolean> => {
    if (unmountedRef.current === true) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      timeoutRef.current = safeSetTimeout(() => {
        timeoutRef.current = null;
        resolve(unmountedRef.current === false);
      }, ms);
    });
  };
};

export function useSocialGeneration(
  deps: SocialGenerationDeps
): SocialGenerationHookResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateMutation = useGenerateSocialPublishingPost();
  const [generatePending, setGeneratePending] = useState(false);
  const [currentGenerationJob, setCurrentGenerationJob] = useState<GenerationJobRecord | null>(
    null
  );
  const generateDelayTimeoutRef = useRef<SafeTimerId | null>(null);
  const isUnmountedRef = useGenerationUnmountState(generateDelayTimeoutRef);

  useEffect(() => {
    setCurrentGenerationJob(null);
  }, [deps.activePost?.id]);

  const waitForNextPoll = createPollWaiter({
    generateDelayTimeoutRef,
    isUnmountedRef,
  });
  const handleGenerateInternal = (
    options?: RunGenerationOptions
  ): Promise<boolean> =>
    runSocialGeneration({
      deps,
      generateMutation,
      options,
      queryClient,
      setCurrentGenerationJob,
      setGeneratePending,
      toast,
      waitForNextPoll,
    });

  const handleGenerate = (): Promise<boolean> => handleGenerateInternal();

  const handleGenerateWithVisualAnalysis = (
    prefetchedVisualAnalysis: SocialPublishingVisualAnalysis
  ): Promise<boolean> =>
    handleGenerateInternal({
      prefetchedVisualAnalysis,
      requireVisualAnalysisInBody: true,
    });

  const pendingGenerateMutation: SocialGenerationHookResult['generateMutation'] = {
    ...generateMutation,
    isPending: generatePending || generateMutation.isPending,
  };

  return {
    generateMutation: pendingGenerateMutation,
    currentGenerationJob,
    handleGenerate,
    handleGenerateWithVisualAnalysis,
  };
}
