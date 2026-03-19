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
import type {
  KangurSocialDocUpdatesResponse,
  KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddonsBatchResult } from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

import {
  type EditorState,
  type PipelineStep,
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
  canRunServerPipeline: boolean;
  pipelineBlockedReason: string | null;
  projectUrl: string;
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

type PipelineTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'pipeline-tick' | 'manual-post-pipeline';
};

type ManualPipelineJobResult = {
  type: 'manual-post-pipeline';
  postId: string;
  addonsCreated: number;
  failures: number;
  runId: string | null;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: KangurSocialImageAddonsBatchResult | null;
  generatedPost: KangurSocialPost | null;
  docUpdates: KangurSocialDocUpdatesResponse | null;
};

type PipelineJobRecord = {
  id: string;
  status: string;
  result: ManualPipelineJobResult | null;
  failedReason: string | null;
};

const PIPELINE_POLL_INTERVAL_MS = 2_000;
const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;

const isManualPipelineResult = (value: unknown): value is ManualPipelineJobResult =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'manual-post-pipeline'
  );

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function useSocialPipelineRunner(deps: SocialPipelineRunnerDeps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');

  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    deps.setDocUpdatesResult(null);
    deps.setBatchCaptureResult(null);
  }, [deps.activePostId]);

  const handleRunFullPipeline = useCallback(async (): Promise<void> => {
    const d = depsRef.current;
    if (!d.canRunServerPipeline) {
      toast(
        d.pipelineBlockedReason ??
          'Assign an AI Brain model for StudiQ Social Post Generation first.',
        { variant: 'warning' }
      );
      return;
    }
    if (!d.activePost) {
      toast('Create or select a post first', { variant: 'warning' });
      return;
    }

    const activePostId = d.activePost.id;
    trackKangurClientEvent('kangur_social_pipeline_attempt', d.buildSocialContext());

    try {
      setPipelineStep('loading_context');
      toast('Pipeline: queueing server run...', { variant: 'default' });

      const response = await api.post<PipelineTriggerResponse>(
        '/api/kangur/social-pipeline/trigger',
        {
          jobType: 'manual-post-pipeline',
          input: {
            postId: activePostId,
            editorState: d.editorState,
            imageAssets: d.imageAssets,
            imageAddonIds: d.imageAddonIds,
            batchCaptureBaseUrl: d.batchCaptureBaseUrl,
            batchCapturePresetIds: d.batchCapturePresetIds,
            linkedinConnectionId: d.linkedinConnectionId ?? null,
            projectUrl: d.projectUrl || '',
            generationNotes: d.generationNotes,
            docReferences: d.resolveDocReferences(),
          },
        },
        { timeout: 30_000 }
      );

      if (response.jobType !== 'manual-post-pipeline') {
        throw new Error('Pipeline queue returned an unexpected job type.');
      }

      setPipelineStep('capturing');
      toast('Pipeline: queued on the server. Waiting for job completion...', {
        variant: 'default',
      });

      const pollStartedAt = Date.now();
      let finalJob: PipelineJobRecord | null = null;

      while (Date.now() - pollStartedAt < PIPELINE_TIMEOUT_MS) {
        const job = await api.get<PipelineJobRecord | null>(
          '/api/kangur/social-pipeline/jobs',
          {
            params: { id: response.jobId },
            timeout: 30_000,
          }
        );

        if (!job) {
          await delay(PIPELINE_POLL_INTERVAL_MS);
          continue;
        }

        finalJob = job;

        if (job.status === 'completed') {
          break;
        }

        if (job.status === 'failed') {
          throw new Error(job.failedReason ?? 'Server pipeline job failed.');
        }

        setPipelineStep(job.status === 'active' ? 'generating' : 'capturing');
        await delay(PIPELINE_POLL_INTERVAL_MS);
      }

      if (finalJob?.status !== 'completed') {
        throw new Error('Pipeline timed out while waiting for the server job.');
      }

      if (!isManualPipelineResult(finalJob.result)) {
        throw new Error('Pipeline completed without a usable result payload.');
      }

      const result = finalJob.result;
      if (!result.generatedPost || !result.batchCaptureResult) {
        throw new Error('Pipeline completed without generated content.');
      }

      setPipelineStep('previewing');
      const latestDeps = depsRef.current;
      latestDeps.setActivePostId(result.generatedPost.id);
      latestDeps.setEditorState({
        titlePl: result.generatedPost.titlePl ?? '',
        titleEn: result.generatedPost.titleEn ?? '',
        bodyPl: result.generatedPost.bodyPl ?? '',
        bodyEn: result.generatedPost.bodyEn ?? '',
      });
      latestDeps.setDocUpdatesResult(result.docUpdates ?? null);
      latestDeps.setImageAddonIds(result.imageAddonIds ?? []);
      latestDeps.setImageAssets(result.imageAssets ?? []);
      latestDeps.setBatchCaptureResult(result.batchCaptureResult);
      latestDeps.handleSelectAddons(result.batchCaptureResult.addons);

      const postsQueryKey = QUERY_KEYS.kangur.socialPosts({
        scope: 'admin',
        limit: null,
      });
      queryClient.setQueryData<KangurSocialPost[]>(postsQueryKey, (current) =>
        (current ?? []).map((post) =>
          post.id === result.generatedPost!.id ? result.generatedPost! : post
        )
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });

      setPipelineStep('done');
      toast('Pipeline complete — review your post and documentation updates', {
        variant: 'success',
      });
      trackKangurClientEvent(
        'kangur_social_pipeline_success',
        latestDeps.buildSocialContext()
      );
    } catch (error) {
      setPipelineStep('error');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown pipeline error';
      toast(`Pipeline failed: ${errorMessage}`, { variant: 'error' });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'runFullPipeline',
        ...depsRef.current.buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_pipeline_failed',
        depsRef.current.buildSocialContext({ error: true })
      );
    }
  }, [queryClient, toast]);

  return {
    pipelineStep,
    handleRunFullPipeline,
  };
}
