'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/features/kangur/shared/ui';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import {
  useIntegrationConnections,
  useIntegrations,
} from '@/features/integrations/public';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  isRecoverableKangurClientFetchError,
  logKangurClientError,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  KANGUR_SOCIAL_SETTINGS_KEY,
  DEFAULT_KANGUR_SOCIAL_SETTINGS,
  parseKangurSocialSettings,
} from '@/features/kangur/social/settings';
import {
  getKangurSocialProjectUrlError,
  normalizeKangurSocialProjectUrl,
} from '@/features/kangur/social/project-url';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/social/shared/social-capture-presets';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { KangurSocialProgrammableCaptureRoute } from '@/shared/contracts/kangur-social-image-addons';

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

  const normalizedProjectUrl = normalizeKangurSocialProjectUrl(projectUrl) || null;
  const projectUrlError = getKangurSocialProjectUrlError(projectUrl);

  const isSettingsDirty =
    persistedSocialSettings.brainModelId !== brainModelId ||
    persistedSocialSettings.visionModelId !== visionModelId ||
    persistedSocialSettings.linkedinConnectionId !== linkedinConnectionId ||
    persistedSocialSettings.batchCaptureBaseUrl !== normalizedBatchCaptureBaseUrl ||
    persistedSocialSettings.batchCapturePresetLimit !== normalizedBatchCapturePresetLimit ||
    persistedSocialSettings.projectUrl !== normalizedProjectUrl ||
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
          key: KANGUR_SOCIAL_SETTINGS_KEY,
          value: serialized,
        });
        queryClient.setQueryData<Map<string, string>>(
          QUERY_KEYS.settings.scope('light'),
          (current) => {
            const next = new Map(current ?? []);
            next.set(KANGUR_SOCIAL_SETTINGS_KEY, serialized);
            return next;
          }
        );
        settingsStore.refetch();
        toast(options.successMessage, { variant: 'success' });
        return true;
      } catch (error) {
        const isRecoverableFetchFailure = isRecoverableKangurClientFetchError(error);
        if (!isRecoverableFetchFailure) {
          void ErrorSystem.captureException(error);
          logKangurClientError(error, {
            source: 'AdminKangurSocialPage',
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
      linkedinConnectionId: linkedinConnectionId ?? null,
      batchCaptureBaseUrl: normalizedBatchCaptureBaseUrl,
      batchCapturePresetIds: normalizedBatchCapturePresetIds,
      batchCapturePresetLimit: normalizedBatchCapturePresetLimit,
      programmableCaptureBaseUrl: persistedSocialSettings.programmableCaptureBaseUrl,
      programmableCapturePersonaId: persistedSocialSettings.programmableCapturePersonaId,
      programmableCaptureScript: persistedSocialSettings.programmableCaptureScript,
      programmableCaptureRoutes: persistedSocialSettings.programmableCaptureRoutes,
      projectUrl: normalizedProjectUrl,
      captureContentConfig: persistedSocialSettings.captureContentConfig,
    };
    return await persistSettingsValue(payload, {
      successMessage: 'Social settings saved.',
      errorAction: 'saveSettings',
    });
  }, [
    brainModelId,
    linkedinConnectionId,
    normalizedBatchCaptureBaseUrl,
    normalizedBatchCapturePresetLimit,
    normalizedBatchCapturePresetIds,
    normalizedProjectUrl,
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
      routes: KangurSocialProgrammableCaptureRoute[];
    }): Promise<boolean> => {
      if (updateSetting.isPending) return false;
      const payload = {
        ...persistedSocialSettings,
        programmableCaptureBaseUrl: normalizeBatchCaptureBaseUrl(input.baseUrl ?? ''),
        programmableCapturePersonaId: input.personaId?.trim() || null,
        programmableCaptureScript:
          input.script.trim().length > 0
            ? input.script
            : DEFAULT_KANGUR_SOCIAL_SETTINGS.programmableCaptureScript,
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
    if (prev.linkedinConnectionId !== persistedSocialSettings.linkedinConnectionId) {
      setLinkedinConnectionId((current) =>
        current === prev.linkedinConnectionId
          ? persistedSocialSettings.linkedinConnectionId
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
    persistedSocialSettings.linkedinConnectionId,
    persistedSocialSettings.projectUrl,
    persistedSocialSettings.visionModelId,
  ]);

  return {
    linkedinConnectionId,
    setLinkedinConnectionId,
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
    isSettingsDirty,
    isSavingSettings: updateSetting.isPending,
    handleSaveSettings,
    handleBrainModelChange,
    handleVisionModelChange,
    handleLinkedInConnectionChange,
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
