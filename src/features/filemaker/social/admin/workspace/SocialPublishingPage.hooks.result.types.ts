import type { useSocialCaptureFlows } from './hooks/useSocialCaptureFlows';
import type { useSocialContext } from './hooks/useSocialContext';
import type { useSocialEditorSync } from './hooks/useSocialEditorSync';
import type { useSocialGeneration } from './hooks/useSocialGeneration';
import type { useSocialImageAddons } from './hooks/useSocialImageAddons';
import type { useSocialMissingImageAddons } from './hooks/useSocialMissingImageAddons';
import type { useSocialModelTelemetry } from './hooks/useSocialModelTelemetry';
import type { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';
import type { useSocialPostCrud } from './hooks/useSocialPostCrud';
import type { useSocialSettings } from './hooks/useSocialSettings';
import type { AdminSocialPageActions } from './SocialPublishingPage.hooks.actions';
import type {
  AdminSocialResolvedSettings,
  AdminSocialVisualState,
} from './SocialPublishingPage.hooks.runtime';

type CaptureFlowsState = ReturnType<typeof useSocialCaptureFlows>;
type ContextState = ReturnType<typeof useSocialContext>;
type CrudState = ReturnType<typeof useSocialPostCrud>;
type EditorState = ReturnType<typeof useSocialEditorSync>;
type GenerationState = ReturnType<typeof useSocialGeneration>;
type ImageAddonsState = ReturnType<typeof useSocialImageAddons>;
type MissingImageAddonsState = ReturnType<typeof useSocialMissingImageAddons>;
type PipelineState = ReturnType<typeof useSocialPipelineRunner>;
type SettingsState = ReturnType<typeof useSocialSettings>;
type TelemetryState = ReturnType<typeof useSocialModelTelemetry>;

export type BuildResultParams = {
  actions: AdminSocialPageActions;
  captureFlows: CaptureFlowsState;
  context: ContextState;
  crud: CrudState;
  editor: EditorState;
  generation: GenerationState;
  imageAddons: ImageAddonsState;
  missingImageAddons: MissingImageAddonsState;
  pipeline: PipelineState;
  resolved: AdminSocialResolvedSettings;
  settings: SettingsState;
  telemetry: TelemetryState;
  visual: AdminSocialVisualState;
};

export type EditorResult = Pick<
  EditorState,
  | 'activePost'
  | 'activePostId'
  | 'addonForm'
  | 'addonsQuery'
  | 'contextSummary'
  | 'docReferenceInput'
  | 'editorState'
  | 'generationNotes'
  | 'handleAddImages'
  | 'handleRemoveAddon'
  | 'handleRemoveImage'
  | 'handleSelectAddon'
  | 'hasUnsavedChanges'
  | 'imageAddonIds'
  | 'imageAssets'
  | 'missingSelectedImageAddonIds'
  | 'posts'
  | 'postsQuery'
  | 'recentAddons'
  | 'resolveDocReferences'
  | 'scheduledAt'
  | 'setActivePostId'
  | 'setAddonForm'
  | 'setDocReferenceInput'
  | 'setEditorState'
  | 'setGenerationNotes'
  | 'setImageAddonIds'
  | 'setImageAssets'
  | 'setScheduledAt'
  | 'setShowMediaLibrary'
  | 'showMediaLibrary'
>;

export type SettingsResult = Pick<
  SettingsState,
  | 'articleAggregatorPathId'
  | 'batchCaptureBaseUrl'
  | 'batchCapturePresetIds'
  | 'batchCapturePresetLimit'
  | 'brainModelId'
  | 'brainModelOptions'
  | 'clearCapturePresets'
  | 'handleSaveSettings'
  | 'handleToggleCapturePreset'
  | 'isSavingSettings'
  | 'isSettingsDirty'
  | 'linkedinConnections'
  | 'linkedinIntegration'
  | 'projectUrl'
  | 'projectUrlError'
  | 'publishingConnectionId'
  | 'selectAllCapturePresets'
  | 'setArticleAggregatorPathId'
  | 'setBatchCaptureBaseUrl'
  | 'setBatchCapturePresetLimit'
  | 'setProjectUrl'
  | 'visionModelId'
  | 'visionModelOptions'
> &
  Pick<
    TelemetryState,
    'handleBrainModelChange' | 'handlePublishingConnectionChange' | 'handleVisionModelChange'
  > &
  Pick<
    AdminSocialResolvedSettings,
    | 'effectiveBatchCapturePresetCount'
    | 'hasBatchCaptureConfig'
    | 'hasSavedProgrammableCaptureDefaults'
    | 'persistedProgrammableCaptureBaseUrl'
    | 'persistedProgrammableCapturePersonaId'
    | 'persistedProgrammableCaptureRoutes'
    | 'persistedProgrammableCaptureScript'
    | 'socialBatchCaptureBlockedReason'
    | 'socialDraftBlockedReason'
    | 'socialVisionWarning'
  > &
  Pick<
    AdminSocialVisualState,
    'canRunVisualAnalysisPipeline' | 'socialVisualAnalysisBlockedReason'
  > & {
    canGenerateSocialDraft: boolean;
    canRunFreshCapturePipeline: boolean;
  };

export type CrudResult = CrudState;

export type ImageAddonsResult = Pick<
  ImageAddonsState,
  | 'batchCaptureErrorMessage'
  | 'batchCaptureJob'
  | 'batchCaptureMessage'
  | 'batchCaptureMutation'
  | 'batchCapturePending'
  | 'batchCaptureResult'
  | 'captureAppearanceMode'
  | 'createAddonMutation'
  | 'handleBatchCapture'
  | 'handleCreateAddon'
  | 'handleRetryFailedPresetBatchCaptureJob'
  | 'setBatchCaptureResult'
>;

export type ContextResult = ContextState & Pick<EditorState, 'contextSummary'>;
export type GenerationResult = GenerationState;

export type PipelineResult = Pick<
  PipelineState,
  | 'currentPipelineJob'
  | 'currentVisualAnalysisJob'
  | 'handleAnalyzeSelectedVisuals'
  | 'handleCloseVisualAnalysisModal'
  | 'handleOpenVisualAnalysisModal'
  | 'hasSavedVisualAnalysis'
  | 'isSavedVisualAnalysisStale'
  | 'isVisualAnalysisModalOpen'
  | 'pipelineErrorMessage'
  | 'pipelineProgress'
  | 'pipelineStep'
  | 'visualAnalysisErrorMessage'
  | 'visualAnalysisPending'
  | 'visualAnalysisResult'
> &
  AdminSocialPageActions;

export type CaptureFlowsResult = Pick<
  CaptureFlowsState,
  | 'captureOnlyBatchCaptureJob'
  | 'captureOnlyErrorMessage'
  | 'captureOnlyMessage'
  | 'captureOnlyPending'
  | 'handleAddProgrammableCaptureRoute'
  | 'handleCaptureImagesOnly'
  | 'handleCloseProgrammablePlaywrightModal'
  | 'handleOpenProgrammablePlaywrightModal'
  | 'handleOpenProgrammablePlaywrightModalFromDefaults'
  | 'handleRemoveProgrammableCaptureRoute'
  | 'handleResetProgrammableCaptureDefaults'
  | 'handleResetProgrammableCaptureScript'
  | 'handleRetryFailedProgrammableCaptureJob'
  | 'handleRunProgrammablePlaywrightCapture'
  | 'handleRunProgrammablePlaywrightCaptureAndPipeline'
  | 'handleSaveProgrammableCaptureDefaults'
  | 'handleSeedProgrammableCaptureRoutesFromPresets'
  | 'handleUpdateProgrammableCaptureRoute'
  | 'isProgrammablePlaywrightModalOpen'
  | 'programmableCaptureBaseUrl'
  | 'programmableCaptureBatchCaptureJob'
  | 'programmableCaptureErrorMessage'
  | 'programmableCaptureMessage'
  | 'programmableCapturePending'
  | 'programmableCapturePersonaId'
  | 'programmableCaptureRoutes'
  | 'programmableCaptureScript'
  | 'setProgrammableCaptureBaseUrl'
  | 'setProgrammableCapturePersonaId'
  | 'setProgrammableCaptureScript'
>;

export type MissingImageAddonsResult = MissingImageAddonsState;

export type AdminSocialPublishingPageResult = EditorResult &
  SettingsResult &
  CrudResult &
  ImageAddonsResult &
  ContextResult &
  GenerationResult &
  PipelineResult &
  CaptureFlowsResult &
  MissingImageAddonsResult;
