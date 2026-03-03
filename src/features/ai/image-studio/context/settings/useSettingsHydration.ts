'use client';

import { useEffect } from 'react';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/shared/lib/prompt-engine/settings';
import {
  defaultImageStudioSettings,
  parseImageStudioSettings,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import type { UseQueryResult } from '@tanstack/react-query';

export function useSettingsHydration({
  settingsStore,
  heavySettings,
  userPreferencesQuery,
  hydratedSignatureRef,
  settingsLoaded,
  setSettingsLoaded,
  studioSettingsRaw,
  apiKeyFallback,
  setStudioSettings,
  setAdvancedOverridesText,
  setImageStudioApiKey,
  setPromptValidationEnabled,
  setPromptValidationRulesText,
  setPromptValidationRulesError,
  hydrationSignature,
}: {
  settingsStore: {
    get: (key: string) => string | null | undefined;
    isLoading: boolean;
  };
  heavySettings: UseQueryResult<Map<string, string>, Error>;
  userPreferencesQuery: UseQueryResult<unknown, Error>;
  hydratedSignatureRef: React.MutableRefObject<string | null>;
  settingsLoaded: boolean;
  setSettingsLoaded: (loaded: boolean) => void;
  studioSettingsRaw: string | null | undefined;
  apiKeyFallback: string;
  setStudioSettings: (settings: ImageStudioSettings) => void;
  setAdvancedOverridesText: (text: string) => void;
  setImageStudioApiKey: (key: string) => void;
  setPromptValidationEnabled: (enabled: boolean) => void;
  setPromptValidationRulesText: (text: string) => void;
  setPromptValidationRulesError: (error: string | null) => void;
  hydrationSignature: string;
}) {
  useEffect(() => {
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading)
      return;
    if (hydratedSignatureRef.current === hydrationSignature) {
      if (!settingsLoaded) setSettingsLoaded(true);
      return;
    }

    const storedRaw = studioSettingsRaw;
    const promptEngineStored = parsePromptEngineSettings(
      settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY)
    );
    let hydrated = defaultImageStudioSettings;
    try {
      hydrated = parseImageStudioSettings(storedRaw);
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'ImageStudioSettingsProvider',
          action: 'hydrateSettings',
        },
      });
    }

    setStudioSettings(hydrated);
    setAdvancedOverridesText(
      JSON.stringify(hydrated.targetAi.openai.advanced_overrides ?? {}, null, 2)
    );
    setImageStudioApiKey(apiKeyFallback);
    setPromptValidationEnabled(promptEngineStored.promptValidation.enabled);
    setPromptValidationRulesText(
      JSON.stringify(promptEngineStored.promptValidation.rules, null, 2)
    );
    setPromptValidationRulesError(null);
    hydratedSignatureRef.current = hydrationSignature;
    setSettingsLoaded(true);
  }, [
    hydrationSignature,
    settingsLoaded,
    settingsStore.isLoading,
    heavySettings.isLoading,
    settingsStore,
    userPreferencesQuery.isLoading,
    studioSettingsRaw,
    apiKeyFallback,
    setSettingsLoaded,
    setStudioSettings,
    setAdvancedOverridesText,
    setImageStudioApiKey,
    setPromptValidationEnabled,
    setPromptValidationRulesText,
    setPromptValidationRulesError,
    hydratedSignatureRef,
  ]);
}
