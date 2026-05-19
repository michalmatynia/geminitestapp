/**
 * Social Publishing Settings Hook
 * 
 * React hook for managing social media publishing settings and configuration.
 * Provides:
 * - AI model configuration for content generation
 * - Integration connection management
 * - Settings persistence and synchronization
 * - Error handling and recovery for social publishing
 * - Toast notifications for user feedback
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/ui';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import {
  useIntegrationConnections,
  useIntegrations,
} from '@/features/integrations/product-integrations-adapter';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  isRecoverableSocialPublishingClientFetchError,
  logSocialPublishingClientError,
} from '@/features/filemaker/social/client-observability';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import {
  SOCIAL_PUBLISHING_SETTINGS_KEY,
  DEFAULT_SOCIAL_PUBLISHING_SETTINGS,
  parseSocialPublishingSettings,
} from '@/features/filemaker/social/settings';
import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
} from '@/features/filemaker/social/project-url';
import { serializeSetting } from '@/shared/utils/settings-json';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { SOCIAL_PUBLISHING_CAPTURE_PRESETS } from '@/features/filemaker/social/shared/social-capture-presets';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { SocialPublishingProgrammableCaptureRoute } from '@/shared/contracts/social-publishing-image-addons';

import { BRAIN_MODEL_DEFAULT_VALUE } from '../SocialPublishingPage.Constants';

type UseSocialSettingsOptions = {
  preloadSettingsModalData?: boolean;
};

export function useSocialSettings(options?: UseSocialSettingsOptions) {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const queryClient = useQueryClient();
  const updateSetting = useUpdateSetting();
  const preloadSettingsModalData = options?.preloadSettingsModalData ?? false;
  const brainModelOptions = useBrainModelOptions({
    capability: 'social_publishing.post_generation',
    enabled: preloadSettingsModalData,
  });
  const visionModelOptions = useBrainModelOptions({
    capability: 'social_publishing.visual_analysis',
    enabled: preloadSettingsModalData,
  });
  const integrationsQuery = useIntegrations({ enabled: preloadSettingsModalData });

  const rawSocialSettings = settingsStore.get(SOCIAL_PUBLISHING_SETTINGS_KEY);
  const persistedSocialSettings = useMemo(
    () => parseSocialPublishingSettings(rawSocialSettings),
    [rawSocialSettings]
  );

  const linkedinIntegration = useMemo(
    () => integrationsQuery.data?.find((integration) => integration.slug === 'linkedin') ?? null,
    [integrationsQuery.data]
  );
  const linkedinConnectionsQuery = useIntegrationConnections(linkedinIntegration?.id, {
    enabled: preloadSettingsModalData,
  });
  const linkedinConnections = linkedinConnectionsQuery.data ?? [];

  const [publishingConnectionId, setPublishingConnectionId] = useState<string | null>(
    persistedSocialSettings.publishingConnectionId
  );
  const [brainModelId, setBrainModelId] = useState<string | null>(
    persistedSocialSettings.brainModelId
  );
  const [visionModelId, setVisionModelId] = useState<string | null>(
    persistedSocialSettings.visionModelId
  );
  const [projectUrl, setProjectUrl] = useState<string>(
    persistedSocialSettings.projectUrl ?? ''
  );
  const [batchCaptureBaseUrl, setBatchCaptureBaseUrl] = useState<string>(
    persistedSocialSettings.batchCaptureBaseUrl ?? ''
  );
  const [batchCapturePresetIds, setBatchCapturePresetIds] = useState<string[]>(
    () => persistedSocialSettings.batchCapturePresetIds
  );
  const [batchCapturePresetLimit, setBatchCapturePresetLimit] = useState<number | null>(
    persistedSocialSettings.batchCapturePresetLimit
  );
  const [articleAggregatorPathId, setArticleAggregatorPathId] = useState<string>(
    persistedSocialSettings.articleAggregatorPathId ?? ''
  );
  const hasManualBatchBaseUrlRef = useRef(false);
  const persistedRef = useRef(persistedSocialSettings);

  const normalizeBatchCaptureBaseUrl = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, []);

  const normalizePresetIds = useCallback((value: string[]): string[] => {
    const allowed = new Set(SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => preset.id));
    if (value.length === 0) return [];
    const unique = new Set(value.filter((entry) => allowed.has(entry)));
    if (unique.size === 0) {
      return SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => preset.id);
    }
    return SOCIAL_PUBLISHING_CAPTURE_PRESETS
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
  const normalizedBatchCapturePresetLimit = useMemo(() => {
    if (batchCapturePresetLimit == null) return null;
    const normalized = Math.floor(batchCapturePresetLimit);
    return normalized > 0 ? normalized : null;
  }, [batchCapturePresetLimit]);

  const arePresetSetsEqual = useCallback((left: string[], right: string[]): boolean => {
    if (left.length !== right.length) return false;
    const leftSet = new Set(left);
    return right.every((value) => leftSet.has(value));
  }, []);

  const normalizedProjectUrl = normalizeSocialPublishingProjectUrl(projectUrl) || null;
  const projectUrlError = getSocialPublishingProjectUrlError(projectUrl);

  const normalizedArticleAggregatorPathId = articleAggregatorPathId.trim() || null;

  const isSettingsDirty =
    persistedSocialSettings.brainModelId !== brainModelId ||
    persistedSocialSettings.visionModelId !== visionModelId ||
    persistedSocialSettings.publishingConnectionId !== publishingConnectionId ||
    persistedSocialSettings.batchCaptureBaseUrl !== normalizedBatchCaptureBaseUrl ||
    persistedSocialSettings.batchCapturePresetLimit !== normalizedBatchCapturePresetLimit ||
    persistedSocialSettings.projectUrl !== normalizedProjectUrl ||
    persistedSocialSettings.articleAggregatorPathId !== normalizedArticleAggregatorPathId ||
    !arePresetSetsEqual(
      persistedSocialSettings.batchCapturePresetIds,
      normalizedBatchCapturePresetIds
    );

  const persistSettingsValue = useCallback(
    async (
      payload: Record<string, unknown>,
      options: {
        successMessage: string;
        errorAction: string;
      }
    ): Promise<boolean> => {
      try {
        const serialized = serializeSetting(payload);
        await updateSetting.mutateAsync({
          key: SOCIAL_PUBLISHING_SETTINGS_KEY,
          value: serialized,
        });
        queryClient.setQueryData<Map<string, string>>(
          QUERY_KEYS.settings.scope('light'),
          (current) => {
            const next = new Map(current ?? []);
            next.set(SOCIAL_PUBLISHING_SETTINGS_KEY, serialized);
            return next;
          }
        );
        settingsStore.refetch();
        toast(options.successMessage, { variant: 'success' });
        return true;
      } catch (error) {
        const isRecoverableFetchFailure = isRecoverableSocialPublishingClientFetchError(error);
        if (!isRecoverableFetchFailure) {
          void ErrorSystem.captureException(error);
          logSocialPublishingClientError(error, {
            source: 'AdminSocialPublishingPage',
            action: options.errorAction,
            nextSettings: payload,
          });
        }
        toast(
          isRecoverableFetchFailure
            ? 'Failed to save social settings. Check your connection and try again.'
            : 'Failed to save social settings.',
          { variant: 'error' }
        );
        return false;
      }
    },
    [queryClient, settingsStore, toast, updateSetting]
  );

  const handleSaveSettings = useCallback(async (): Promise<boolean> => {
    if (updateSetting.isPending) return false;
    if (projectUrlError) {
      toast(projectUrlError, { variant: 'warning' });
      return false;
    }
    const payload = {
      brainModelId: brainModelId ?? null,
      visionModelId: visionModelId ?? null,
      publishingConnectionId: publishingConnectionId ?? null,
      batchCaptureBaseUrl: normalizedBatchCaptureBaseUrl,
      batchCapturePresetIds: normalizedBatchCapturePresetIds,
      batchCapturePresetLimit: normalizedBatchCapturePresetLimit,
      programmableCaptureBaseUrl: persistedSocialSettings.programmableCaptureBaseUrl,
      programmableCapturePersonaId: persistedSocialSettings.programmableCapturePersonaId,
      programmableCaptureScript: persistedSocialSettings.programmableCaptureScript,
      programmableCaptureRoutes: persistedSocialSettings.programmableCaptureRoutes,
      projectUrl: normalizedProjectUrl,
      captureContentConfig: persistedSocialSettings.captureContentConfig,
      articleAggregatorPathId: normalizedArticleAggregatorPathId,
    };
    return await persistSettingsValue(payload, {
      successMessage: 'Social settings saved.',
      errorAction: 'saveSettings',
    });
  }, [
    brainModelId,
    publishingConnectionId,
    normalizedBatchCaptureBaseUrl,
    normalizedBatchCapturePresetLimit,
    normalizedBatchCapturePresetIds,
    normalizedProjectUrl,
    normalizedArticleAggregatorPathId,
    persistSettingsValue,
    persistedSocialSettings.programmableCaptureBaseUrl,
    persistedSocialSettings.programmableCapturePersonaId,
    persistedSocialSettings.programmableCaptureRoutes,
    persistedSocialSettings.programmableCaptureScript,
    visionModelId,
    projectUrlError,
    toast,
  ]);

  const handleSaveProgrammableCaptureDefaults = useCallback(
    async (input: {
      baseUrl: string | null;
      personaId: string | null;
      script: string;
      routes: SocialPublishingProgrammableCaptureRoute[];
    }): Promise<boolean> => {
      if (updateSetting.isPending) return false;
      const payload = {
        ...persistedSocialSettings,
        programmableCaptureBaseUrl: normalizeBatchCaptureBaseUrl(input.baseUrl ?? ''),
        programmableCapturePersonaId: input.personaId?.trim() || null,
        programmableCaptureScript:
          input.script.trim().length > 0
            ? input.script
            : DEFAULT_SOCIAL_PUBLISHING_SETTINGS.programmableCaptureScript,
        programmableCaptureRoutes: input.routes,
      };
      return await persistSettingsValue(payload, {
        successMessage: 'Programmable Playwright defaults saved.',
        errorAction: 'saveProgrammableCaptureDefaults',
      });
    },
    [
      normalizeBatchCaptureBaseUrl,
      persistSettingsValue,
      persistedSocialSettings,
      updateSetting.isPending,
    ]
  );

  const handleBrainModelChange = (value: string): void => {
    setBrainModelId(value === BRAIN_MODEL_DEFAULT_VALUE ? null : value);
  };

  const handleVisionModelChange = (value: string): void => {
    setVisionModelId(value === BRAIN_MODEL_DEFAULT_VALUE ? null : value);
  };

  const handlePublishingConnectionChange = (value: string): void => {
    setPublishingConnectionId(value);
  };

  const handleBatchCaptureBaseUrlChange = useCallback(
    (value: string | ((prev: string) => string)) => {
      hasManualBatchBaseUrlRef.current = true;
      setBatchCaptureBaseUrl((prev) =>
        typeof value === 'function' ? value(prev) : value
      );
    }, []);

  const handleBatchCapturePresetLimitChange = useCallback((value: string): void => {
    const trimmed = value.trim();
    if (!trimmed) {
      setBatchCapturePresetLimit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const normalized = Math.floor(parsed);
    setBatchCapturePresetLimit(normalized > 0 ? normalized : null);
  }, []);

  const handleToggleCapturePreset = (presetId: string): void => {
    setBatchCapturePresetIds((prev) =>
      prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId]
    );
  };

  const selectAllCapturePresets = (): void => {
    setBatchCapturePresetIds(SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => preset.id));
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
    setBatchCapturePresetLimit(persistedSocialSettings.batchCapturePresetLimit);
  }, [persistedSocialSettings.batchCapturePresetLimit]);

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
    if (prev.publishingConnectionId !== persistedSocialSettings.publishingConnectionId) {
      setPublishingConnectionId((current) =>
        current === prev.publishingConnectionId
          ? persistedSocialSettings.publishingConnectionId
          : current
      );
    }
    if (prev.projectUrl !== persistedSocialSettings.projectUrl) {
      setProjectUrl((current) =>
        current === (prev.projectUrl ?? '')
          ? (persistedSocialSettings.projectUrl ?? '')
          : current
      );
    }
    persistedRef.current = persistedSocialSettings;
  }, [
    persistedSocialSettings.brainModelId,
    persistedSocialSettings.publishingConnectionId,
    persistedSocialSettings.projectUrl,
    persistedSocialSettings.visionModelId,
  ]);

  return {
    publishingConnectionId,
    setPublishingConnectionId,
    brainModelId,
    setBrainModelId,
    visionModelId,
    setVisionModelId,
    projectUrl,
    projectUrlError,
    setProjectUrl,
    batchCaptureBaseUrl,
    setBatchCaptureBaseUrl: handleBatchCaptureBaseUrlChange,
    batchCapturePresetIds,
    setBatchCapturePresetIds,
    batchCapturePresetLimit: normalizedBatchCapturePresetLimit,
    setBatchCapturePresetLimit: handleBatchCapturePresetLimitChange,
    articleAggregatorPathId,
    setArticleAggregatorPathId,
    isSettingsDirty,
    isSavingSettings: updateSetting.isPending,
    handleSaveSettings,
    handleBrainModelChange,
    handleVisionModelChange,
    handlePublishingConnectionChange,
    handleToggleCapturePreset,
    selectAllCapturePresets,
    clearCapturePresets,
    handleSaveProgrammableCaptureDefaults,
    linkedinIntegration,
    linkedinConnections,
    brainModelOptions,
    visionModelOptions,
    persistedSocialSettings,
  };
}
