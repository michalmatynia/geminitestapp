'use client';

import { useState } from 'react';

import { useToast } from '@/features/kangur/shared/ui';
import {
  useBatchCaptureKangurSocialImageAddons,
  useCreateKangurSocialImageAddon,
  type KangurSocialImageAddonsBatchResult,
} from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import { emptyAddonForm, type AddonFormState } from '../AdminKangurSocialPage.Constants';

type SocialImageAddonsDeps = {
  addonForm: AddonFormState;
  setAddonForm: (value: AddonFormState) => void;
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

export function useSocialImageAddons(deps: SocialImageAddonsDeps) {
  const { toast } = useToast();
  const createAddonMutation = useCreateKangurSocialImageAddon();
  const batchCaptureMutation = useBatchCaptureKangurSocialImageAddons();
  const [batchCaptureResult, setBatchCaptureResult] =
    useState<KangurSocialImageAddonsBatchResult | null>(null);

  const handleCreateAddon = async (): Promise<void> => {
    const title = deps.addonForm.title.trim();
    const sourceUrl = deps.addonForm.sourceUrl.trim();
    if (!title || !sourceUrl) return;
    const waitForMsRaw = Number(deps.addonForm.waitForMs);
    const waitForMs = Number.isFinite(waitForMsRaw) ? Math.max(0, waitForMsRaw) : undefined;
    trackKangurClientEvent(
      'kangur_social_addon_capture_attempt',
      deps.buildSocialContext({ addonTitleLength: title.length })
    );
    try {
      const created = await createAddonMutation.mutateAsync({
        title,
        sourceUrl,
        description: deps.addonForm.description.trim() || undefined,
        selector: deps.addonForm.selector.trim() || undefined,
        ...(waitForMs !== undefined ? { waitForMs } : {}),
      });
      deps.setAddonForm(emptyAddonForm);
      trackKangurClientEvent(
        'kangur_social_addon_capture_success',
        deps.buildSocialContext({ addonId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createAddon',
        ...deps.buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_addon_capture_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  const handleBatchCapture = async (): Promise<void> => {
    const baseUrl = deps.batchCaptureBaseUrl.trim();
    if (!baseUrl) {
      toast('Base URL is required for batch capture', { variant: 'error' });
      return;
    }
    if (deps.batchCapturePresetIds.length === 0) {
      toast('Select at least one capture preset', { variant: 'warning' });
      return;
    }
    trackKangurClientEvent(
      'kangur_social_batch_capture_attempt',
      deps.buildSocialContext({ baseUrl, presetCount: deps.batchCapturePresetIds.length })
    );
    try {
      const result = await batchCaptureMutation.mutateAsync({
        baseUrl,
        presetIds: deps.batchCapturePresetIds,
      });
      setBatchCaptureResult(result);
      const successCount = result.addons.length;
      const failureCount = result.failures.length;
      const failureSummary = successCount === 0 && failureCount > 0
        ? `. ${result.failures.slice(0, 3).map((f) => `${f.id}: ${f.reason}`).join('; ')}`
        : '';
      toast(
        `${successCount > 0 ? 'Batch capture completed' : 'Batch capture finished with no assets'} (${successCount} add-on${successCount === 1 ? '' : 's'}, ${failureCount} failure${failureCount === 1 ? '' : 's'})${failureSummary}`,
        { variant: successCount > 0 ? 'success' : 'warning' }
      );
      trackKangurClientEvent(
        'kangur_social_batch_capture_success',
        deps.buildSocialContext({ successCount, failureCount })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'batchCapture',
        ...deps.buildSocialContext({ error: true }),
      });
      toast('Batch capture failed', { variant: 'error' });
      trackKangurClientEvent(
        'kangur_social_batch_capture_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  return {
    createAddonMutation,
    batchCaptureMutation,
    batchCaptureResult,
    setBatchCaptureResult,
    handleCreateAddon,
    handleBatchCapture,
  };
}
