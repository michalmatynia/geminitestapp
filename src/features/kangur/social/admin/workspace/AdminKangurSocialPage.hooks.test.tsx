/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/social/shared/social-capture-presets';
import {
  buildKangurSocialProgrammableCaptureRoutesFromPresetIds,
  KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
} from '@/features/kangur/social/shared/social-playwright-capture';

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
  toastMock,
  settingsHandleBrainModelChangeMock,
  settingsHandleVisionModelChangeMock,
  settingsHandleLinkedInConnectionChangeMock,
  settingsHandleSaveProgrammableCaptureDefaultsMock,
  pipelineRunMock,
  pipelineRunWithOverridesMock,
  pipelineRunFreshMock,
  startBatchCaptureMock,
  readBatchCaptureJobMock,
  patchMutateAsyncMock,
  addonsQueryRefetchMock,
  postsQueryRefetchMock,
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
  toastMock: vi.fn(),
  settingsHandleBrainModelChangeMock: vi.fn(),
  settingsHandleVisionModelChangeMock: vi.fn(),
  settingsHandleLinkedInConnectionChangeMock: vi.fn(),
  settingsHandleSaveProgrammableCaptureDefaultsMock: vi.fn(),
  pipelineRunMock: vi.fn(),
  pipelineRunWithOverridesMock: vi.fn(),
  pipelineRunFreshMock: vi.fn(),
  startBatchCaptureMock: vi.fn(),
  readBatchCaptureJobMock: vi.fn(),
  patchMutateAsyncMock: vi.fn(),
  addonsQueryRefetchMock: vi.fn(),
  postsQueryRefetchMock: vi.fn(),
  setImageAddonIdsMock: vi.fn(),
  setImageAssetsMock: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
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
};

const createBatchCaptureJob = (overrides?: Record<string, unknown>) => ({
  id: 'job-1',
  runId: 'run-1',
  status: 'queued',
  progress: {
    processedCount: 0,
    completedCount: 0,
    failureCount: 0,
    remainingCount: 1,
    totalCount: 1,
    message: 'Queued Playwright capture...',
  },
  result: null,
  error: null,
  createdAt: '2026-03-29T10:00:00.000Z',
  updatedAt: '2026-03-29T10:00:00.000Z',
  ...overrides,
});

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
  handleSaveProgrammableCaptureDefaults: settingsHandleSaveProgrammableCaptureDefaultsMock,
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
      programmableCaptureBaseUrl: null,
      programmableCapturePersonaId: null,
      programmableCaptureScript: 'return input.captures;',
      programmableCaptureRoutes: [],
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
  missingSelectedImageAddonIds: [],
  handleRemoveMissingAddons: vi.fn(),
  postsQuery: { isLoading: false, refetch: postsQueryRefetchMock },
  addonsQuery: { isLoading: false, refetch: addonsQueryRefetchMock },
  ...overrides,
});

describe('useAdminKangurSocialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patchMutateAsyncMock.mockResolvedValue({});
    addonsQueryRefetchMock.mockResolvedValue(undefined);
    postsQueryRefetchMock.mockResolvedValue(undefined);
    pipelineRunMock.mockResolvedValue(undefined);
    pipelineRunWithOverridesMock.mockResolvedValue(undefined);
    pipelineRunFreshMock.mockResolvedValue(undefined);
    startBatchCaptureMock.mockResolvedValue(createBatchCaptureJob());
    readBatchCaptureJobMock.mockResolvedValue(
      createBatchCaptureJob({
        status: 'completed',
        progress: {
          processedCount: 1,
          completedCount: 1,
          failureCount: 0,
          remainingCount: 0,
          totalCount: 1,
          message: 'Playwright capture completed.',
        },
        result: {
          addons: [
            {
              id: 'addon-1',
              imageAsset: { id: 'asset-1', url: '/capture.png' },
            },
          ],
          failures: [],
          usedPresetCount: 1,
          runId: 'run-1',
        },
      })
    );
    settingsHandleSaveProgrammableCaptureDefaultsMock.mockResolvedValue(true);

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
      batchCapturePending: false,
      batchCaptureJob: null,
      batchCaptureMessage: null,
      batchCaptureErrorMessage: null,
      captureAppearanceMode: 'default',
      setBatchCaptureResult: vi.fn(),
      startBatchCapture: startBatchCaptureMock,
      readBatchCaptureJob: readBatchCaptureJobMock,
      runBatchCapture: vi.fn(),
      handleCreateAddon: vi.fn(),
      handleBatchCapture: vi.fn(),
    });
    useSocialContextMock.mockReturnValue({
      contextLoading: false,
      handleLoadContext: vi.fn(),
    });
    useSocialGenerationMock.mockReturnValue({
      generateMutation: {},
      handleGenerate: vi.fn(),
      handleGenerateWithVisualAnalysis: vi.fn(),
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
    useSocialEditorSyncMock.mockReturnValue(
      createEditorState({
        recentAddons: [
          {
            id: 'addon-old',
            title: 'Old game capture',
            presetId: 'game',
            playwrightCaptureRouteId: 'game',
            imageAsset: { id: 'existing', url: '/existing.png' },
          },
        ],
      })
    );
    readBatchCaptureJobMock.mockResolvedValueOnce(
      createBatchCaptureJob({
        status: 'completed',
        result: {
          addons: [
            {
              id: 'addon-1',
              title: 'Latest game capture',
              presetId: 'game',
              playwrightCaptureRouteId: 'game',
              imageAsset: { id: 'asset-1', url: '/capture.png' },
            },
          ],
          failures: [],
          usedPresetCount: 1,
          runId: 'run-1',
        },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    expect(result.current.captureAppearanceMode).toBe('default');
    await act(async () => {
      await result.current.handleCaptureImagesOnly();
    });

    expect(startBatchCaptureMock).toHaveBeenCalledTimes(1);
    expect(readBatchCaptureJobMock).toHaveBeenCalledWith('job-1');
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: {
        imageAddonIds: ['addon-1'],
        imageAssets: [{ id: 'asset-1', url: '/capture.png' }],
      },
    });
    expect(setImageAddonIdsMock).toHaveBeenCalledWith(['addon-1']);
    expect(setImageAssetsMock).toHaveBeenCalledWith([{ id: 'asset-1', url: '/capture.png' }]);
    expect(result.current.captureOnlyPending).toBe(false);
    expect(result.current.captureOnlyBatchCaptureJob).toEqual(
      expect.objectContaining({
        id: 'job-1',
        status: 'completed',
      })
    );
    expect(result.current.captureOnlyErrorMessage).toBeNull();
    expect(result.current.captureOnlyMessage).toBe(
      'Captured 1 screenshot from 1 preset and linked them to the draft.'
    );
  });

  it('refreshes the selected image add-ons and active posts when missing add-ons are reported', async () => {
    useSocialEditorSyncMock.mockReturnValue(
      createEditorState({
        imageAddonIds: ['addon-1', 'addon-missing'],
        missingSelectedImageAddonIds: ['addon-missing'],
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleRefreshMissingImageAddons();
    });

    expect(addonsQueryRefetchMock).toHaveBeenCalledTimes(1);
    expect(postsQueryRefetchMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith('Refreshed image add-ons for the current draft.', {
      variant: 'success',
    });
    expect(result.current.missingImageAddonActionPending).toBeNull();
    expect(result.current.missingImageAddonActionErrorMessage).toBeNull();
  });

  it('persists removal of missing selected image add-ons back to the active post', async () => {
    useSocialEditorSyncMock.mockReturnValue(
      createEditorState({
        recentAddons: [
          {
            id: 'addon-old',
            title: 'Old game capture',
            presetId: 'game',
            playwrightCaptureRouteId: 'game',
            imageAsset: { id: 'existing', url: '/existing.png' },
          },
        ],
        imageAssets: [
          { id: 'existing', url: '/existing.png' },
          { id: 'manual-1', url: '/manual.png' },
        ],
        imageAddonIds: ['addon-old', 'addon-missing'],
        missingSelectedImageAddonIds: ['addon-missing'],
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleRemoveMissingAddons();
    });

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: {
        imageAddonIds: ['addon-old'],
        imageAssets: [
          { id: 'existing', url: '/existing.png' },
          { id: 'manual-1', url: '/manual.png' },
        ],
      },
    });
    expect(setImageAddonIdsMock).toHaveBeenCalledWith(['addon-old']);
    expect(setImageAssetsMock).toHaveBeenCalledWith([
      { id: 'existing', url: '/existing.png' },
      { id: 'manual-1', url: '/manual.png' },
    ]);
    expect(toastMock).toHaveBeenCalledWith(
      'Removed 1 missing image add-on from the current draft.',
      { variant: 'success' }
    );
    expect(result.current.missingImageAddonActionPending).toBeNull();
    expect(result.current.missingImageAddonActionErrorMessage).toBeNull();
  });

  it('surfaces partial capture failures alongside the successful attachment message', async () => {
    readBatchCaptureJobMock.mockResolvedValueOnce(
      createBatchCaptureJob({
        status: 'completed',
        progress: {
          processedCount: 2,
          completedCount: 1,
          failureCount: 1,
          remainingCount: 0,
          totalCount: 2,
          message: 'Captured 1 screenshot across 2 targets. 1 failed.',
        },
        result: {
          addons: [
            {
              id: 'addon-1',
              imageAsset: { id: 'asset-1', url: '/capture.png' },
            },
          ],
          failures: [{ id: 'game', reason: 'capture_failed' }],
          usedPresetCount: 2,
          runId: 'run-1',
        },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleCaptureImagesOnly();
    });

    expect(result.current.captureOnlyErrorMessage).toBeNull();
    expect(result.current.captureOnlyMessage).toBe(
      'Captured 1 screenshot from 2 presets and linked them to the draft. Failed: Kangur Game Home: Capture failed.'
    );
  });

  it('treats zero successful screenshots as a capture error with failed target details', async () => {
    readBatchCaptureJobMock.mockResolvedValueOnce(
      createBatchCaptureJob({
        status: 'completed',
        progress: {
          processedCount: 1,
          completedCount: 0,
          failureCount: 1,
          remainingCount: 0,
          totalCount: 1,
          message: 'Capture finished with 1 failure.',
        },
        result: {
          addons: [],
          failures: [{ id: 'game', reason: 'Timeout waiting for route shell' }],
          usedPresetCount: 1,
          runId: 'run-1',
        },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleCaptureImagesOnly();
    });

    expect(patchMutateAsyncMock).not.toHaveBeenCalled();
    expect(result.current.captureOnlyMessage).toBeNull();
    expect(result.current.captureOnlyErrorMessage).toBe(
      'Failed to capture screenshots. Failures: Kangur Game Home: Timeout waiting for route shell.'
    );
  });

  it('runs programmable capture and then starts the pipeline with the fresh attachments', async () => {
    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleRunProgrammablePlaywrightCaptureAndPipeline();
    });

    expect(startBatchCaptureMock).toHaveBeenCalledWith({
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
        imageAddonIds: ['addon-1', 'addon-old'],
        imageAssets: [
          { id: 'asset-1', url: '/capture.png' },
          { id: 'existing', url: '/existing.png' },
        ],
      },
    });
    expect(pipelineRunWithOverridesMock).toHaveBeenCalledWith({
      imageAddonIds: ['addon-1', 'addon-old'],
      imageAssets: [
        { id: 'asset-1', url: '/capture.png' },
        { id: 'existing', url: '/existing.png' },
      ],
    });
    expect(result.current.programmableCaptureBatchCaptureJob).toEqual(
      expect.objectContaining({
        id: 'job-1',
        status: 'completed',
      })
    );
    expect(result.current.programmableCapturePending).toBe(false);
    expect(result.current.programmableCaptureErrorMessage).toBeNull();
  });

  it('routes Generate post with analysis through the dedicated generation hook', async () => {
    const handleCloseVisualAnalysisModalMock = vi.fn();
    const handleGenerateWithVisualAnalysisMock = vi.fn().mockResolvedValue(true);
    const visualAnalysisResult = {
      summary: 'Hero card is larger and the CTA is clearer.',
      highlights: ['Larger hero card', 'Clearer CTA'],
    };

    useSocialGenerationMock.mockReturnValue({
      generateMutation: {},
      handleGenerate: vi.fn(),
      handleGenerateWithVisualAnalysis: handleGenerateWithVisualAnalysisMock,
    });
    useSocialPipelineRunnerMock.mockReturnValue({
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      isVisualAnalysisModalOpen: true,
      visualAnalysisResult,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      handleRunFullPipeline: pipelineRunMock,
      handleRunFullPipelineWithOverrides: pipelineRunWithOverridesMock,
      handleRunFullPipelineWithFreshCapture: pipelineRunFreshMock,
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCloseVisualAnalysisModal: handleCloseVisualAnalysisModalMock,
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleRunFullPipelineWithVisualAnalysis: vi.fn(),
    });

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleGeneratePostWithVisualAnalysis();
    });

    expect(handleCloseVisualAnalysisModalMock).toHaveBeenCalledTimes(1);
    expect(handleGenerateWithVisualAnalysisMock).toHaveBeenCalledWith(visualAnalysisResult);
    expect(pipelineRunMock).not.toHaveBeenCalled();
    expect(pipelineRunWithOverridesMock).not.toHaveBeenCalled();
    expect(pipelineRunFreshMock).not.toHaveBeenCalled();
  });

  it('keeps the image-analysis modal open when the dedicated generation step fails', async () => {
    const handleCloseVisualAnalysisModalMock = vi.fn();
    const handleGenerateWithVisualAnalysisMock = vi.fn().mockResolvedValue(false);
    const visualAnalysisResult = {
      summary: 'Hero card is larger and the CTA is clearer.',
      highlights: ['Larger hero card', 'Clearer CTA'],
    };

    useSocialGenerationMock.mockReturnValue({
      generateMutation: {},
      handleGenerate: vi.fn(),
      handleGenerateWithVisualAnalysis: handleGenerateWithVisualAnalysisMock,
    });
    useSocialPipelineRunnerMock.mockReturnValue({
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      isVisualAnalysisModalOpen: true,
      visualAnalysisResult,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      handleRunFullPipeline: pipelineRunMock,
      handleRunFullPipelineWithOverrides: pipelineRunWithOverridesMock,
      handleRunFullPipelineWithFreshCapture: pipelineRunFreshMock,
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCloseVisualAnalysisModal: handleCloseVisualAnalysisModalMock,
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleRunFullPipelineWithVisualAnalysis: vi.fn(),
    });

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleGeneratePostWithVisualAnalysis();
    });

    expect(handleGenerateWithVisualAnalysisMock).toHaveBeenCalledWith(visualAnalysisResult);
    expect(handleCloseVisualAnalysisModalMock).not.toHaveBeenCalled();
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
    expect(startBatchCaptureMock).not.toHaveBeenCalled();
  });

  it('resets saved programmable defaults and restores the local advanced-capture draft state', async () => {
    const presetIds = KANGUR_SOCIAL_CAPTURE_PRESETS.slice(0, 2).map((preset) => preset.id);
    useSocialSettingsMock.mockReturnValue(
      createSettingsState({
        batchCaptureBaseUrl: 'https://capture.example.com',
        batchCapturePresetIds: presetIds,
        persistedSocialSettings: {
          linkedinConnectionId: 'conn-1',
          brainModelId: null,
          visionModelId: null,
          batchCaptureBaseUrl: 'https://capture.example.com',
          batchCapturePresetIds: presetIds,
          batchCapturePresetLimit: 1,
          programmableCaptureBaseUrl: 'https://programmable.example.com',
          programmableCapturePersonaId: 'persona-fast',
          programmableCaptureScript: 'return input.captures.filter(Boolean);',
          programmableCaptureRoutes: [
            {
              id: 'route-1',
              title: 'Pricing page',
              path: '/pricing',
              description: 'Capture pricing hero',
              selector: '[data-pricing]',
              waitForMs: 200,
              waitForSelectorMs: 3000,
            },
          ],
          projectUrl: 'https://project.example.com',
        },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    await act(async () => {
      await result.current.handleResetProgrammableCaptureDefaults();
    });

    expect(settingsHandleSaveProgrammableCaptureDefaultsMock).toHaveBeenCalledWith({
      baseUrl: null,
      personaId: null,
      script: KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
      routes: [],
    });
    expect(result.current.programmableCaptureBaseUrl).toBe('https://capture.example.com');
    expect(result.current.programmableCapturePersonaId).toBe('');
    expect(result.current.programmableCaptureScript).toBe(
      KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
    );
    expect(result.current.programmableCaptureRoutes).toEqual(
      buildKangurSocialProgrammableCaptureRoutesFromPresetIds(presetIds)
    );
    expect(result.current.programmableCaptureMessage).toBeNull();
    expect(result.current.programmableCaptureErrorMessage).toBeNull();
  });

  it('opens the programmable editor from Settings with persisted defaults instead of stale local edits', async () => {
    const presetIds = KANGUR_SOCIAL_CAPTURE_PRESETS.slice(0, 2).map((preset) => preset.id);
    useSocialSettingsMock.mockReturnValue(
      createSettingsState({
        batchCaptureBaseUrl: 'https://capture.example.com',
        batchCapturePresetIds: presetIds,
        persistedSocialSettings: {
          linkedinConnectionId: 'conn-1',
          brainModelId: null,
          visionModelId: null,
          batchCaptureBaseUrl: 'https://capture.example.com',
          batchCapturePresetIds: presetIds,
          batchCapturePresetLimit: 1,
          programmableCaptureBaseUrl: 'https://saved.example.com',
          programmableCapturePersonaId: 'persona-fast',
          programmableCaptureScript: 'return input.captures.filter(Boolean);',
          programmableCaptureRoutes: [
            {
              id: 'route-saved',
              title: 'Saved route',
              path: '/saved',
              description: 'Saved route description',
              selector: '[data-saved]',
              waitForMs: 100,
              waitForSelectorMs: 2500,
            },
          ],
          projectUrl: 'https://project.example.com',
        },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    act(() => {
      result.current.setProgrammableCaptureBaseUrl('https://dirty.example.com');
      result.current.setProgrammableCapturePersonaId('persona-dirty');
      result.current.setProgrammableCaptureScript('return ["dirty"];');
      result.current.handleAddProgrammableCaptureRoute();
    });

    act(() => {
      result.current.handleOpenProgrammablePlaywrightModalFromDefaults();
    });

    expect(result.current.programmableCaptureBaseUrl).toBe('https://saved.example.com');
    expect(result.current.programmableCapturePersonaId).toBe('persona-fast');
    expect(result.current.programmableCaptureScript).toBe(
      'return input.captures.filter(Boolean);'
    );
    expect(result.current.programmableCaptureRoutes).toEqual([
      {
        id: 'route-saved',
        title: 'Saved route',
        path: '/saved',
        description: 'Saved route description',
        selector: '[data-saved]',
        waitForMs: 100,
        waitForSelectorMs: 2500,
      },
    ]);
    expect(result.current.isProgrammablePlaywrightModalOpen).toBe(true);
  });

  it('seeds programmable routes from the selected minigame presets', () => {
    const presetIds = ['clock-quiz', 'calendar-quiz', 'geometry-quiz'];
    useSocialSettingsMock.mockReturnValue(
      createSettingsState({
        batchCapturePresetIds: presetIds,
        persistedSocialSettings: {
          linkedinConnectionId: 'conn-1',
          brainModelId: null,
          visionModelId: null,
          batchCaptureBaseUrl: 'https://capture.example.com',
          batchCapturePresetIds: presetIds,
          batchCapturePresetLimit: 2,
          programmableCaptureBaseUrl: null,
          programmableCapturePersonaId: null,
          programmableCaptureScript: KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
          programmableCaptureRoutes: [],
          projectUrl: 'https://project.example.com',
        },
      })
    );

    const { result } = renderHook(() => useAdminKangurSocialPage());

    act(() => {
      result.current.handleAddProgrammableCaptureRoute();
      result.current.handleUpdateProgrammableCaptureRoute('route-1', {
        title: 'Dirty route',
        path: '/dirty',
      });
      result.current.handleSeedProgrammableCaptureRoutesFromPresets();
    });

    expect(result.current.programmableCaptureRoutes).toEqual(
      buildKangurSocialProgrammableCaptureRoutesFromPresetIds(presetIds)
    );
  });
});
