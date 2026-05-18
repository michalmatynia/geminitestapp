'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  fetchSocialPublishingImageAddonsBatchJob,
  useBatchCaptureSocialPublishingImageAddons,
  useCreateSocialPublishingImageAddon,
  useStartBatchCaptureSocialPublishingImageAddons,
} from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import { useToast } from '@/shared/ui';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';

import {
  retryFailedPresetBatchCaptureJob,
  runBatchCaptureNow,
  runTrackedBatchCaptureJob,
  startBatchCaptureJob,
} from './useSocialImageAddons.batch';
import { createSocialImageAddon } from './useSocialImageAddons.create';
import { useResolvedCaptureAppearanceMode } from './useSocialImageAddons.appearance';
import { buildSocialImageAddonsResult } from './useSocialImageAddons.result';
import { useBatchCaptureState } from './useSocialImageAddons.state';
import type {
  BatchCaptureOptions,
  SocialImageAddonsDeps,
  SocialImageAddonsMutations,
  SocialImageAddonsResult,
} from './useSocialImageAddons.types';

const BATCH_CAPTURE_RECENT_JOBS_QUERY_KEY: readonly [
  'social-publishing',
  'image-addon-batch-jobs',
] = ['social-publishing', 'image-addon-batch-jobs'];

export function useSocialImageAddons(
  deps: SocialImageAddonsDeps
): SocialImageAddonsResult {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const state = useBatchCaptureState();
  const mutations: SocialImageAddonsMutations = {
    createAddonMutation: useCreateSocialPublishingImageAddon(),
    batchCaptureMutation: useBatchCaptureSocialPublishingImageAddons(),
    startBatchCaptureMutation: useStartBatchCaptureSocialPublishingImageAddons(),
  };
  const captureAppearanceMode = useResolvedCaptureAppearanceMode();

  const invalidateBatchCaptureRecentJobs = (): void => {
    void queryClient.invalidateQueries({
      queryKey: BATCH_CAPTURE_RECENT_JOBS_QUERY_KEY,
    });
  };
  const runtimeParams = {
    ...mutations,
    appearanceMode: captureAppearanceMode,
    deps,
    invalidateBatchCaptureRecentJobs,
    state,
    toast,
  };
  const runBatchCapture = (
    options?: BatchCaptureOptions
  ): Promise<SocialPublishingImageAddonsBatchResult> =>
    runBatchCaptureNow({ ...runtimeParams, options });
  const startBatchCapture = (
    options?: BatchCaptureOptions
  ): Promise<SocialPublishingImageAddonsBatchJob> =>
    startBatchCaptureJob({ ...runtimeParams, options });
  const handleBatchCapture = (options?: BatchCaptureOptions): Promise<void> =>
    runTrackedBatchCaptureJob({ ...runtimeParams, options });
  const handleCreateAddon = (): Promise<void> =>
    createSocialImageAddon({
      appearanceMode: captureAppearanceMode,
      createAddonMutation: mutations.createAddonMutation,
      deps,
    });
  const handleRetryFailedPresetBatchCaptureJob = (
    job: Parameters<typeof retryFailedPresetBatchCaptureJob>[0]['job']
  ): Promise<void> =>
    retryFailedPresetBatchCaptureJob({ deps, handleBatchCapture, job, toast });

  return buildSocialImageAddonsResult({
    captureAppearanceMode,
    handleBatchCapture,
    handleCreateAddon,
    handleRetryFailedPresetBatchCaptureJob,
    mutations,
    readBatchCaptureJob: fetchSocialPublishingImageAddonsBatchJob,
    runBatchCapture,
    startBatchCapture,
    state,
  });
}
