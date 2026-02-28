import 'server-only';

import {
  IMAGE_STUDIO_SETTINGS_KEY,
  buildImageStudioSequenceSnapshot,
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
  parseImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/studio-settings';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/shared/lib/products/constants';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import {
  normalizeProductStudioSequenceGenerationMode,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioSequencingConfig,
  type ProductStudioSequencingDiagnostics,
} from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

import {
  buildSequencingDiagnostics,
  hasPersistedSettingValue,
  trimString,
} from './product-studio-service.helpers';
import { clampUpscaleScale } from './product-studio-service.io';

export const resolveSequencingFromStudioSettings = (
  studioSettings: ImageStudioSettings
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
  const currentSnapshot = buildImageStudioSequenceSnapshot(studioSettings);
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
}> => {
  const projectSettingsKey = getImageStudioProjectSettingsKey(projectId);
  if (!projectSettingsKey) {
    throw badRequestError('Invalid Image Studio project id for settings lookup.');
  }

  const [projectSettingsRaw, globalSettingsRaw, sequenceGenerationModeRaw] = await Promise.all([
    getSettingValue(projectSettingsKey),
    getSettingValue(IMAGE_STUDIO_SETTINGS_KEY),
    getSettingValue(PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY),
  ]);

  const parsedSettings = hasPersistedSettingValue(projectSettingsRaw)
    ? parseImageStudioSettings(projectSettingsRaw)
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
  const modelId = trimString(parsedSettings.targetAi.openai.model) ?? '';
  return {
    parsedStudioSettings: parsedSettings,
    studioSettings: parsedSettings as unknown as Record<string, unknown>,
    sequencing: resolveSequencingFromStudioSettings(parsedSettings),
    sequencingDiagnostics,
    sequenceGenerationMode,
    modelId,
  };
};
