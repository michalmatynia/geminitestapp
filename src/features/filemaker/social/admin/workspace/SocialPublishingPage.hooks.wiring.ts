import { useSocialCaptureFlows } from './hooks/useSocialCaptureFlows';
import { useSocialContext } from './hooks/useSocialContext';
import { useSocialEditorSync } from './hooks/useSocialEditorSync';
import { useSocialGeneration } from './hooks/useSocialGeneration';
import { useSocialImageAddons } from './hooks/useSocialImageAddons';
import { useSocialPipelineRunner } from './hooks/useSocialPipelineRunner';
import { useSocialPostCrud } from './hooks/useSocialPostCrud';
import type { useSocialSettings } from './hooks/useSocialSettings';
import type { BuildSocialContext } from './SocialPublishingPage.hooks.context';
import type {
  AdminSocialResolvedSettings,
  AdminSocialVisualState,
} from './SocialPublishingPage.hooks.runtime';

type SocialEditorState = ReturnType<typeof useSocialEditorSync>;
type SocialSettingsState = ReturnType<typeof useSocialSettings>;

export const useAdminSocialEditor = ({
  resolved,
  settings,
}: {
  resolved: AdminSocialResolvedSettings;
  settings: SocialSettingsState;
}): SocialEditorState =>
  useSocialEditorSync({
    linkedinConnections: settings.linkedinConnections,
    publishingConnectionId: settings.publishingConnectionId,
    brainModelId: resolved.resolvedBrainModelId,
    visionModelId: resolved.resolvedVisionModelId,
  });

export const useAdminSocialPostCrud = ({
  buildSocialContext,
  editor,
  resolved,
  settings,
}: {
  buildSocialContext: BuildSocialContext;
  editor: SocialEditorState;
  resolved: AdminSocialResolvedSettings;
  settings: SocialSettingsState;
}): ReturnType<typeof useSocialPostCrud> =>
  useSocialPostCrud({
    activePost: editor.activePost,
    activePostId: editor.activePostId,
    setActivePostId: editor.setActivePostId,
    editorState: editor.editorState,
    scheduledAt: editor.scheduledAt,
    imageAssets: editor.imageAssets,
    imageAddonIds: editor.imageAddonIds,
    recentAddons: editor.recentAddons,
    resolveDocReferences: editor.resolveDocReferences,
    publishingConnectionId: settings.publishingConnectionId,
    brainModelId: resolved.resolvedBrainModelId,
    visionModelId: resolved.resolvedVisionModelId,
    buildSocialContext,
  });

export const useAdminSocialImageAddons = ({
  buildSocialContext,
  editor,
  settings,
}: {
  buildSocialContext: BuildSocialContext;
  editor: SocialEditorState;
  settings: SocialSettingsState;
}): ReturnType<typeof useSocialImageAddons> =>
  useSocialImageAddons({
    addonForm: editor.addonForm,
    setAddonForm: editor.setAddonForm,
    batchCaptureBaseUrl: settings.batchCaptureBaseUrl,
    batchCapturePresetIds: settings.batchCapturePresetIds,
    batchCapturePresetLimit: settings.batchCapturePresetLimit,
    buildSocialContext,
  });

export const useAdminSocialContextLoader = ({
  buildSocialContext,
  editor,
}: {
  buildSocialContext: BuildSocialContext;
  editor: SocialEditorState;
}): ReturnType<typeof useSocialContext> =>
  useSocialContext({
    activePost: editor.activePost,
    resolveDocReferences: editor.resolveDocReferences,
    setContextSummary: editor.setContextSummary,
    buildSocialContext,
  });

export const useAdminSocialGeneration = ({
  buildSocialContext,
  editor,
  resolved,
  settings,
}: {
  buildSocialContext: BuildSocialContext;
  editor: SocialEditorState;
  resolved: AdminSocialResolvedSettings;
  settings: SocialSettingsState;
}): ReturnType<typeof useSocialGeneration> =>
  useSocialGeneration({
    activePost: editor.activePost,
    resolveDocReferences: editor.resolveDocReferences,
    generationNotes: editor.generationNotes,
    brainModelId: resolved.resolvedBrainModelId,
    visionModelId: resolved.resolvedVisionModelId,
    canGenerateDraft: resolved.canGenerateSocialDraft,
    generateDraftBlockedReason: resolved.socialDraftBlockedReason,
    imageAddonIds: editor.imageAddonIds,
    projectUrl: settings.projectUrl,
    setActivePostId: editor.setActivePostId,
    setEditorState: editor.setEditorState,
    setContextSummary: editor.setContextSummary,
    buildSocialContext,
  });

export const useAdminSocialPipeline = ({
  buildSocialContext,
  context,
  editor,
  imageAddons,
  resolved,
  settings,
  visual,
}: {
  buildSocialContext: BuildSocialContext;
  context: ReturnType<typeof useSocialContext>;
  editor: SocialEditorState;
  imageAddons: ReturnType<typeof useSocialImageAddons>;
  resolved: AdminSocialResolvedSettings;
  settings: SocialSettingsState;
  visual: AdminSocialVisualState;
}): ReturnType<typeof useSocialPipelineRunner> =>
  useSocialPipelineRunner({
    activePost: editor.activePost,
    activePostId: editor.activePostId,
    editorState: editor.editorState,
    imageAssets: editor.imageAssets,
    imageAddonIds: editor.imageAddonIds,
    batchCaptureBaseUrl: settings.batchCaptureBaseUrl,
    batchCapturePresetIds: settings.batchCapturePresetIds,
    batchCapturePresetLimit: settings.batchCapturePresetLimit,
    publishingConnectionId: settings.publishingConnectionId,
    brainModelId: resolved.resolvedBrainModelId,
    visionModelId: resolved.resolvedVisionModelId,
    canRunServerPipeline: resolved.canGenerateSocialDraft,
    pipelineBlockedReason: resolved.socialDraftBlockedReason,
    canRunVisualAnalysisPipeline: visual.canRunVisualAnalysisPipeline,
    visualAnalysisBlockedReason: visual.socialVisualAnalysisBlockedReason,
    projectUrl: settings.projectUrl,
    generationNotes: editor.generationNotes,
    resolveDocReferences: editor.resolveDocReferences,
    buildSocialContext,
    handleLoadContext: context.handleLoadContext,
    setContextSummary: editor.setContextSummary,
    setActivePostId: editor.setActivePostId,
    setEditorState: editor.setEditorState,
    setImageAddonIds: editor.setImageAddonIds,
    setImageAssets: editor.setImageAssets,
    setBatchCaptureResult: imageAddons.setBatchCaptureResult,
    handleSelectAddons: editor.handleSelectAddons,
  });

export const useAdminSocialCaptureFlows = ({
  buildSocialContext,
  crud,
  editor,
  imageAddons,
  pipeline,
  resolved,
  settings,
}: {
  buildSocialContext: BuildSocialContext;
  crud: ReturnType<typeof useSocialPostCrud>;
  editor: SocialEditorState;
  imageAddons: ReturnType<typeof useSocialImageAddons>;
  pipeline: ReturnType<typeof useSocialPipelineRunner>;
  resolved: AdminSocialResolvedSettings;
  settings: SocialSettingsState;
}): ReturnType<typeof useSocialCaptureFlows> =>
  useSocialCaptureFlows({
    editor,
    crud,
    imageAddons,
    settings,
    pipeline,
    buildSocialContext,
    canGenerateSocialDraft: resolved.canGenerateSocialDraft,
    socialDraftBlockedReason: resolved.socialDraftBlockedReason,
    hasBatchCaptureConfig: resolved.hasBatchCaptureConfig,
    socialBatchCaptureBlockedReason: resolved.socialBatchCaptureBlockedReason,
    effectiveBatchCapturePresetCount: resolved.effectiveBatchCapturePresetCount,
  });
