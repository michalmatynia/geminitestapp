'use client';

import { useMemo } from 'react';

import {
  getImageModelCapabilities,
  isGpt52ImageModel,
} from '@/features/ai/image-studio/utils/image-models';
import type { ImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';

export function useModelAwareSettings({
  studioSettings,
  generationModelId,
}: {
  studioSettings: ImageStudioSettings;
  generationModelId: string;
}) {
  const resolvedGenerationModelId = generationModelId.trim();

  const modelCapabilities = useMemo(
    () => getImageModelCapabilities(resolvedGenerationModelId),
    [resolvedGenerationModelId]
  );

  const isGpt52Model = useMemo(
    () => isGpt52ImageModel(resolvedGenerationModelId),
    [resolvedGenerationModelId]
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
