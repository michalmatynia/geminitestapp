import type { useSocialEditorSync } from './hooks/useSocialEditorSync';
import type { useSocialSettings } from './hooks/useSocialSettings';
import { SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT } from '@/features/filemaker/social/shared/social-playwright-capture';

type SocialSettingsState = ReturnType<typeof useSocialSettings>;
type SocialEditorState = ReturnType<typeof useSocialEditorSync>;

export type AdminSocialResolvedSettings = {
  brainRoutingModelId: string | null;
  canGenerateSocialDraft: boolean;
  effectiveBatchCapturePresetCount: number;
  hasBatchCaptureConfig: boolean;
  hasSavedProgrammableCaptureDefaults: boolean;
  persistedProgrammableCaptureBaseUrl: string | null;
  persistedProgrammableCapturePersonaId: string | null;
  persistedProgrammableCaptureRoutes: SocialSettingsState['persistedSocialSettings']['programmableCaptureRoutes'];
  persistedProgrammableCaptureScript: string;
  resolvedBrainModelId: string | null;
  resolvedVisionModelId: string | null;
  socialBatchCaptureBlockedReason: string | null;
  socialDraftBlockedReason: string | null;
  socialVisionWarning: string | null;
  visionRoutingModelId: string | null;
};

export type AdminSocialVisualState = {
  canRunVisualAnalysisPipeline: boolean;
  socialVisualAnalysisBlockedReason: string | null;
};

const GENERATION_MODEL_BLOCKED_MESSAGE =
  'Choose a Social Publishing post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.';

const VISION_MODEL_WARNING_MESSAGE =
  'Visual analysis is not configured. Choose a Social Publishing vision model in Settings or assign AI Brain routing to enable screenshot analysis.';

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const hasProjectUrlError = (settings: SocialSettingsState): boolean => {
  const error = settings.projectUrlError;
  return typeof error === 'string' && error.trim().length > 0;
};

const resolveEffectiveBatchCapturePresetCount = (
  settings: SocialSettingsState
): number => {
  if (settings.batchCapturePresetLimit === null) {
    return settings.batchCapturePresetIds.length;
  }
  return Math.min(settings.batchCapturePresetLimit, settings.batchCapturePresetIds.length);
};

const resolveBatchCaptureBlockedReason = ({
  hasBatchCaptureConfig,
  settings,
}: {
  hasBatchCaptureConfig: boolean;
  settings: SocialSettingsState;
}): string | null => {
  if (hasBatchCaptureConfig) {
    return null;
  }
  if (settings.batchCaptureBaseUrl.trim().length === 0) {
    return 'Set a batch capture base URL in Social Settings first.';
  }
  return 'Select at least one capture preset in Social Settings first.';
};

const resolveHasSavedProgrammableCaptureDefaults = (
  settings: SocialSettingsState
): boolean => {
  const persisted = settings.persistedSocialSettings;
  return (
    normalizeOptionalText(persisted.programmableCaptureBaseUrl) !== null ||
    normalizeOptionalText(persisted.programmableCapturePersonaId) !== null ||
    persisted.programmableCaptureRoutes.length > 0 ||
    persisted.programmableCaptureScript !== SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
  );
};

export const resolveAdminSocialPublishingSettings = (
  settings: SocialSettingsState
): AdminSocialResolvedSettings => {
  const brainRoutingModelId = normalizeOptionalText(
    settings.brainModelOptions.effectiveModelId
  );
  const visionRoutingModelId = normalizeOptionalText(
    settings.visionModelOptions.effectiveModelId
  );
  const resolvedBrainModelId = normalizeOptionalText(settings.brainModelId) ?? brainRoutingModelId;
  const resolvedVisionModelId =
    normalizeOptionalText(settings.visionModelId) ?? visionRoutingModelId;
  const hasGenerationModel = resolvedBrainModelId !== null;
  const hasBatchCaptureConfig =
    settings.batchCaptureBaseUrl.trim().length > 0 &&
    settings.batchCapturePresetIds.length > 0;

  return {
    brainRoutingModelId,
    canGenerateSocialDraft: hasGenerationModel && !hasProjectUrlError(settings),
    effectiveBatchCapturePresetCount: resolveEffectiveBatchCapturePresetCount(settings),
    hasBatchCaptureConfig,
    hasSavedProgrammableCaptureDefaults: resolveHasSavedProgrammableCaptureDefaults(settings),
    persistedProgrammableCaptureBaseUrl:
      settings.persistedSocialSettings.programmableCaptureBaseUrl,
    persistedProgrammableCapturePersonaId:
      settings.persistedSocialSettings.programmableCapturePersonaId,
    persistedProgrammableCaptureRoutes:
      settings.persistedSocialSettings.programmableCaptureRoutes,
    persistedProgrammableCaptureScript:
      settings.persistedSocialSettings.programmableCaptureScript,
    resolvedBrainModelId,
    resolvedVisionModelId,
    socialBatchCaptureBlockedReason: resolveBatchCaptureBlockedReason({
      hasBatchCaptureConfig,
      settings,
    }),
    socialDraftBlockedReason: hasGenerationModel
      ? settings.projectUrlError
      : GENERATION_MODEL_BLOCKED_MESSAGE,
    socialVisionWarning:
      resolvedVisionModelId === null ? VISION_MODEL_WARNING_MESSAGE : null,
    visionRoutingModelId,
  };
};

export const resolveAdminSocialVisualState = ({
  editor,
  resolved,
}: {
  editor: SocialEditorState;
  resolved: AdminSocialResolvedSettings;
}): AdminSocialVisualState => {
  if (resolved.resolvedBrainModelId === null) {
    return {
      canRunVisualAnalysisPipeline: false,
      socialVisualAnalysisBlockedReason: resolved.socialDraftBlockedReason,
    };
  }
  if (resolved.resolvedVisionModelId === null) {
    return {
      canRunVisualAnalysisPipeline: false,
      socialVisualAnalysisBlockedReason: resolved.socialVisionWarning,
    };
  }
  if (editor.imageAddonIds.length === 0) {
    return {
      canRunVisualAnalysisPipeline: false,
      socialVisualAnalysisBlockedReason:
        'Select at least one image add-on before running image analysis.',
    };
  }
  return {
    canRunVisualAnalysisPipeline: true,
    socialVisualAnalysisBlockedReason: null,
  };
};
