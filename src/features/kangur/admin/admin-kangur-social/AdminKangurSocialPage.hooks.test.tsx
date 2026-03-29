/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useSocialSettingsMock,
  useSocialEditorSyncMock,
  useSocialPostCrudMock,
  useSocialImageAddonsMock,
  useSocialContextMock,
  useSocialGenerationMock,
  useSocialPipelineRunnerMock,
  trackKangurClientEventMock,
  logKangurClientErrorMock,
  captureExceptionMock,
  settingsHandleBrainModelChangeMock,
  settingsHandleVisionModelChangeMock,
  settingsHandleLinkedInConnectionChangeMock,
  pipelineRunMock,
  pipelineRunWithOverridesMock,
  pipelineRunFreshMock,
  runBatchCaptureMock,
  patchMutateAsyncMock,
  setImageAddonIdsMock,
  setImageAssetsMock,
} = vi.hoisted(() => ({
  useSocialSettingsMock: vi.fn(),
  useSocialEditorSyncMock: vi.fn(),
  useSocialPostCrudMock: vi.fn(),
  useSocialImageAddonsMock: vi.fn(),
  useSocialContextMock: vi.fn(),
  useSocialGenerationMock: vi.fn(),
  useSocialPipelineRunnerMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  settingsHandleBrainModelChangeMock: vi.fn(),
  settingsHandleVisionModelChangeMock: vi.fn(),
  settingsHandleLinkedInConnectionChangeMock: vi.fn(),
  pipelineRunMock: vi.fn(),
  pipelineRunWithOverridesMock: vi.fn(),
  pipelineRunFreshMock: vi.fn(),
  runBatchCaptureMock: vi.fn(),
  patchMutateAsyncMock: vi.fn(),
  setImageAddonIdsMock: vi.fn(),
  setImageAssetsMock: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

vi.mock('./hooks/useSocialSettings', () => ({
  useSocialSettings: (...args: unknown[]) => useSocialSettingsMock(...args),
}));

vi.mock('./hooks/useSocialEditorSync', () => ({
  useSocialEditorSync: (...args: unknown[]) => useSocialEditorSyncMock(...args),
}));

vi.mock('./hooks/useSocialPostCrud', () => ({
  useSocialPostCrud: (...args: unknown[]) => useSocialPostCrudMock(...args),
}));

vi.mock('./hooks/useSocialImageAddons', () => ({
  useSocialImageAddons: (...args: unknown[]) => useSocialImageAddonsMock(...args),
}));

vi.mock('./hooks/useSocialContext', () => ({
  useSocialContext: (...args: unknown[]) => useSocialContextMock(...args),
}));

vi.mock('./hooks/useSocialGeneration', () => ({
  useSocialGeneration: (...args: unknown[]) => useSocialGenerationMock(...args),
}));

vi.mock('./hooks/useSocialPipelineRunner', () => ({
  useSocialPipelineRunner: (...args: unknown[]) => useSocialPipelineRunnerMock(...args),
}));

import { useAdminKangurSocialPage } from './AdminKangurSocialPage.hooks';

const basePost = {
  id: 'post-1',
  status: 'draft' as const,
  visualDocUpdates: [],
};

const createSettingsState = (overrides?: Record<string, unknown>) => ({
  linkedinConnectionId: 'conn-1',
  brainModelId: null,
  visionModelId: null,
  projectUrl: 'https://project.example.com',
  setProjectUrl: vi.fn(),
  batchCaptureBaseUrl: 'https://capture.example.com',
  setBatchCaptureBaseUrl: vi.fn(),
  batchCapturePresetIds: ['preset-1', 'preset-2'],
  batchCapturePresetLimit: 1,
  setBatchCapturePresetLimit: vi.fn(),
  isSettingsDirty: false,
  isSavingSettings: false,
  handleSaveSettings: vi.fn(),
  handleBrainModelChange: settingsHandleBrainModelChangeMock,
  handleVisionModelChange: settingsHandleVisionModelChangeMock,
  handleLinkedInConnectionChange: settingsHandleLinkedInConnectionChangeMock,
  handleToggleCapturePreset: vi.fn(),
  selectAllCapturePresets: vi.fn(),
  clearCapturePresets: vi.fn(),
  linkedinIntegration: null,
  linkedinConnections: [{ id: 'conn-1' }],
  brainModelOptions: { effectiveModelId: 'brain-routing' },
  visionModelOptions: { effectiveModelId: 'vision-routing' },
  persistedSocialSettings: {
    linkedinConnectionId: 'conn-1',
    brainModelId: null,
    visionModelId: null,
    batchCaptureBaseUrl: 'https://capture.example.com',
    batchCapturePresetIds: ['preset-1', 'preset-2'],
    batchCapturePresetLimit: 1,
    projectUrl: 'https://project.example.com',
  },
  ...overrides,
});

const createEditorState = (overrides?: Record<string, unknown>) => ({
  posts: [basePost],
  recentAddons: [],
  activePostId: 'post-1',
  setActivePostId: vi.fn(),
  activePost: basePost,
  editorState: {
    titlePl: 'Draft title',
    titleEn: 'Draft title',
    bodyPl: 'Polish body',
    bodyEn: 'English body',
  },
  setEditorState: vi.fn(),
  scheduledAt: '2026-03-27T12:30',
  setScheduledAt: vi.fn(),
  docReferenceInput: 'docs/intro.mdx',
  setDocReferenceInput: vi.fn(),
  generationNotes: 'Important note',
  setGenerationNotes: vi.fn(),
  imageAssets: [{ id: 'existing', url: '/existing.png' }],
  setImageAssets: setImageAssetsMock,
  imageAddonIds: ['addon-old'],
  setImageAddonIds: setImageAddonIdsMock,
  addonForm: {
    title: '',
    sourceUrl: '',
    selector: '',
    description: '',
    waitForMs: '',
  },
  setAddonForm: vi.fn(),
  showMediaLibrary: false,
  setShowMediaLibrary: vi.fn(),
  contextSummary: null,
  setContextSummary: vi.fn(),
  resolveDocReferences: () => ['docs/intro.mdx'],
  handleAddImages: vi.fn(),
  handleRemoveImage: vi.fn(),
  handleSelectAddon: vi.fn(),
  handleSelectAddons: vi.fn(),
  handleRemoveAddon: vi.fn(),
  postsQuery: { isLoading: false },
  addonsQuery: { isLoading: false },
  ...overrides,
});

describe('useAdminKangurSocialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patchMutateAsyncMock.mockResolvedValue({});
    pipelineRunMock.mockResolvedValue(undefined);
    pipelineRunWithOverridesMock.mockResolvedValue(undefined);
    pipelineRunFreshMock.mockResolvedValue(undefined);
    runBatchCaptureMock.mockResolvedValue({
      addons: [
        {
          id: 'addon-1',
          imageAsset: { id: 'asset-1', url: '/capture.png' },
        },
      ],
      failures: [],
      usedPresetCount: 1,
    });

    useSocialSettingsMock.mockReturnValue(createSettingsState());
    useSocialEditorSyncMock.mockReturnValue(createEditorState());
    useSocialPostCrudMock.mockReturnValue({
      saveMutation: {},
      patchMutation: { mutateAsync: patchMutateAsyncMock },
      deleteMutation: {},
      publishMutation: {},
      unpublishMutation: {},
      deleteError: null,
      clearDeleteError: vi.fn(),
      publishingPostId: null,
      unpublishingPostId: null,
      handleCreateDraft: vi.fn(),
      handleDeletePost: vi.fn(),
      handleQuickPublishPost: vi.fn(),
      handleUnpublishPost: vi.fn(),
      handleSave: vi.fn(),
      handlePublish: vi.fn(),
    });
    useSocialImageAddonsMock.mockReturnValue({
      createAddonMutation: {},
      batchCaptureMutation: {},
      batchCaptureResult: null,
      setBatchCaptureResult: vi.fn(),
      runBatchCapture: runBatchCaptureMock,
      handleCreateAddon: vi.fn(),
      handleBatchCapture: vi.fn(),
    });
    useSocialContextMock.mockReturnValue({
      contextLoading: false,
      handleLoadContext: vi.fn(),
    });
    useSocialGenerationMock.mockReturnValue({
      generateMutation: {},
      previewDocUpdatesMutation: {},
      applyDocUpdatesMutation: {},
      docUpdatesResult: null,
      setDocUpdatesResult: vi.fn(),
      handleGenerate: vi.fn(),
      handlePreviewDocUpdates: vi.fn(),
      handleApplyDocUpdates: vi.fn(),
    });
    useSocialPipelineRunnerMock.mockReturnValue({
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      isVisualAnalysisModalOpen: false,
      visualAnalysisResult: null,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      handleRunFullPipeline: pipelineRunMock,
      handleRunFullPipelineWithOverrides: pipelineRunWithOverridesMock,
      handleRunFullPipelineWithFreshCapture: pipelineRunFreshMock,
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleRunFullPipelineWithVisualAnalysis: vi.fn(),
    });
  });

  it('captures images, patches the draft, and exposes the success message', async () => {
    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleCaptureImagesOnly();
    });

    expect(runBatchCaptureMock).toHaveBeenCalledTimes(1);
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: {
        imageAddonIds: ['addon-old', 'addon-1'],
        imageAssets: [
          { id: 'existing', url: '/existing.png' },
          { id: 'asset-1', url: '/capture.png' },
        ],
      },
    });
    expect(setImageAddonIdsMock).toHaveBeenCalledWith(['addon-old', 'addon-1']);
    expect(setImageAssetsMock).toHaveBeenCalledWith([
      { id: 'existing', url: '/existing.png' },
      { id: 'asset-1', url: '/capture.png' },
    ]);
    expect(result.current.captureOnlyPending).toBe(false);
    expect(result.current.captureOnlyErrorMessage).toBeNull();
    expect(result.current.captureOnlyMessage).toBe(
      'Captured 1 screenshot from 1 preset and linked them to the draft.'
    );
  });

  it('runs programmable capture and then starts the pipeline with the fresh attachments', async () => {
    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleRunProgrammablePlaywrightCaptureAndPipeline();
    });

    expect(runBatchCaptureMock).toHaveBeenCalledWith({
      baseUrl: 'https://capture.example.com',
      presetIds: [],
      presetLimit: null,
      playwrightPersonaId: null,
      playwrightScript: expect.any(String),
      playwrightRoutes: expect.any(Array),
    });
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: {
        imageAddonIds: ['addon-old', 'addon-1'],
        imageAssets: [
          { id: 'existing', url: '/existing.png' },
          { id: 'asset-1', url: '/capture.png' },
        ],
      },
    });
    expect(pipelineRunWithOverridesMock).toHaveBeenCalledWith({
      imageAddonIds: ['addon-old', 'addon-1'],
      imageAssets: [
        { id: 'existing', url: '/existing.png' },
        { id: 'asset-1', url: '/capture.png' },
      ],
    });
    expect(result.current.programmableCapturePending).toBe(false);
    expect(result.current.programmableCaptureErrorMessage).toBeNull();
  });

  it('delegates settings telemetry wrappers and reports blocked capture state', async () => {
    useSocialSettingsMock.mockReturnValue(
      createSettingsState({
        linkedinConnectionId: null,
        batchCaptureBaseUrl: '',
        batchCapturePresetIds: [],
        brainModelOptions: { effectiveModelId: null },
        visionModelOptions: { effectiveModelId: null },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    expect(result.current.canGenerateSocialDraft).toBe(false);
    expect(result.current.canRunVisualAnalysisPipeline).toBe(false);
    expect(result.current.socialDraftBlockedReason).toContain('Choose a StudiQ Social post model');
    expect(result.current.socialVisionWarning).toContain('Visual analysis is not configured');

    act(() => {
      result.current.handleBrainModelChange('brain-override');
      result.current.handleVisionModelChange('vision-override');
      result.current.handleLinkedInConnectionChange('conn-2');
    });

    expect(settingsHandleBrainModelChangeMock).toHaveBeenCalledWith('brain-override');
    expect(settingsHandleVisionModelChangeMock).toHaveBeenCalledWith('vision-override');
    expect(settingsHandleLinkedInConnectionChangeMock).toHaveBeenCalledWith('conn-2');
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_model_select',
      expect.objectContaining({ nextModelId: 'brain-override' })
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_vision_model_select',
      expect.objectContaining({ nextVisionModelId: 'vision-override' })
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_connection_select',
      expect.objectContaining({ nextConnectionId: 'conn-2' })
    );

    await act(async () => {
      await result.current.handleCaptureImagesOnly();
    });

    expect(result.current.captureOnlyErrorMessage).toBe(
      'Set a batch capture base URL in Social Settings first.'
    );

    await act(async () => {
      await result.current.handleRunFullPipeline();
      await result.current.handleRunFullPipelineWithFreshCapture();
    });

    expect(pipelineRunMock).toHaveBeenCalledTimes(1);
    expect(pipelineRunFreshMock).toHaveBeenCalledTimes(1);
    expect(runBatchCaptureMock).not.toHaveBeenCalled();
  });
});
