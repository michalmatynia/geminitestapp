/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cleanupSocialPostPipelineTestHarness,
  mockSocialPostContextReturnValue,
  resetSocialPostPipelineTestHarness,
} from './SocialPost.Pipeline.test-support';
import { SocialPostPipeline } from './SocialPost.Pipeline';

describe('SocialPostPipeline analysis review', () => {
  beforeEach(() => {
    resetSocialPostPipelineTestHarness();
  });

  afterEach(() => {
    cleanupSocialPostPipelineTestHarness();
  });

  it('shows when a cached image-analysis result is already ready for the draft', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-7',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      visualAnalysisResult: {
        summary: 'The hero now emphasizes the teacher CTA.',
        highlights: ['Larger teacher CTA', 'Cleaner hero composition'],
      },
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(
      screen.getByText(
        'Image analysis ready for this draft. 2 highlights. Open the modal to review it or start the post-generation pass.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Saved run: Completed\./)).toBeInTheDocument();
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument();
    expect(screen.getByText(/Model: vision-1\./)).toBeInTheDocument();
    expect(screen.getByText(/Queue job: job-analysis-7\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toHaveAttribute(
      'title',
      'Review the saved image analysis or start the separate Generate post with analysis step.'
    );
  });

  it('prefers the live analysis rerun over saved metadata in the ready-analysis banner', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-saved-1',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-2',
        status: 'active',
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'analyzing',
          message: 'Refreshing the saved analysis from Redis.',
          updatedAt: 1_700_000_000_700,
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: 2,
        },
        result: null,
        failedReason: null,
      },
      visualAnalysisResult: {
        summary: 'The hero now emphasizes the teacher CTA.',
        highlights: ['Larger teacher CTA', 'Cleaner hero composition'],
      },
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.getByText('Runtime jobs:')).toBeInTheDocument();
    expect(screen.getByText(/Image analysis: Running/)).toBeInTheDocument();
    expect(screen.getByText(/Latest run: Running\./)).toBeInTheDocument();
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument();
    expect(screen.getByText(/Model: vision-1\./)).toBeInTheDocument();
    expect(screen.getByText(/Queue job: job-analysis-live-2\./)).toBeInTheDocument();
    expect(screen.queryByText(/Queue job: job-analysis-saved-1\./)).not.toBeInTheDocument();
  });

  it('does not treat an empty analysis payload as ready for review', () => {
    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      visualAnalysisResult: {
        summary: '',
        highlights: [],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.queryByText(/Image analysis ready for this draft\./)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Image analysis' })).toBeEnabled();
  });

  it('shows the latest queued image-analysis run even before saved analysis content exists', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'queued',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-queued',
        visualAnalysisJobId: 'job-analysis-queued-1',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.getByText(/Latest image analysis status: Queued\./)).toBeInTheDocument();
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument();
    expect(screen.getByText(/Model: vision-queued\./)).toBeInTheDocument();
    expect(screen.getByText(/Queue job: job-analysis-queued-1\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toHaveAttribute(
      'title',
      'Review the latest image-analysis run status or open the modal to wait for the saved result.'
    );
  });

  it('treats a completed metadata-only analysis run as reviewable', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-empty-1',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      visualAnalysisResult: {
        summary: '',
        highlights: [],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.queryByText(/Image analysis ready for this draft\./)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toHaveAttribute(
      'title',
      'Review the latest saved image-analysis run status or rerun analysis from the modal.'
    );
  });

  it('treats a failed metadata-only analysis run as reviewable with a rerun-focused title', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'failed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-failed-1',
        visualAnalysisError: 'The selected screenshots could not be loaded.',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      visualAnalysisResult: {
        summary: '',
        highlights: [],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.getByText(/Latest image analysis status: Failed\./)).toBeInTheDocument();
    expect(
      screen.getByText('Failure: The selected screenshots could not be loaded.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toHaveAttribute(
      'title',
      'Review the failed image-analysis run or rerun analysis from the modal.'
    );
  });

  it('warns when saved image analysis exists but the draft changed since that analysis', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-stale-1',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: true,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(
      screen.getByText(
        'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Image analysis' })).toHaveAttribute(
      'title',
      'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.'
    );
  });

  it('treats a live rerun as reviewable even if the previously saved analysis is stale', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-stale-1',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-rerun-1',
        status: 'active',
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'analyzing',
          message: 'Refreshing the image analysis after visual changes.',
          updatedAt: 1_700_000_000_900,
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: null,
        },
        result: null,
        failedReason: null,
      },
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: true,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(
      screen.queryByText(
        'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toHaveAttribute(
      'title',
      'Review the latest image-analysis run status or open the modal to wait for the saved result.'
    );
    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
  });
});
