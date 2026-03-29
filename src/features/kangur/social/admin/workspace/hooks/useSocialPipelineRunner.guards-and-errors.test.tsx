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
  toastMock,
  useSocialPipelineRunner,
} from './useSocialPipelineRunner.test-support';

describe('useSocialPipelineRunner guard and error flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        visualAnalysisSourceImageAddonIds: ['addon-1'],
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

  it('keeps saved image analysis current when only doc references change', async () => {
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
        visualAnalysisSourceImageAddonIds: ['addon-1'],
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

    rerender({
      ...baseArgs,
      resolveDocReferences: () => ['docs/kangur/other.mdx'],
      generationNotes: 'Completely different notes.',
    });

    expect(result.current.visualAnalysisResult).toEqual(completedVisualAnalysis);
    expect(result.current.hasSavedVisualAnalysis).toBe(true);
    expect(result.current.isSavedVisualAnalysisStale).toBe(false);
  });

  it('does not treat an empty saved analysis payload as persisted image analysis', async () => {
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
            visualSummary: '',
            visualHighlights: [],
            visualAnalysisSourceImageAddonIds: ['addon-1'],
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
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {});

    expect(result.current.visualAnalysisResult).toBeNull();
    expect(result.current.hasSavedVisualAnalysis).toBe(false);
    expect(result.current.isSavedVisualAnalysisStale).toBe(false);
  });

  it('sanitizes legacy saved image analysis when hydrating it from the draft', async () => {
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
            visualSummary: `Okay, I've reviewed the provided text and images. Here's a summary of the key information. The screenshots show a larger hero card and refreshed navigation labels.

**Potential Documentation/Communication Narrative**
Here's a draft you could use for release notes.
`,
            visualHighlights: [
              'Larger hero card',
              'Documentation update proposal for the homepage docs',
            ],
            visualAnalysisSourceImageAddonIds: ['addon-1'],
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
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {});

    expect(result.current.visualAnalysisResult).toEqual({
      summary: 'The screenshots show a larger hero card and refreshed navigation labels.',
      highlights: ['Larger hero card'],
    });
    expect(result.current.hasSavedVisualAnalysis).toBe(true);
    expect(result.current.isSavedVisualAnalysisStale).toBe(false);
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
