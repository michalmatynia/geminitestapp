import 'server-only';

import { createSocialPublishingImageAddonsBatch } from '@/features/filemaker/social/server/social-image-addons-batch';
import {
  runSocialPublishingPostPipeline,
} from '@/features/filemaker/social/server/social-posts-pipeline';
import {
  runSocialPublishingPostGenerationJob,
  runSocialPublishingPostVisualAnalysisJob,
} from '@/features/filemaker/social/server/social-posts-runtime';
import { updateSocialPublishingPost } from '@/features/filemaker/social/server/social-posts-repository';
import {
  SOCIAL_PUBLISHING_SETTINGS_KEY,
  parseSocialPublishingSettings,
} from '@/features/filemaker/social/settings';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type {
  SocialPublishingPipelineJobData,
  SocialPublishingPipelineJobResult,
} from '../socialPublishingPipelineQueue';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Image analysis failed.';

export const pipelineProcessor = async (
  data: SocialPublishingPipelineJobData,
  _jobId: string,
  signal?: AbortSignal,
  helpers?: {
    updateProgress: (progress: unknown) => Promise<void>;
  }
): Promise<SocialPublishingPipelineJobResult> => {
    const startedAt = Date.now();

    if (data.type === 'manual-post-pipeline') {
      const result = await runSocialPublishingPostPipeline(data.input, {
        reportProgress: async (progress) => {
          await helpers?.updateProgress(progress);
        },
      });
      void ErrorSystem.logInfo('Social publishing manual pipeline completed', {
        service: 'social-publishing-pipeline-queue',
        postId: result.postId,
        addonsCreated: result.addonsCreated,
        failures: result.failures,
        runId: result.runId,
        durationMs: Date.now() - startedAt,
      });
      return result satisfies SocialPublishingPipelineJobResult;
    }

    if (data.type === 'manual-post-visual-analysis') {
      const normalizedPostId = data.input.postId?.trim() || null;
      if (normalizedPostId) {
        await updateSocialPublishingPost(normalizedPostId, {
          visualAnalysisStatus: 'running',
          visualAnalysisJobId: _jobId || null,
          visualAnalysisModelId: data.input.visionModelId?.trim() || null,
          visualAnalysisError: null,
          updatedBy: data.input.actorId,
        }).catch(() => null);
      }
      await helpers?.updateProgress({
        type: 'manual-post-visual-analysis',
        step: 'loading_assets',
        message: 'Loading selected visuals for analysis...',
        updatedAt: Date.now(),
        postId: normalizedPostId,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        highlightCount: null,
      });
      await helpers?.updateProgress({
        type: 'manual-post-visual-analysis',
        step: 'analyzing',
        message: 'Running Redis-backed image analysis...',
        updatedAt: Date.now(),
        postId: normalizedPostId,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        highlightCount: null,
      });
      try {
        const result = await runSocialPublishingPostVisualAnalysisJob({
          ...data.input,
          jobId: _jobId,
        });
        await helpers?.updateProgress({
          type: 'manual-post-visual-analysis',
          step: 'saving',
          message: 'Image analysis saved on the post.',
          updatedAt: Date.now(),
          postId: result.postId,
          imageAddonCount: result.imageAddonIds.length,
          highlightCount: result.analysis.highlights.length,
        });
        void ErrorSystem.logInfo('Social publishing visual analysis job completed', {
          service: 'social-publishing-pipeline-queue',
          postId: result.postId,
          imageAddonCount: result.imageAddonIds.length,
          highlightCount: result.analysis.highlights.length,
          durationMs: Date.now() - startedAt,
        });
        return result satisfies SocialPublishingPipelineJobResult;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        if (normalizedPostId) {
          await updateSocialPublishingPost(normalizedPostId, {
            visualAnalysisStatus: 'failed',
            visualAnalysisJobId: _jobId || null,
            visualAnalysisModelId: data.input.visionModelId?.trim() || null,
            visualAnalysisError: errorMessage,
            updatedBy: data.input.actorId,
          }).catch(() => null);
        }
        throw error;
      }
    }

    if (data.type === 'manual-post-generation') {
      await helpers?.updateProgress({
        type: 'manual-post-generation',
        step: 'loading_assets',
        message: 'Loading selected visuals and context...',
        updatedAt: Date.now(),
        postId: data.input.postId?.trim() || null,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        docReferenceCount: data.input.docReferences?.length ?? 0,
        visualSummaryPresent: Boolean(data.input.prefetchedVisualAnalysis?.summary?.trim()),
        highlightCount: data.input.prefetchedVisualAnalysis?.highlights?.length ?? null,
      });
      await helpers?.updateProgress({
        type: 'manual-post-generation',
        step: 'generating',
        message: 'Running Redis-backed post generation...',
        updatedAt: Date.now(),
        postId: data.input.postId?.trim() || null,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        docReferenceCount: data.input.docReferences?.length ?? 0,
        visualSummaryPresent: Boolean(data.input.prefetchedVisualAnalysis?.summary?.trim()),
        highlightCount: data.input.prefetchedVisualAnalysis?.highlights?.length ?? null,
      });
      const result = await runSocialPublishingPostGenerationJob(data.input);
      await helpers?.updateProgress({
        type: 'manual-post-generation',
        step: result.generatedPost ? 'previewing' : 'saving',
        message: result.generatedPost
          ? 'Draft generated and saved on the post.'
          : 'Draft generated.',
        updatedAt: Date.now(),
        postId: result.postId,
        imageAddonCount: result.imageAddonIds.length,
        docReferenceCount: result.docReferences.length,
        visualSummaryPresent: Boolean(
          (result.generatedPost?.visualSummary ?? result.draft?.visualSummary ?? '').trim()
        ),
        highlightCount:
          result.generatedPost?.visualHighlights?.length ??
          result.draft?.visualHighlights?.length ??
          null,
      });
      void ErrorSystem.logInfo('Social publishing generation job completed', {
        service: 'social-publishing-pipeline-queue',
        postId: result.postId,
        imageAddonCount: result.imageAddonIds.length,
        durationMs: Date.now() - startedAt,
      });
      return result satisfies SocialPublishingPipelineJobResult;
    }

    const raw = await readStoredSettingValue(SOCIAL_PUBLISHING_SETTINGS_KEY);
    const settings = parseSocialPublishingSettings(raw);
    const baseUrl = settings.batchCaptureBaseUrl?.trim();
    if (!baseUrl) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'no_base_url',
      } satisfies SocialPublishingPipelineJobResult;
    }

    const presetIds = settings.batchCapturePresetIds;
    if (presetIds.length === 0) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'no_presets',
      } satisfies SocialPublishingPipelineJobResult;
    }

    if (signal?.aborted) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'aborted',
      } satisfies SocialPublishingPipelineJobResult;
    }

    const result = await createSocialPublishingImageAddonsBatch({
      baseUrl,
      presetIds,
      presetLimit: settings.batchCapturePresetLimit ?? null,
      createdBy: 'social-publishing-pipeline-queue',
    });

    void ErrorSystem.logInfo('Social publishing pipeline tick completed', {
      service: 'social-publishing-pipeline-queue',
      addonsCreated: result.addons.length,
      failures: result.failures.length,
      runId: result.runId,
      durationMs: Date.now() - startedAt,
    });

    return {
      type: 'pipeline-tick',
      addonsCreated: result.addons.length,
      failures: result.failures.length,
      runId: result.runId,
    } satisfies SocialPublishingPipelineJobResult;
  };
