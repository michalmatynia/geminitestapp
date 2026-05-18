'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { safeClearTimeout } from '@/shared/lib/timers';

import {
  buildVisualAnalysisFromPost,
  savedVisualAnalysisMatchesDraft,
  visualAnalysisScopeForDeps,
} from './useSocialPipelineRunner.runtime';
import type {
  SocialPipelineRunnerDeps,
  SocialPipelineRunnerRefs,
  SocialPipelineRunnerState,
  TransientVisualAnalysisResult,
  VisualAnalysisSnapshot,
} from './useSocialPipelineRunner.types';

export const useSocialPipelineRunnerState = (): SocialPipelineRunnerState => {
  const [pipelineStep, setPipelineStep] = useState<SocialPipelineRunnerState['pipelineStep']>(
    'idle'
  );
  const [pipelineProgress, setPipelineProgress] =
    useState<SocialPipelineRunnerState['pipelineProgress']>(null);
  const [pipelineErrorMessage, setPipelineErrorMessage] =
    useState<SocialPipelineRunnerState['pipelineErrorMessage']>(null);
  const [isVisualAnalysisModalOpen, setIsVisualAnalysisModalOpen] = useState(false);
  const [transientVisualAnalysisResult, setTransientVisualAnalysisResult] =
    useState<TransientVisualAnalysisResult | null>(null);
  const [visualAnalysisErrorMessage, setVisualAnalysisErrorMessage] =
    useState<SocialPipelineRunnerState['visualAnalysisErrorMessage']>(null);
  const [visualAnalysisPending, setVisualAnalysisPending] = useState(false);
  const [currentPipelineJob, setCurrentPipelineJob] =
    useState<SocialPipelineRunnerState['currentPipelineJob']>(null);
  const [currentVisualAnalysisJob, setCurrentVisualAnalysisJob] =
    useState<SocialPipelineRunnerState['currentVisualAnalysisJob']>(null);

  return {
    pipelineStep,
    setPipelineStep,
    pipelineProgress,
    setPipelineProgress,
    pipelineErrorMessage,
    setPipelineErrorMessage,
    isVisualAnalysisModalOpen,
    setIsVisualAnalysisModalOpen,
    transientVisualAnalysisResult,
    setTransientVisualAnalysisResult,
    visualAnalysisErrorMessage,
    setVisualAnalysisErrorMessage,
    visualAnalysisPending,
    setVisualAnalysisPending,
    currentPipelineJob,
    setCurrentPipelineJob,
    currentVisualAnalysisJob,
    setCurrentVisualAnalysisJob,
  };
};

export const useSocialPipelineRunnerRefs = (
  deps: SocialPipelineRunnerDeps
): SocialPipelineRunnerRefs => {
  const depsRef = useRef(deps);
  const pollDelayTimeoutRef = useRef<SocialPipelineRunnerRefs['pollDelayTimeoutRef']['current']>(
    null
  );
  const isUnmountedRef = useRef(false);
  const visualAnalysisPollRunRef = useRef(0);
  depsRef.current = deps;

  return useMemo(
    () => ({
      depsRef,
      pollDelayTimeoutRef,
      isUnmountedRef,
      visualAnalysisPollRunRef,
    }),
    [depsRef, isUnmountedRef, pollDelayTimeoutRef, visualAnalysisPollRunRef]
  );
};

export const useStableSocialPipelineStateActions = (
  state: SocialPipelineRunnerState
): SocialPipelineRunnerState =>
  useMemo(
    () => ({
      pipelineStep: 'idle',
      setPipelineStep: state.setPipelineStep,
      pipelineProgress: null,
      setPipelineProgress: state.setPipelineProgress,
      pipelineErrorMessage: null,
      setPipelineErrorMessage: state.setPipelineErrorMessage,
      isVisualAnalysisModalOpen: false,
      setIsVisualAnalysisModalOpen: state.setIsVisualAnalysisModalOpen,
      transientVisualAnalysisResult: null,
      setTransientVisualAnalysisResult: state.setTransientVisualAnalysisResult,
      visualAnalysisErrorMessage: null,
      setVisualAnalysisErrorMessage: state.setVisualAnalysisErrorMessage,
      visualAnalysisPending: false,
      setVisualAnalysisPending: state.setVisualAnalysisPending,
      currentPipelineJob: null,
      setCurrentPipelineJob: state.setCurrentPipelineJob,
      currentVisualAnalysisJob: null,
      setCurrentVisualAnalysisJob: state.setCurrentVisualAnalysisJob,
    }),
    [
      state.setCurrentPipelineJob,
      state.setCurrentVisualAnalysisJob,
      state.setIsVisualAnalysisModalOpen,
      state.setPipelineErrorMessage,
      state.setPipelineProgress,
      state.setPipelineStep,
      state.setTransientVisualAnalysisResult,
      state.setVisualAnalysisErrorMessage,
      state.setVisualAnalysisPending,
    ]
  );

export const resolveVisualAnalysisSnapshot = ({
  deps,
  transientVisualAnalysisResult,
}: {
  deps: SocialPipelineRunnerDeps;
  transientVisualAnalysisResult: TransientVisualAnalysisResult | null;
}): VisualAnalysisSnapshot => {
  const persistedVisualAnalysisResult = buildVisualAnalysisFromPost(deps.activePost);
  const hasSavedVisualAnalysis = persistedVisualAnalysisResult !== null;
  const isSavedVisualAnalysisStale =
    hasSavedVisualAnalysis &&
    !savedVisualAnalysisMatchesDraft({
      post: deps.activePost,
      currentImageAddonIds: deps.imageAddonIds,
      currentVisionModelId: deps.visionModelId,
    });
  const savedVisualAnalysisResult = isSavedVisualAnalysisStale
    ? null
    : persistedVisualAnalysisResult;

  return {
    visualAnalysisResult:
      transientVisualAnalysisResult?.postId === deps.activePostId
        ? transientVisualAnalysisResult.result
        : savedVisualAnalysisResult,
    hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale,
    visualAnalysisScope: visualAnalysisScopeForDeps(deps),
  };
};

export const useSocialPipelineLifecycle = ({
  deps,
  refs,
  state,
}: {
  deps: SocialPipelineRunnerDeps;
  refs: SocialPipelineRunnerRefs;
  state: SocialPipelineRunnerState;
}): void => {
  const { isUnmountedRef, pollDelayTimeoutRef, visualAnalysisPollRunRef } = refs;

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      safeClearTimeout(pollDelayTimeoutRef.current);
      pollDelayTimeoutRef.current = null;
    };
  }, [isUnmountedRef, pollDelayTimeoutRef]);

  useEffect(() => {
    visualAnalysisPollRunRef.current += 1;
    deps.setBatchCaptureResult(null);
    state.setPipelineProgress(null);
    state.setPipelineErrorMessage(null);
    state.setVisualAnalysisErrorMessage(null);
    state.setIsVisualAnalysisModalOpen(false);
    state.setCurrentPipelineJob(null);
    state.setCurrentVisualAnalysisJob(null);
  }, [deps.activePostId, visualAnalysisPollRunRef]);
};

export const useTransientVisualAnalysisReset = ({
  activePostId,
  setTransientVisualAnalysisResult,
  setVisualAnalysisErrorMessage,
  transientPostId,
  visualAnalysisScope,
}: {
  activePostId: string | null;
  setTransientVisualAnalysisResult: SocialPipelineRunnerState['setTransientVisualAnalysisResult'];
  setVisualAnalysisErrorMessage: SocialPipelineRunnerState['setVisualAnalysisErrorMessage'];
  transientPostId: string | undefined;
  visualAnalysisScope: string;
}): void => {
  const previousVisualAnalysisScopeRef = useRef<string | null>(null);
  const previousVisualAnalysisPostIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousScope = previousVisualAnalysisScopeRef.current;
    const previousPostId = previousVisualAnalysisPostIdRef.current;
    previousVisualAnalysisScopeRef.current = visualAnalysisScope;
    previousVisualAnalysisPostIdRef.current = activePostId;
    if (previousScope === null || previousScope === visualAnalysisScope) return;
    if (previousPostId !== activePostId || transientPostId !== activePostId) return;
    setTransientVisualAnalysisResult(null);
    setVisualAnalysisErrorMessage(null);
  }, [
    activePostId,
    setTransientVisualAnalysisResult,
    setVisualAnalysisErrorMessage,
    transientPostId,
    visualAnalysisScope,
  ]);
};
