'use client';

import { useMemo } from 'react';
import {
  getImageModelCapabilities,
  isGpt52ImageModel,
  uniqueSortedModelIds,
} from '@/shared/lib/ai/image-studio/utils/image-models';
import { normalizeImageStudioModelPresets } from '@/shared/lib/ai/image-studio/utils/studio-settings';
import type { ImageStudioSettings } from '@/shared/lib/ai/image-studio/utils/studio-settings';
import type { UseQueryResult } from '@tanstack/react-query';

export function useModelAwareSettings({
  studioSettings,
  imageModelsQuery,
}: {
  studioSettings: ImageStudioSettings;
  imageModelsQuery: UseQueryResult<{ models?: string[] }, Error>;
}) {
  const quickSwitchModels = useMemo(() => {
    return normalizeImageStudioModelPresets(
      studioSettings.targetAi.openai.modelPresets,
      studioSettings.targetAi.openai.model
    );
  }, [studioSettings.targetAi.openai.modelPresets, studioSettings.targetAi.openai.model]);

  const selectedGenerationModel = useMemo(() => {
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    if (currentModel && quickSwitchModels.includes(currentModel)) return currentModel;
    return quickSwitchModels[0] ?? '';
  }, [quickSwitchModels, studioSettings.targetAi.openai.model]);

  const generationModelOptions = useMemo(() => {
    const discovered = Array.isArray(imageModelsQuery.data?.models)
      ? imageModelsQuery.data.models
      : [];
    const currentModel = studioSettings.targetAi.openai.model?.trim() || '';
    return uniqueSortedModelIds([
      ...discovered,
      ...quickSwitchModels,
      ...(currentModel ? [currentModel] : []),
    ]);
  }, [imageModelsQuery.data?.models, quickSwitchModels, studioSettings.targetAi.openai.model]);

  const addableGenerationModelOptions = useMemo(() => {
    return generationModelOptions
      .filter((modelId) => !quickSwitchModels.includes(modelId))
      .map((modelId) => ({ value: modelId, label: modelId }));
  }, [generationModelOptions, quickSwitchModels]);

  const quickSwitchModelSelectOptions = useMemo(
    () => quickSwitchModels.map((modelId) => ({ value: modelId, label: modelId })),
    [quickSwitchModels]
  );

  const modelCapabilities = useMemo(
    () => getImageModelCapabilities(studioSettings.targetAi.openai.model),
    [studioSettings.targetAi.openai.model]
  );

  const isGpt52Model = useMemo(
    () => isGpt52ImageModel(studioSettings.targetAi.openai.model),
    [studioSettings.targetAi.openai.model]
  );

  const modelAwareSizeValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.size;
    return value && (modelCapabilities.sizeOptions as string[]).includes(value)
      ? value
      : '__null__';
  }, [modelCapabilities.sizeOptions, studioSettings.targetAi.openai.image.size]);

  const modelAwareQualityValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.quality;
    return value && (modelCapabilities.qualityOptions as string[]).includes(value)
      ? value
      : '__null__';
  }, [modelCapabilities.qualityOptions, studioSettings.targetAi.openai.image.quality]);

  const modelAwareBackgroundValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.background;
    return value && (modelCapabilities.backgroundOptions as string[]).includes(value)
      ? value
      : '__null__';
  }, [modelCapabilities.backgroundOptions, studioSettings.targetAi.openai.image.background]);

  const modelAwareFormatValue = useMemo(() => {
    const value = studioSettings.targetAi.openai.image.format ?? 'png';
    if ((modelCapabilities.formatOptions as string[]).includes(value)) return value;
    return modelCapabilities.formatOptions[0] ?? 'png';
  }, [modelCapabilities.formatOptions, studioSettings.targetAi.openai.image.format]);

  const modelAwareSizeOptions = useMemo(
    () => [
      { value: '__null__', label: 'Default' },
      ...modelCapabilities.sizeOptions.map((option: string) => ({ value: option, label: option })),
    ],
    [modelCapabilities.sizeOptions]
  );
  const modelAwareQualityOptions = useMemo(
    () => [
      { value: '__null__', label: 'Default' },
      ...modelCapabilities.qualityOptions.map((option: string) => ({
        value: option,
        label: option,
      })),
    ],
    [modelCapabilities.qualityOptions]
  );
  const modelAwareBackgroundOptions = useMemo(
    () => [
      { value: '__null__', label: 'Default' },
      ...modelCapabilities.backgroundOptions.map((option: string) => ({
        value: option,
        label: option,
      })),
    ],
    [modelCapabilities.backgroundOptions]
  );
  const modelAwareFormatOptions = useMemo(
    () =>
      modelCapabilities.formatOptions.map((option: string) => ({ value: option, label: option })),
    [modelCapabilities.formatOptions]
  );

  return {
    quickSwitchModels,
    selectedGenerationModel,
    addableGenerationModelOptions,
    quickSwitchModelSelectOptions,
    modelCapabilities,
    isGpt52Model,
    modelAwareSizeValue,
    modelAwareQualityValue,
    modelAwareBackgroundValue,
    modelAwareFormatValue,
    modelAwareSizeOptions,
    modelAwareQualityOptions,
    modelAwareBackgroundOptions,
    modelAwareFormatOptions,
  };
}
