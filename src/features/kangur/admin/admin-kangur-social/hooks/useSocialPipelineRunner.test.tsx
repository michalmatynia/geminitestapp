/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiGetMock,
  apiPostMock,
  completedVisualAnalysis,
  createWrapper,
  logKangurClientErrorMock,
  toastMock,
  trackKangurClientEventMock,
  useSocialPipelineRunner,
} from './useSocialPipelineRunner.test-support';

describe('useSocialPipelineRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues the manual server job and syncs the completed result back into the editor state', async () => {
    apiPostMock.mockResolvedValue({
      success: true,
      jobId: 'job-1',
      jobType: 'manual-post-pipeline',
    });
    apiGetMock.mockResolvedValue({
      id: 'job-1',
      status: 'completed',
      progress: {
        type: 'manual-post-pipeline',
        step: 'previewing',
        captureMode: 'existing_assets',
        message: 'Preparing documentation diff...',
        updatedAt: 1_700_000_000_500,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 1,
        captureFailureCount: 0,
        captureFailures: [],
        requestedPresetCount: 0,
        usedPresetCount: 0,
        usedPresetIds: [],
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 0,
        runId: 'run-1',
      },
      failedReason: null,
      result: {
        type: 'manual-post-pipeline',
        postId: 'post-1',
        captureMode: 'existing_assets',
        addonsCreated: 1,
        failures: 0,
        runId: 'run-1',
        contextSummary: 'summary',
        contextDocCount: 1,
        imageAddonIds: ['addon-1'],
        imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
        batchCaptureResult: {
          addons: [{ id: 'addon-1', title: 'Addon 1' }],
          failures: [],
          runId: 'run-1',
        },
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated PL',
          titleEn: 'Generated EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        docUpdates: {
          applied: false,
          plan: { items: [], files: [] },
          post: { id: 'post-1' },
        },
      },
    });

    const setActivePostId = vi.fn();
    const setContextSummary = vi.fn();
    const setEditorState = vi.fn();
    const setImageAddonIds = vi.fn();
    const setImageAssets = vi.fn();
    const setDocUpdatesResult = vi.fn();
    const setBatchCaptureResult = vi.fn();
    const handleSelectAddons = vi.fn();

    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: [],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          batchCapturePresetLimit: 1,
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          canRunServerPipeline: true,
          pipelineBlockedReason: null,
          canRunVisualAnalysisPipeline: true,
          visualAnalysisBlockedReason: null,
          projectUrl: 'https://example.com/project',
          generationNotes: 'Note',
          resolveDocReferences: () => ['docs/kangur/example.mdx'],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setContextSummary,
          setActivePostId,
          setEditorState,
          setImageAddonIds,
          setImageAssets,
          setDocUpdatesResult,
          setBatchCaptureResult,
          handleSelectAddons,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleRunFullPipeline();
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/social-pipeline/trigger',
      expect.objectContaining({
        jobType: 'manual-post-pipeline',
        input: expect.objectContaining({
          postId: 'post-1',
          captureMode: 'existing_assets',
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
        }),
      }),
      expect.any(Object)
    );
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
      params: { id: 'job-1' },
      timeout: 60_000,
    });
    expect(setActivePostId).toHaveBeenCalledWith('post-1');
    expect(setContextSummary).toHaveBeenCalledWith('summary');
    expect(setEditorState).toHaveBeenCalledWith({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Body PL',
      bodyEn: 'Body EN',
    });
    expect(setImageAddonIds).toHaveBeenCalledWith(['addon-1']);
    expect(setImageAssets).toHaveBeenCalledWith([{ id: 'asset-1', url: '/asset-1.png' }]);
    expect(setBatchCaptureResult).toHaveBeenCalledWith({
      addons: [{ id: 'addon-1', title: 'Addon 1' }],
      failures: [],
      runId: 'run-1',
    });
    expect(handleSelectAddons).toHaveBeenCalledWith([
      { id: 'addon-1', title: 'Addon 1' },
    ]);
    expect(result.current.pipelineProgress).toEqual({
      type: 'manual-post-pipeline',
      step: 'previewing',
      captureMode: 'existing_assets',
      message: 'Preparing documentation diff...',
      updatedAt: 1_700_000_000_500,
      contextDocCount: 1,
      contextSummary: 'summary',
      addonsCreated: 1,
      captureFailureCount: 0,
      captureFailures: [],
      requestedPresetCount: 0,
      usedPresetCount: 0,
      usedPresetIds: [],
      captureCompletedCount: 0,
      captureRemainingCount: 0,
      captureTotalCount: 0,
      runId: 'run-1',
    });
    expect(result.current.pipelineErrorMessage).toBeNull();
    expect(result.current.pipelineStep).toBe('done');
  });

  it('sends fresh capture settings when the capture-backed pipeline is requested', async () => {
    apiPostMock.mockResolvedValue({
      success: true,
      jobId: 'job-2',
      jobType: 'manual-post-pipeline',
    });
    apiGetMock.mockResolvedValue({
      id: 'job-2',
      status: 'completed',
      progress: {
        type: 'manual-post-pipeline',
        step: 'previewing',
        captureMode: 'fresh_capture',
        message: 'Preparing documentation diff...',
        updatedAt: 1_700_000_000_900,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 2,
        captureFailureCount: 0,
        captureFailures: [],
        requestedPresetCount: 3,
        usedPresetCount: 2,
        usedPresetIds: ['preset-1', 'preset-2'],
        captureCompletedCount: 2,
        captureRemainingCount: 0,
        captureTotalCount: 2,
        runId: 'run-2',
      },
      failedReason: null,
      result: {
        type: 'manual-post-pipeline',
        postId: 'post-1',
        captureMode: 'fresh_capture',
        addonsCreated: 2,
        failures: 0,
        runId: 'run-2',
        contextSummary: 'summary',
        contextDocCount: 1,
        imageAddonIds: ['addon-2'],
        imageAssets: [{ id: 'asset-2', url: '/asset-2.png' }],
        batchCaptureResult: {
          addons: [{ id: 'addon-2', title: 'Addon 2' }],
          failures: [],
          runId: 'run-2',
          requestedPresetCount: 3,
          usedPresetCount: 2,
          usedPresetIds: ['preset-1', 'preset-2'],
        },
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated PL',
          titleEn: 'Generated EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        docUpdates: null,
      },
    });

    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: ['addon-old'],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1', 'preset-2', 'preset-3'],
          batchCapturePresetLimit: 2,
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          canRunServerPipeline: true,
          pipelineBlockedReason: null,
          canRunVisualAnalysisPipeline: true,
          visualAnalysisBlockedReason: null,
          projectUrl: 'https://example.com/project',
          generationNotes: 'Note',
          resolveDocReferences: () => [],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setContextSummary: vi.fn(),
          setActivePostId: vi.fn(),
          setEditorState: vi.fn(),
          setImageAddonIds: vi.fn(),
          setImageAssets: vi.fn(),
          setDocUpdatesResult: vi.fn(),
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleRunFullPipelineWithFreshCapture();
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/social-pipeline/trigger',
      expect.objectContaining({
        input: expect.objectContaining({
          captureMode: 'fresh_capture',
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1', 'preset-2', 'preset-3'],
          batchCapturePresetLimit: 2,
        }),
      }),
      expect.any(Object)
    );
  });

  it('runs visual analysis first and then queues the pipeline with the prefetched analysis', async () => {
    apiPostMock
      .mockResolvedValueOnce({
        success: true,
        jobId: 'job-visual-analysis-1',
        jobType: 'manual-post-visual-analysis',
      })
      .mockResolvedValueOnce({
        success: true,
        jobId: 'job-visual-1',
        jobType: 'manual-post-pipeline',
      });
    apiGetMock
      .mockResolvedValueOnce({
        id: 'job-visual-analysis-1',
        status: 'completed',
        failedReason: null,
        result: {
          type: 'manual-post-visual-analysis',
          analysis: completedVisualAnalysis,
          savedPost: null,
        },
      })
      .mockResolvedValueOnce({
      id: 'job-visual-1',
      status: 'completed',
      progress: {
        type: 'manual-post-pipeline',
        step: 'previewing',
        captureMode: 'existing_assets',
        message: 'Preparing documentation diff...',
        updatedAt: 1_700_000_001_500,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 0,
        captureFailureCount: 0,
        captureFailures: [],
        requestedPresetCount: 0,
        usedPresetCount: 0,
        usedPresetIds: [],
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 0,
        runId: null,
      },
      failedReason: null,
      result: {
        type: 'manual-post-pipeline',
        postId: 'post-1',
        captureMode: 'existing_assets',
        addonsCreated: 0,
        failures: 0,
        runId: null,
        contextSummary: 'summary',
        contextDocCount: 1,
        imageAddonIds: ['addon-1'],
        imageAssets: [],
        batchCaptureResult: null,
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated PL',
          titleEn: 'Generated EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        docUpdates: null,
      },
      });

    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: ['addon-1'],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          batchCapturePresetLimit: 1,
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          canRunServerPipeline: true,
          pipelineBlockedReason: null,
          canRunVisualAnalysisPipeline: true,
          visualAnalysisBlockedReason: null,
          projectUrl: 'https://example.com/project',
          generationNotes: 'Call out the updated hero.',
          resolveDocReferences: () => ['docs/kangur/example.mdx'],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setContextSummary: vi.fn(),
          setActivePostId: vi.fn(),
          setEditorState: vi.fn(),
          setImageAddonIds: vi.fn(),
          setImageAssets: vi.fn(),
          setDocUpdatesResult: vi.fn(),
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {});

    act(() => {
      result.current.handleOpenVisualAnalysisModal();
    });
    expect(result.current.isVisualAnalysisModalOpen).toBe(true);

    await act(async () => {
      await result.current.handleAnalyzeSelectedVisuals();
    });

    expect(apiPostMock).toHaveBeenNthCalledWith(
      1,
      '/api/kangur/social-posts/analyze-visuals',
      expect.objectContaining({
        postId: 'post-1',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
      }),
      expect.any(Object)
    );
    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);

    await act(async () => {
      await result.current.handleRunFullPipelineWithVisualAnalysis();
    });

    expect(apiPostMock).toHaveBeenNthCalledWith(
      2,
      '/api/kangur/social-pipeline/trigger',
      expect.objectContaining({
        input: expect.objectContaining({
          captureMode: 'existing_assets',
          prefetchedVisualAnalysis: completedVisualAnalysis,
          requireVisualAnalysisInBody: true,
        }),
      }),
      expect.any(Object)
    );
  });

  it('preserves the last analysis result when the modal is reopened for the same inputs', async () => {
    apiPostMock.mockResolvedValueOnce({
      success: true,
      jobId: 'job-visual-analysis-2',
      jobType: 'manual-post-visual-analysis',
    });
    apiGetMock.mockResolvedValueOnce({
      id: 'job-visual-analysis-2',
      status: 'completed',
      failedReason: null,
      result: {
        type: 'manual-post-visual-analysis',
        analysis: completedVisualAnalysis,
        savedPost: null,
      },
    });

    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: ['addon-1'],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          batchCapturePresetLimit: 1,
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          canRunServerPipeline: true,
          pipelineBlockedReason: null,
          canRunVisualAnalysisPipeline: true,
          visualAnalysisBlockedReason: null,
          projectUrl: 'https://example.com/project',
          generationNotes: 'Call out the updated hero.',
          resolveDocReferences: () => ['docs/kangur/example.mdx'],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setContextSummary: vi.fn(),
          setActivePostId: vi.fn(),
          setEditorState: vi.fn(),
          setImageAddonIds: vi.fn(),
          setImageAssets: vi.fn(),
          setDocUpdatesResult: vi.fn(),
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {});

    act(() => {
      result.current.handleOpenVisualAnalysisModal();
    });

    await act(async () => {
      await result.current.handleAnalyzeSelectedVisuals();
    });

    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);

    act(() => {
      result.current.handleCloseVisualAnalysisModal();
    });
    expect(result.current.isVisualAnalysisModalOpen).toBe(false);
    expect(result.current.visualAnalysisResult).not.toBeNull();

    act(() => {
      result.current.handleOpenVisualAnalysisModal();
    });
    expect(result.current.isVisualAnalysisModalOpen).toBe(true);
    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);
  });

  it('invalidates the transient analysis result when the analysis inputs change', async () => {
    apiPostMock.mockResolvedValueOnce({
      success: true,
      jobId: 'job-visual-analysis-3',
      jobType: 'manual-post-visual-analysis',
    });
    apiGetMock.mockResolvedValueOnce({
      id: 'job-visual-analysis-3',
      status: 'completed',
      failedReason: null,
      result: {
        type: 'manual-post-visual-analysis',
        analysis: completedVisualAnalysis,
        savedPost: null,
      },
    });

    const baseArgs = {
      activePost: {
        id: 'post-1',
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
        status: 'draft',
      } as never,
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
      },
      imageAssets: [],
      imageAddonIds: ['addon-1'],
      batchCaptureBaseUrl: 'https://example.com',
      batchCapturePresetIds: ['preset-1'],
      batchCapturePresetLimit: 1,
      linkedinConnectionId: null,
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
      canRunServerPipeline: true,
      pipelineBlockedReason: null,
      canRunVisualAnalysisPipeline: true,
      visualAnalysisBlockedReason: null,
      projectUrl: 'https://example.com/project',
      generationNotes: 'Call out the updated hero.',
      resolveDocReferences: () => ['docs/kangur/example.mdx'],
      buildSocialContext: () => ({ postId: 'post-1' }),
      handleLoadContext: vi.fn(),
      setContextSummary: vi.fn(),
      setActivePostId: vi.fn(),
      setEditorState: vi.fn(),
      setImageAddonIds: vi.fn(),
      setImageAssets: vi.fn(),
      setDocUpdatesResult: vi.fn(),
      setBatchCaptureResult: vi.fn(),
      handleSelectAddons: vi.fn(),
    };

    const { result, rerender } = renderHook(
      (args: typeof baseArgs) => useSocialPipelineRunner(args),
      {
        initialProps: baseArgs,
        wrapper: createWrapper(),
      }
    );

    await act(async () => {});

    await act(async () => {
      await result.current.handleAnalyzeSelectedVisuals();
    });

    expect(result.current.visualAnalysisResult).not.toBeNull();

    rerender({
      ...baseArgs,
      imageAddonIds: ['addon-1', 'addon-2'],
    });

    expect(result.current.visualAnalysisResult).toBeNull();
  });

  it('retains the saved draft analysis when switching away from a post and back again', async () => {
    apiPostMock.mockResolvedValueOnce({
      success: true,
      jobId: 'job-visual-retained-1',
      jobType: 'manual-post-pipeline',
    });
    apiGetMock.mockResolvedValueOnce({
      id: 'job-visual-retained-1',
      status: 'completed',
      progress: {
        type: 'manual-post-pipeline',
        step: 'previewing',
        captureMode: 'existing_assets',
        message: 'Preparing documentation diff...',
        updatedAt: 1_700_000_002_000,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 0,
        captureFailureCount: 0,
        captureFailures: [],
        requestedPresetCount: 0,
        usedPresetCount: 0,
        usedPresetIds: [],
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 0,
        runId: null,
      },
      failedReason: null,
      result: {
        type: 'manual-post-pipeline',
        postId: 'post-1',
        captureMode: 'existing_assets',
        addonsCreated: 0,
        failures: 0,
        runId: null,
        contextSummary: 'summary',
        contextDocCount: 1,
        imageAddonIds: ['addon-1'],
        imageAssets: [],
        batchCaptureResult: null,
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated PL',
          titleEn: 'Generated EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        docUpdates: null,
      },
    });

    const baseArgs = {
      activePost: {
        id: 'post-1',
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
        status: 'draft',
        visualSummary: completedVisualAnalysis.summary,
        visualHighlights: [...completedVisualAnalysis.highlights],
        visualDocUpdates: [],
      } as never,
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
      },
      imageAssets: [],
      imageAddonIds: ['addon-1'],
      batchCaptureBaseUrl: 'https://example.com',
      batchCapturePresetIds: ['preset-1'],
      batchCapturePresetLimit: 1,
      linkedinConnectionId: null,
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
      canRunServerPipeline: true,
      pipelineBlockedReason: null,
      canRunVisualAnalysisPipeline: true,
      visualAnalysisBlockedReason: null,
      projectUrl: 'https://example.com/project',
      generationNotes: 'Call out the updated hero.',
      resolveDocReferences: () => ['docs/kangur/example.mdx'],
      buildSocialContext: () => ({ postId: 'post-1' }),
      handleLoadContext: vi.fn(),
      setContextSummary: vi.fn(),
      setActivePostId: vi.fn(),
      setEditorState: vi.fn(),
      setImageAddonIds: vi.fn(),
      setImageAssets: vi.fn(),
      setDocUpdatesResult: vi.fn(),
      setBatchCaptureResult: vi.fn(),
      handleSelectAddons: vi.fn(),
    };

    const { result, rerender } = renderHook(
      (args: typeof baseArgs) => useSocialPipelineRunner(args),
      {
        initialProps: baseArgs,
        wrapper: createWrapper(),
      }
    );

    await act(async () => {});

    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);

    rerender({
      ...baseArgs,
      activePost: {
        id: 'post-2',
        titlePl: 'Other draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
        status: 'draft',
      } as never,
      activePostId: 'post-2',
      imageAddonIds: ['addon-2'],
      buildSocialContext: () => ({ postId: 'post-2' }),
      resolveDocReferences: () => ['docs/kangur/other.mdx'],
    });

    expect(result.current.visualAnalysisResult).toBeNull();

    rerender(baseArgs);

    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);

    await act(async () => {
      await result.current.handleRunFullPipelineWithVisualAnalysis();
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/social-pipeline/trigger',
      expect.objectContaining({
        input: expect.objectContaining({
          captureMode: 'existing_assets',
          prefetchedVisualAnalysis: completedVisualAnalysis,
          requireVisualAnalysisInBody: true,
        }),
      }),
      expect.any(Object)
    );
  });

  it('marks saved draft analysis as stale when the current draft scope no longer matches', async () => {
    const baseArgs = {
      activePost: {
        id: 'post-1',
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
        status: 'draft',
        visualSummary: completedVisualAnalysis.summary,
        visualHighlights: [...completedVisualAnalysis.highlights],
        visualDocUpdates: [],
        visualAnalysisSourceImageAddonIds: ['addon-1'],
        visualAnalysisSourceDocReferences: ['docs/kangur/example.mdx'],
        visualAnalysisSourceVisionModelId: 'vision-1',
      } as never,
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
      },
      imageAssets: [],
      imageAddonIds: ['addon-1'],
      batchCaptureBaseUrl: 'https://example.com',
      batchCapturePresetIds: ['preset-1'],
      batchCapturePresetLimit: 1,
      linkedinConnectionId: null,
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
      canRunServerPipeline: true,
      pipelineBlockedReason: null,
      canRunVisualAnalysisPipeline: true,
      visualAnalysisBlockedReason: null,
      projectUrl: 'https://example.com/project',
      generationNotes: 'Call out the updated hero.',
      resolveDocReferences: () => ['docs/kangur/example.mdx'],
      buildSocialContext: () => ({ postId: 'post-1' }),
      handleLoadContext: vi.fn(),
      setContextSummary: vi.fn(),
      setActivePostId: vi.fn(),
      setEditorState: vi.fn(),
      setImageAddonIds: vi.fn(),
      setImageAssets: vi.fn(),
      setDocUpdatesResult: vi.fn(),
      setBatchCaptureResult: vi.fn(),
      handleSelectAddons: vi.fn(),
    };

    const { result, rerender } = renderHook(
      (args: typeof baseArgs) => useSocialPipelineRunner(args),
      {
        initialProps: baseArgs,
        wrapper: createWrapper(),
      }
    );

    await act(async () => {});

    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);
    expect(result.current.hasSavedVisualAnalysis).toBe(true);
    expect(result.current.isSavedVisualAnalysisStale).toBe(false);

    rerender({
      ...baseArgs,
      imageAddonIds: ['addon-2'],
    });

    expect(result.current.visualAnalysisResult).toBeNull();
    expect(result.current.hasSavedVisualAnalysis).toBe(true);
    expect(result.current.isSavedVisualAnalysisStale).toBe(true);

    await act(async () => {
      await result.current.handleRunFullPipelineWithVisualAnalysis();
    });

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Saved image analysis is outdated for this draft. Rerun image analysis before generating.',
      { variant: 'warning' }
    );
  });

  it('does not queue a server job when no social or AI Brain post model is configured', async () => {
    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: [],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          batchCapturePresetLimit: 1,
          linkedinConnectionId: null,
          brainModelId: null,
          visionModelId: null,
          canRunServerPipeline: false,
          pipelineBlockedReason:
            'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
          canRunVisualAnalysisPipeline: false,
          visualAnalysisBlockedReason:
            'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
          projectUrl: 'https://example.com/project',
          generationNotes: 'Note',
          resolveDocReferences: () => [],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setContextSummary: vi.fn(),
          setActivePostId: vi.fn(),
          setEditorState: vi.fn(),
          setImageAddonIds: vi.fn(),
          setImageAssets: vi.fn(),
          setDocUpdatesResult: vi.fn(),
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {});

    await act(async () => {
      await result.current.handleRunFullPipeline();
    });

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
      { variant: 'warning' }
    );
  });

  it('keeps capture failure details when the server job fails during screenshot capture', async () => {
    apiPostMock.mockResolvedValue({
      success: true,
      jobId: 'job-2',
      jobType: 'manual-post-pipeline',
    });
    apiGetMock.mockResolvedValue({
      id: 'job-2',
      status: 'failed',
      progress: {
        type: 'manual-post-pipeline',
        step: 'capturing',
        captureMode: 'fresh_capture',
        message: 'Pipeline stopped: no screenshots captured. Failures: home: Timeout',
        updatedAt: 1_700_000_001_000,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 0,
        captureFailureCount: 1,
        captureFailures: [{ id: 'home', reason: 'Timeout' }],
        requestedPresetCount: 1,
        usedPresetCount: 1,
        usedPresetIds: ['home'],
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 1,
        runId: null,
      },
      failedReason: 'Pipeline stopped: no screenshots captured. Failures: home: Timeout',
      result: null,
    });

    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: [],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          batchCapturePresetLimit: 1,
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          canRunServerPipeline: true,
          pipelineBlockedReason: null,
          canRunVisualAnalysisPipeline: true,
          visualAnalysisBlockedReason: null,
          projectUrl: 'https://example.com/project',
          generationNotes: 'Note',
          resolveDocReferences: () => ['docs/kangur/example.mdx'],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setContextSummary: vi.fn(),
          setActivePostId: vi.fn(),
          setEditorState: vi.fn(),
          setImageAddonIds: vi.fn(),
          setImageAssets: vi.fn(),
          setDocUpdatesResult: vi.fn(),
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleRunFullPipeline();
    });

    expect(result.current.pipelineStep).toBe('error');
    expect(result.current.pipelineProgress).toEqual({
      type: 'manual-post-pipeline',
      step: 'capturing',
      captureMode: 'fresh_capture',
      message: 'Pipeline stopped: no screenshots captured. Failures: home: Timeout',
      updatedAt: 1_700_000_001_000,
      contextDocCount: 1,
      contextSummary: 'summary',
      addonsCreated: 0,
      captureFailureCount: 1,
      captureFailures: [{ id: 'home', reason: 'Timeout' }],
      requestedPresetCount: 1,
      usedPresetCount: 1,
      usedPresetIds: ['home'],
      captureCompletedCount: 0,
      captureRemainingCount: 0,
      captureTotalCount: 1,
      runId: null,
    });
    expect(result.current.pipelineErrorMessage).toBe(
      'Pipeline stopped: no screenshots captured. Failures: home: Timeout'
    );
  });
});
