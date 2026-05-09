import 'server-only';

import {
  IMAGE_STUDIO_SETTINGS_KEY,
  buildImageStudioSequenceSnapshot,
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
  parsePersistedImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/server';
import { normalizeProductStudioSequenceGenerationMode } from '@/shared/contracts/products/studio';
import { type ProductStudioSequenceGenerationMode, type ProductStudioSequencingConfig, type ProductStudioSequencingDiagnostics } from '@/shared/contracts/products';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/shared/lib/products/constants';

import {
  buildSequencingDiagnostics,
  hasPersistedSettingValue,
  trimString,
} from './product-studio-service.helpers';
import { clampUpscaleScale } from './product-studio-service.io';

type ProductStudioBrainModelResolution = {
  apiKeyOverrideConfigured: boolean;
  modelId: string;
  warning: string | null;
};

const isRecoverableProductStudioBrainConfigError = (error: unknown): error is Error =>
  isAppError(error) &&
  error.code === AppErrorCodes.configurationError &&
  error.message.includes('Image Studio Image Generation');

export const resolveProductStudioBrainModel = async (): Promise<ProductStudioBrainModelResolution> => {
  try {
    const generationConfig = await resolveBrainExecutionConfigForCapability('image_studio.general', {
      runtimeKind: 'image_generation',
    });
    return {
      apiKeyOverrideConfigured:
        typeof generationConfig.assignment.apiKey === 'string' &&
        generationConfig.assignment.apiKey.trim().length > 0,
      modelId: trimString(generationConfig.modelId) ?? '',
      warning: null,
    };
  } catch (error) {
    if (!isRecoverableProductStudioBrainConfigError(error)) {
      throw error;
    }

    return {
      apiKeyOverrideConfigured: false,
      modelId: '',
      warning: error.message,
    };
  }
};

export const resolveSequencingFromStudioSettings = (
  studioSettings: ImageStudioSettings,
  modelId: string | null = null
): ProductStudioSequencingConfig => {
  const sequenceConfig = studioSettings.projectSequencing;
  const activeSteps = resolveImageStudioSequenceActiveSteps(sequenceConfig).filter(
    (step) => step.enabled
  );
  const persistedEnabled = Boolean(sequenceConfig.enabled);
  const enabled = persistedEnabled && activeSteps.length > 0;
  const firstUpscaleStep = activeSteps.find((step) => step.type === 'upscale');
  const firstGenerateStep = activeSteps.find(
    (step) => step.type === 'generate' || step.type === 'regenerate'
  );
  const currentSnapshot = buildImageStudioSequenceSnapshot(studioSettings, { modelId });
  const savedSnapshotHash = trimString(sequenceConfig.snapshotHash);
  const savedSnapshotSavedAt = trimString(sequenceConfig.snapshotSavedAt);
  const savedSnapshotModelId = trimString(sequenceConfig.snapshotModelId);
  const savedSnapshotStepCount = Number.isFinite(sequenceConfig.snapshotStepCount)
    ? Math.max(0, Math.floor(sequenceConfig.snapshotStepCount))
    : 0;
  const snapshotMatchesCurrent =
    enabled &&
    Boolean(savedSnapshotHash) &&
    savedSnapshotHash === currentSnapshot.hash &&
    savedSnapshotStepCount === currentSnapshot.stepCount &&
    (savedSnapshotModelId ?? null) === (currentSnapshot.modelId ?? null);
  const needsSaveDefaults = enabled && !snapshotMatchesCurrent;
  const needsSaveDefaultsReason = !needsSaveDefaults
    ? null
    : !savedSnapshotHash
      ? 'Project sequence snapshot is not saved yet. In Image Studio click "Save Project".'
      : 'Project sequence snapshot is out of date. In Image Studio click "Save Project" to persist the exact stack and crop geometry.';
  const expectedOutputs =
    firstGenerateStep?.type === 'generate' || firstGenerateStep?.type === 'regenerate'
      ? (firstGenerateStep.config.outputCount ?? studioSettings.targetAi.openai.image.n ?? 1)
      : (studioSettings.targetAi.openai.image.n ?? 1);
  return {
    persistedEnabled,
    enabled,
    cropCenterBeforeGeneration: enabled && activeSteps.some((step) => step.type === 'crop_center'),
    upscaleOnAccept: enabled && activeSteps.some((step) => step.type === 'upscale'),
    upscaleScale: clampUpscaleScale(
      firstUpscaleStep?.type === 'upscale'
        ? firstUpscaleStep.config.scale
        : sequenceConfig.upscaleScale
    ),
    runViaSequence: enabled && !needsSaveDefaults,
    sequenceStepCount: activeSteps.length,
    expectedOutputs: Math.max(1, Math.min(10, Math.floor(expectedOutputs || 1))),
    snapshotHash: savedSnapshotHash,
    snapshotSavedAt: savedSnapshotSavedAt,
    snapshotStepCount: savedSnapshotStepCount,
    snapshotModelId: savedSnapshotModelId,
    currentSnapshotHash: currentSnapshot.hash,
    snapshotMatchesCurrent,
    needsSaveDefaults,
    needsSaveDefaultsReason,
  };
};

export const resolveStudioSettingsBundle = async (
  projectId: string
): Promise<{
  parsedStudioSettings: ImageStudioSettings;
  studioSettings: Record<string, unknown>;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  modelId: string;
  brainConfigWarning: string | null;
}> => {
  const projectSettingsKey = getImageStudioProjectSettingsKey(projectId);
  if (!projectSettingsKey) {
    throw badRequestError(`Invalid Image Studio project id for settings lookup: "${projectId}". The project id must be a non-empty alphanumeric string.`);
  }

  const [projectSettingsRaw, globalSettingsRaw, sequenceGenerationModeRaw, brainModel] =
    await Promise.all([
      getSettingValue(projectSettingsKey),
      getSettingValue(IMAGE_STUDIO_SETTINGS_KEY),
      getSettingValue(PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY),
      resolveProductStudioBrainModel(),
    ]);

  const parsedSettings = hasPersistedSettingValue(projectSettingsRaw)
    ? parsePersistedImageStudioSettings(projectSettingsRaw)
    : defaultImageStudioSettings;
  const sequencingDiagnostics = buildSequencingDiagnostics({
    projectId,
    projectSettingsKey,
    projectSettingsRaw,
    globalSettingsRaw,
    selectedSettings: parsedSettings,
  });
  const sequenceGenerationMode =
    normalizeProductStudioSequenceGenerationMode(sequenceGenerationModeRaw);
  const modelId = brainModel.modelId;
  return {
    parsedStudioSettings: parsedSettings,
    studioSettings: parsedSettings as Record<string, unknown>,
    sequencing: resolveSequencingFromStudioSettings(parsedSettings, modelId),
    sequencingDiagnostics,
    sequenceGenerationMode,
    modelId,
    brainConfigWarning: brainModel.warning,
  };
};
