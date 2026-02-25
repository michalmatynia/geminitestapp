/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { 
  parsePromptEngineSettings, 
  PROMPT_ENGINE_SETTINGS_KEY 
} from '@/features/prompt-engine/settings';
import { 
  IMAGE_STUDIO_SETTINGS_KEY, 
  parseImageStudioSettings, 
  normalizeImageStudioModelPresets 
} from '../../utils/studio-settings';

export function useSettingsHydration({
  settingsStore,
  heavySettings,
  userPreferencesQuery,
  hydratedSignatureRef,
  settingsLoaded,
  setSettingsLoaded,
  projectSettingsKey,
  studioSettingsRaw,
  globalStudioSettingsRaw,
  openaiModelFallback,
  apiKeyFallback,
  promptEngineRaw,
  setStudioSettings,
  setAdvancedOverridesText,
  setImageStudioApiKey,
  setPromptValidationEnabled,
  setPromptValidationRulesText,
  setPromptValidationRulesError,
  setModelToAdd,
  hydrationSignature,
}) {
  useEffect(() => {
    if (settingsStore.isLoading || heavySettings.isLoading || userPreferencesQuery.isLoading) return;
    if (hydratedSignatureRef.current === hydrationSignature) {
      if (!settingsLoaded) setSettingsLoaded(true);
      return;
    }

    const storedRaw = studioSettingsRaw;
    const stored = parseImageStudioSettings(storedRaw);
    const globalSettings = parseImageStudioSettings(globalStudioSettingsRaw);
    const promptEngineStored = parsePromptEngineSettings(settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY));
    const hasStoredStudioSettings = Boolean(storedRaw && storedRaw.trim().length > 0);

    const hydratedBase =
      openaiModelFallback && !hasStoredStudioSettings
        ? {
          ...stored,
          targetAi: {
            ...stored.targetAi,
            openai: {
              ...stored.targetAi.openai,
              model: openaiModelFallback,
              modelPresets: normalizeImageStudioModelPresets(
                stored.targetAi.openai.modelPresets,
                openaiModelFallback,
              ),
            },
          },
        }
        : stored;
    const mergedModelPresets = normalizeImageStudioModelPresets(
      [
        ...globalSettings.targetAi.openai.modelPresets,
        ...hydratedBase.targetAi.openai.modelPresets,
      ],
      hydratedBase.targetAi.openai.model,
    );
    const hydrated = {
      ...hydratedBase,
      targetAi: {
        ...hydratedBase.targetAi,
        openai: {
          ...hydratedBase.targetAi.openai,
          modelPresets: mergedModelPresets,
        },
      },
    };

    setStudioSettings(hydrated);
    setAdvancedOverridesText(JSON.stringify(hydrated.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setImageStudioApiKey(apiKeyFallback);
    setPromptValidationEnabled(promptEngineStored.promptValidation.enabled);
    setPromptValidationRulesText(JSON.stringify(promptEngineStored.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setModelToAdd('');
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
    globalStudioSettingsRaw,
    openaiModelFallback,
    apiKeyFallback,
    promptEngineRaw,
    setSettingsLoaded,
    setStudioSettings,
    setAdvancedOverridesText,
    setImageStudioApiKey,
    setPromptValidationEnabled,
    setPromptValidationRulesText,
    setPromptValidationRulesError,
    setModelToAdd,
    hydratedSignatureRef,
  ]);
}
