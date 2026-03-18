'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/features/kangur/shared/ui';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import {
  useIntegrationConnections,
  useIntegrations,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  logKangurClientError,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  KANGUR_SOCIAL_SETTINGS_KEY,
  parseKangurSocialSettings,
} from '@/features/kangur/settings-social';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { BRAIN_MODEL_DEFAULT_VALUE } from '../AdminKangurSocialPage.Constants';

export function useSocialSettings() {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const updateSetting = useUpdateSetting();
  const brainModelOptions = useBrainModelOptions({ capability: 'kangur_social.post_generation' });
  const visionModelOptions = useBrainModelOptions({ capability: 'kangur_social.visual_analysis' });
  const integrationsQuery = useIntegrations();

  const rawSocialSettings = settingsStore.get(KANGUR_SOCIAL_SETTINGS_KEY);
  const persistedSocialSettings = useMemo(
    () => parseKangurSocialSettings(rawSocialSettings),
    [rawSocialSettings]
  );

  const linkedinIntegration = useMemo(
    () => integrationsQuery.data?.find((integration) => integration.slug === 'linkedin') ?? null,
    [integrationsQuery.data]
  );
  const linkedinConnectionsQuery = useIntegrationConnections(linkedinIntegration?.id);
  const linkedinConnections = linkedinConnectionsQuery.data ?? [];

  const [linkedinConnectionId, setLinkedinConnectionId] = useState<string | null>(
    persistedSocialSettings.linkedinConnectionId
  );
  const [brainModelId, setBrainModelId] = useState<string | null>(
    persistedSocialSettings.brainModelId
  );
  const [visionModelId, setVisionModelId] = useState<string | null>(
    persistedSocialSettings.visionModelId
  );
  const [batchCaptureBaseUrl, setBatchCaptureBaseUrl] = useState<string>(
    persistedSocialSettings.batchCaptureBaseUrl ?? ''
  );
  const [batchCapturePresetIds, setBatchCapturePresetIds] = useState<string[]>(
    () => persistedSocialSettings.batchCapturePresetIds
  );
  const hasManualBatchBaseUrlRef = useRef(false);
  const persistedRef = useRef(persistedSocialSettings);

  const normalizeBatchCaptureBaseUrl = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, []);

  const normalizePresetIds = useCallback((value: string[]): string[] => {
    const allowed = new Set(KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => preset.id));
    if (value.length === 0) return [];
    const unique = new Set(value.filter((entry) => allowed.has(entry)));
    if (unique.size === 0) {
      return KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => preset.id);
    }
    return KANGUR_SOCIAL_CAPTURE_PRESETS
      .map((preset) => preset.id)
      .filter((id) => unique.has(id));
  }, []);

  const normalizedBatchCaptureBaseUrl = useMemo(
    () => normalizeBatchCaptureBaseUrl(batchCaptureBaseUrl),
    [batchCaptureBaseUrl, normalizeBatchCaptureBaseUrl]
  );
  const normalizedBatchCapturePresetIds = useMemo(
    () => normalizePresetIds(batchCapturePresetIds),
    [batchCapturePresetIds, normalizePresetIds]
  );

  const arePresetSetsEqual = useCallback((left: string[], right: string[]): boolean => {
    if (left.length !== right.length) return false;
    const leftSet = new Set(left);
    return right.every((value) => leftSet.has(value));
  }, []);

  const isSettingsDirty =
    persistedSocialSettings.brainModelId !== brainModelId ||
    persistedSocialSettings.visionModelId !== visionModelId ||
    persistedSocialSettings.linkedinConnectionId !== linkedinConnectionId ||
    persistedSocialSettings.batchCaptureBaseUrl !== normalizedBatchCaptureBaseUrl ||
    !arePresetSetsEqual(
      persistedSocialSettings.batchCapturePresetIds,
      normalizedBatchCapturePresetIds
    );

  const handleSaveSettings = useCallback(async (): Promise<void> => {
    if (updateSetting.isPending) return;
    const payload = {
      brainModelId: brainModelId ?? null,
      visionModelId: visionModelId ?? null,
      linkedinConnectionId: linkedinConnectionId ?? null,
      batchCaptureBaseUrl: normalizedBatchCaptureBaseUrl,
      batchCapturePresetIds: normalizedBatchCapturePresetIds,
    };
    try {
      await updateSetting.mutateAsync({
        key: KANGUR_SOCIAL_SETTINGS_KEY,
        value: serializeSetting(payload),
      });
      queryClient.setQueryData<Map<string, string>>(
        QUERY_KEYS.settings.scope('light'),
        (current) => {
          const next = new Map(current ?? []);
          next.set(KANGUR_SOCIAL_SETTINGS_KEY, serializeSetting(payload));
          return next;
        }
      );
      settingsStore.refetch();
      toast('Kangur Social settings saved.', { variant: 'success' });
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'saveSettings',
        nextSettings: payload,
      });
      toast('Failed to save Kangur Social settings.', { variant: 'error' });
    }
  }, [
    brainModelId,
    linkedinConnectionId,
    normalizedBatchCaptureBaseUrl,
    normalizedBatchCapturePresetIds,
    queryClient,
    settingsStore,
    toast,
    updateSetting,
    visionModelId,
  ]);

  const handleBrainModelChange = (value: string): void => {
    setBrainModelId(value === BRAIN_MODEL_DEFAULT_VALUE ? null : value);
  };

  const handleVisionModelChange = (value: string): void => {
    setVisionModelId(value === BRAIN_MODEL_DEFAULT_VALUE ? null : value);
  };

  const handleLinkedInConnectionChange = (value: string): void => {
    setLinkedinConnectionId(value);
  };

  const handleBatchCaptureBaseUrlChange = useCallback(
    (value: string | ((prev: string) => string)) => {
      hasManualBatchBaseUrlRef.current = true;
      setBatchCaptureBaseUrl((prev) =>
        typeof value === 'function' ? value(prev) : value
      );
    }, []);

  const handleToggleCapturePreset = (presetId: string): void => {
    setBatchCapturePresetIds((prev) =>
      prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId]
    );
  };

  const selectAllCapturePresets = (): void => {
    setBatchCapturePresetIds(KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => preset.id));
  };

  const clearCapturePresets = (): void => {
    setBatchCapturePresetIds([]);
  };

  // Auto-detect batch capture base URL from persisted settings or window origin
  useEffect(() => {
    if (hasManualBatchBaseUrlRef.current) return;
    const persistedBaseUrl = persistedSocialSettings.batchCaptureBaseUrl;
    if (persistedBaseUrl) {
      setBatchCaptureBaseUrl(persistedBaseUrl);
      return;
    }
    if (batchCaptureBaseUrl) return;
    if (typeof window === 'undefined') return;
    setBatchCaptureBaseUrl(window.location.origin);
  }, [batchCaptureBaseUrl, persistedSocialSettings.batchCaptureBaseUrl]);

  useEffect(() => {
    setBatchCapturePresetIds(persistedSocialSettings.batchCapturePresetIds);
  }, [persistedSocialSettings.batchCapturePresetIds]);

  useEffect(() => {
    const prev = persistedRef.current;
    if (prev.brainModelId !== persistedSocialSettings.brainModelId) {
      setBrainModelId((current) =>
        current === prev.brainModelId ? persistedSocialSettings.brainModelId : current
      );
    }
    if (prev.visionModelId !== persistedSocialSettings.visionModelId) {
      setVisionModelId((current) =>
        current === prev.visionModelId ? persistedSocialSettings.visionModelId : current
      );
    }
    if (prev.linkedinConnectionId !== persistedSocialSettings.linkedinConnectionId) {
      setLinkedinConnectionId((current) =>
        current === prev.linkedinConnectionId
          ? persistedSocialSettings.linkedinConnectionId
          : current
      );
    }
    persistedRef.current = persistedSocialSettings;
  }, [
    persistedSocialSettings.brainModelId,
    persistedSocialSettings.linkedinConnectionId,
    persistedSocialSettings.visionModelId,
  ]);

  return {
    linkedinConnectionId,
    setLinkedinConnectionId,
    brainModelId,
    setBrainModelId,
    visionModelId,
    setVisionModelId,
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl: handleBatchCaptureBaseUrlChange,
    batchCapturePresetIds,
    setBatchCapturePresetIds,
    isSettingsDirty,
    isSavingSettings: updateSetting.isPending,
    handleSaveSettings,
    handleBrainModelChange,
    handleVisionModelChange,
    handleLinkedInConnectionChange,
    handleToggleCapturePreset,
    selectAllCapturePresets,
    clearCapturePresets,
    linkedinIntegration,
    linkedinConnections,
    brainModelOptions,
    visionModelOptions,
    persistedSocialSettings,
  };
}
