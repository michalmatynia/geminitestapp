'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/features/kangur/shared/ui';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialDocUpdatesResponse,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddonsBatchResult } from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

import {
  type EditorState,
  type PipelineStep,
  mergeImageAssets,
  withRetry,
} from '../AdminKangurSocialPage.Constants';

type SocialPipelineRunnerDeps = {
  activePost: KangurSocialPost | null;
  activePostId: string | null;
  editorState: EditorState;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  linkedinConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  generationNotes: string;
  resolveDocReferences: () => string[];
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  handleLoadContext: (options?: {
    notify?: boolean;
    persist?: boolean;
    useDirect?: boolean;
  }) => Promise<{ summary: string | null; docCount: number | null; error?: boolean }>;
  setActivePostId: (value: string | null) => void;
  setEditorState: (value: EditorState) => void;
  setImageAddonIds: (value: string[]) => void;
  setImageAssets: (value: ImageFileSelection[]) => void;
  setDocUpdatesResult: (value: KangurSocialDocUpdatesResponse | null) => void;
  setBatchCaptureResult: (value: KangurSocialImageAddonsBatchResult | null) => void;
  handleSelectAddons: (addons: KangurSocialImageAddon[]) => void;
};

export function useSocialPipelineRunner(deps: SocialPipelineRunnerDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');

  // Ref keeps the latest deps accessible inside the long-running async
  // pipeline without putting deps in the useCallback dep array (which
  // would recreate the callback on every render and could cause the
  // captured closure to go stale when setPipelineStep triggers re-renders).
  const depsRef = useRef(deps);
  depsRef.current = deps;

  // Reset pipeline-specific state when active post changes
  useEffect(() => {
    deps.setDocUpdatesResult(null);
    deps.setBatchCaptureResult(null);
  }, [deps.activePostId]);

  const handleRunFullPipeline = useCallback(async (): Promise<void> => {
    // Snapshot deps at the start — then read from depsRef.current
    // at each async boundary so we always see the latest state.
    const d = depsRef.current;
    if (!d.activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }
    const activePostId = d.activePost.id;
    console.log('[PIPELINE] Starting pipeline for post:', activePostId);
    trackKangurClientEvent('kangur_social_pipeline_attempt', d.buildSocialContext());
    let currentStep = 'idle';

    const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;
    let pipelineTimedOut = false;
    const pipelineTimeoutId = setTimeout(() => {
      pipelineTimedOut = true;
      setPipelineStep('error');
      toast(`Pipeline timed out at step "${currentStep}" after 10 minutes`, { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_pipeline_failed',
        depsRef.current.buildSocialContext({ error: true })
      );
    }, PIPELINE_TIMEOUT_MS);

    try {
      // Step 0: Load documentation context
      currentStep = 'loading_context';
      setPipelineStep('loading_context');
      console.log('[PIPELINE] Step 0: loading context...');
      toast('Pipeline: loading documentation context...', { variant: 'default' });
      try {
        const contextResult = await depsRef.current.handleLoadContext({
          notify: false,
          persist: true,
          useDirect: true,
        });
        console.log('[PIPELINE] Step 0 result:', contextResult);
        if (contextResult.summary) {
          toast(
            `Pipeline: loaded context from ${contextResult.docCount ?? 0} document(s)`,
            { variant: 'default' }
          );
        } else {
          toast('Pipeline: context loading skipped (no context found)', { variant: 'default' });
        }
      } catch (contextError) {
        console.warn('[PIPELINE] Step 0 error (non-fatal):', contextError);
        toast('Pipeline: context loading skipped (endpoint unavailable)', { variant: 'default' });
      }
      if (pipelineTimedOut) { console.log('[PIPELINE] Timed out after Step 0'); return; }

      // Step 1: Batch capture — direct API call to avoid invalidation cascade
      currentStep = 'capturing';
      setPipelineStep('capturing');
      console.log('[PIPELINE] Step 1: capturing screenshots...');
      toast('Pipeline: capturing screenshots...', { variant: 'default' });
      const baseUrl = depsRef.current.batchCaptureBaseUrl.trim();
      const presetIds = depsRef.current.batchCapturePresetIds;
      console.log('[PIPELINE] Step 1 config: baseUrl=%s, presetIds=%o', baseUrl, presetIds);
      if (!baseUrl || presetIds.length === 0) {
        console.warn('[PIPELINE] Step 1 aborted: missing baseUrl or presetIds');
        toast('Pipeline stopped: configure batch capture base URL and presets first', {
          variant: 'warning',
        });
        setPipelineStep('error');
        return;
      }
      const captureResult = await api.post<KangurSocialImageAddonsBatchResult>(
        '/api/kangur/social-image-addons/batch',
        { baseUrl, presetIds },
        { timeout: 180_000 }
      );
      console.log('[PIPELINE] Step 1 result: %d addons, %d failures', captureResult.addons.length, captureResult.failures?.length ?? 0);
      if (captureResult.addons.length === 0) {
        const failureReasons = captureResult.failures
          .map((f) => `${f.id}: ${f.reason}`)
          .slice(0, 3);
        const hint = failureReasons.length > 0
          ? `Failures: ${failureReasons.join('; ')}`
          : 'Check that the base URL is reachable by Playwright (localhost may be blocked by outbound policy)';
        toast(`Pipeline stopped: no screenshots captured. ${hint}`, { variant: 'warning' });
        setPipelineStep('error');
        return;
      }
      if (pipelineTimedOut) { console.log('[PIPELINE] Timed out after Step 1'); return; }

      // Derive addon IDs and assets locally to avoid stale closure.
      // Read latest state from depsRef so we see any updates from re-renders.
      const capturedAddonIds = captureResult.addons.map((addon) => addon.id);
      const capturedAssets = captureResult.addons
        .map((addon) => addon.imageAsset)
        .filter((asset): asset is ImageFileSelection => Boolean(asset));
      const currentAddonIds = depsRef.current.imageAddonIds;
      const currentAssets = depsRef.current.imageAssets;
      // Cap to schema limits: imageAddonIds.max(30), imageAssets.max(12)
      const mergedAddonIds = Array.from(new Set([...currentAddonIds, ...capturedAddonIds])).slice(0, 30);
      const mergedAssets = mergeImageAssets(currentAssets, capturedAssets).slice(0, 12);
      console.log('[PIPELINE] Merged: %d addonIds, %d assets', mergedAddonIds.length, mergedAssets.length);

      // Step 2: Save post with captured addon IDs (with retry)
      currentStep = 'saving';
      setPipelineStep('saving');
      console.log('[PIPELINE] Step 2: saving post...');
      toast('Pipeline: saving post with captured images...', { variant: 'default' });
      const editorState = depsRef.current.editorState;
      const combinedBody = buildKangurSocialPostCombinedBody(
        editorState.bodyPl,
        editorState.bodyEn
      );
      const docReferences = depsRef.current.resolveDocReferences().slice(0, 80);
      const savePayload = {
        post: {
          id: activePostId,
          ...editorState,
          combinedBody,
          status: 'draft' as const,
          imageAssets: mergedAssets,
          imageAddonIds: mergedAddonIds,
          docReferences,
          linkedinConnectionId: depsRef.current.linkedinConnectionId ?? null,
          brainModelId: depsRef.current.brainModelId ?? null,
          visionModelId: depsRef.current.visionModelId ?? null,
          publishError: null,
        },
      };
      console.log('[PIPELINE] Step 2 payload:', {
        id: savePayload.post.id,
        titlePl: savePayload.post.titlePl?.slice(0, 30),
        bodyPlLen: savePayload.post.bodyPl?.length,
        bodyEnLen: savePayload.post.bodyEn?.length,
        combinedBodyLen: savePayload.post.combinedBody?.length,
        imageAssetsCount: savePayload.post.imageAssets.length,
        imageAddonIdsCount: savePayload.post.imageAddonIds.length,
        docReferencesCount: savePayload.post.docReferences.length,
        status: savePayload.post.status,
      });
      const savedPost = await withRetry(
        () => api.post<KangurSocialPost>('/api/kangur/social-posts', savePayload, { timeout: 30_000 }),
        { maxAttempts: 2 }
      );
      console.log('[PIPELINE] Step 2 result: savedPost.id=%s', savedPost?.id);
      if (pipelineTimedOut) { console.log('[PIPELINE] Timed out after Step 2'); return; }

      // Step 3: Generate draft with vision (with retry)
      currentStep = 'generating';
      setPipelineStep('generating');
      console.log('[PIPELINE] Step 3: generating draft...');
      toast('Pipeline: generating draft with vision analysis...', { variant: 'default' });
      const postId = savedPost.id;
      const generatePayload = {
        postId,
        docReferences: depsRef.current.resolveDocReferences(),
        notes: depsRef.current.generationNotes,
        modelId: depsRef.current.brainModelId ?? undefined,
        visionModelId: depsRef.current.visionModelId ?? undefined,
        imageAddonIds: mergedAddonIds,
      };
      console.log('[PIPELINE] Step 3 payload:', generatePayload);
      const generatedPost = await withRetry(
        () => api.post<KangurSocialPost>('/api/kangur/social-posts/generate',
          generatePayload,
          { timeout: 180_000 }
        ),
        { maxAttempts: 3, delayMs: 3000 }
      );
      console.log('[PIPELINE] Step 3 result: id=%s, titlePl=%s', generatedPost?.id, generatedPost?.titlePl?.slice(0, 50));
      // Immediately sync editor with generated content
      depsRef.current.setEditorState({
        titlePl: generatedPost.titlePl ?? '',
        titleEn: generatedPost.titleEn ?? '',
        bodyPl: generatedPost.bodyPl ?? '',
        bodyEn: generatedPost.bodyEn ?? '',
      });
      if (pipelineTimedOut) { console.log('[PIPELINE] Timed out after Step 3'); return; }

      // Step 4: Preview doc updates (non-blocking)
      currentStep = 'previewing';
      setPipelineStep('previewing');
      console.log('[PIPELINE] Step 4: previewing doc updates...');
      toast('Pipeline: previewing documentation updates...', { variant: 'default' });
      let docResult: KangurSocialDocUpdatesResponse | null = null;
      try {
        docResult = await api.post<KangurSocialDocUpdatesResponse>(
          `/api/kangur/social-posts/${postId}/doc-updates`,
          { mode: 'preview' },
          { timeout: 120_000 }
        );
        console.log('[PIPELINE] Step 4 result: %d files, %d items', docResult?.plan?.files?.length ?? 0, docResult?.plan?.items?.length ?? 0);
      } catch (docError) {
        console.warn('[PIPELINE] Step 4 error (non-fatal):', docError);
        // Doc updates preview is optional — don't fail the pipeline
      }

      if (!pipelineTimedOut) {
        console.log('[PIPELINE] Finalizing pipeline...');
        const dr = depsRef.current;
        dr.setActivePostId(generatedPost.id);
        dr.setDocUpdatesResult(docResult);
        dr.setImageAddonIds(mergedAddonIds);
        dr.setImageAssets(mergedAssets);
        dr.setBatchCaptureResult(captureResult);
        dr.handleSelectAddons(captureResult.addons);

        // Optimistically update query cache
        const postsQueryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
        queryClient.setQueryData<KangurSocialPost[]>(postsQueryKey, (current) =>
          (current ?? []).map((p) => (p.id === generatedPost.id ? generatedPost : p))
        );
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });

        setPipelineStep('done');
        console.log('[PIPELINE] Pipeline complete!');
        toast('Pipeline complete — review your post and documentation updates', {
          variant: 'success',
        });
        trackKangurClientEvent('kangur_social_pipeline_success', dr.buildSocialContext());
      }
    } catch (error) {
      console.error('[PIPELINE] Pipeline error at step "%s":', currentStep, error);
      // Log full error payload for Zod validation details
      if (error && typeof error === 'object' && 'payload' in error) {
        console.error('[PIPELINE] Error payload (validation details):', (error as { payload: unknown }).payload);
      }
      if (pipelineTimedOut) return;
      setPipelineStep('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast(`Pipeline failed at step "${currentStep}": ${errorMessage}`, { variant: 'error' });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'runFullPipeline',
        step: currentStep,
        ...depsRef.current.buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_pipeline_failed',
        depsRef.current.buildSocialContext({ error: true })
      );
    } finally {
      clearTimeout(pipelineTimeoutId);
    }
  }, [toast, queryClient]);

  return {
    pipelineStep,
    handleRunFullPipeline,
  };
}
