/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupSocialPostPipelineTestHarness,
  resetSocialPostPipelineTestHarness,
  mockSocialPostContextReturnValue,
} from './SocialPost.Pipeline.test-support';

import { SocialPostPipeline } from './SocialPost.Pipeline';

describe('SocialPostPipeline', () => {
  beforeEach(() => {
    resetSocialPostPipelineTestHarness();
  });

  afterEach(() => {
    cleanupSocialPostPipelineTestHarness();
  });

  it('disables the pipeline when no social or AI Brain post model is configured', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();
    const handleCaptureImagesOnly = vi.fn();

    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      handleRunFullPipeline,
      handleRunFullPipelineWithFreshCapture,
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
      handleCaptureImagesOnly,
      canGenerateSocialDraft: false,
      canRunVisualAnalysisPipeline: false,
      canRunFreshCapturePipeline: false,
      batchCaptureBaseUrl: '',
      batchCapturePresetIds: ['home', 'pricing', 'faq'],
      socialDraftBlockedReason:
        'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
      socialBatchCaptureBlockedReason: 'Set a batch capture base URL in Social Settings first.',
      socialVisualAnalysisBlockedReason:
        'Select at least one image add-on before running image analysis.',
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 2,
      hasBatchCaptureConfig: false,
    });

    render(<SocialPostPipeline />);

    const button = screen.getByRole('button', { name: 'Run full pipeline' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute(
      'title',
      'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.'
    );
    expect(screen.getByRole('button', { name: 'Image analysis' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Programmable Playwright' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Fresh capture & pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture images only' })).toBeDisabled();
    expect(
      screen.getByText(
        'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.'
      )
    ).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleRunFullPipeline).not.toHaveBeenCalled();
    expect(handleRunFullPipelineWithFreshCapture).not.toHaveBeenCalled();
    expect(handleCaptureImagesOnly).not.toHaveBeenCalled();
  });

  it('shows capture progress details and screenshot failure reasons', () => {
    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      pipelineStep: 'error',
      pipelineProgress: {
        type: 'manual-post-pipeline',
        step: 'capturing',
        captureMode: 'fresh_capture',
        message: 'Pipeline stopped: no screenshots captured.',
        updatedAt: 1_700_000_001_000,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 0,
        captureFailureCount: 2,
        captureFailures: [
          { id: 'home', reason: 'Timeout' },
          { id: 'pricing', reason: 'Navigation failed' },
        ],
        requestedPresetCount: 2,
        usedPresetCount: 2,
        usedPresetIds: ['home', 'pricing'],
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 2,
        runId: null,
      },
      pipelineErrorMessage: 'Pipeline stopped: no screenshots captured.',
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home', 'pricing', 'faq', 'pricing-mobile'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: 'Captured 2 screenshots from 2 presets and linked them to the draft.',
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 2,
      hasBatchCaptureConfig: true,
    });

    render(<SocialPostPipeline />);

    expect(screen.getByText('Pipeline stopped: no screenshots captured.')).toBeInTheDocument();
    expect(
      screen.getByText('Captured 2 screenshots from 2 presets and linked them to the draft.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fresh capture: Triggers Playwright batch capture \(4 presets, limit: 2\) before generation\./)
    ).toBeInTheDocument();
  });

  it('shows live Playwright capture counts in the pipeline info while screenshots are running', () => {
    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Draft',
        titleEn: '',
      },
      pipelineStep: 'capturing',
      pipelineProgress: {
        type: 'manual-post-pipeline',
        step: 'capturing',
        captureMode: 'fresh_capture',
        message: 'Playwright capture in progress: 1 captured, 2 left of 3 presets. 1 failed.',
        updatedAt: 1_700_000_001_500,
        contextDocCount: 1,
        contextSummary: 'summary',
        addonsCreated: 1,
        captureFailureCount: 1,
        captureFailures: [{ id: 'profile', reason: 'Timeout' }],
        requestedPresetCount: 3,
        usedPresetCount: 3,
        usedPresetIds: ['home', 'lessons', 'profile'],
        captureCompletedCount: 1,
        captureRemainingCount: 2,
        captureTotalCount: 3,
        runId: 'run-capture',
      },
      pipelineErrorMessage: null,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunVisualAnalysisPipeline: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home', 'lessons', 'profile'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      socialVisualAnalysisBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 3,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(
      screen.getByText('Playwright capture in progress: 1 captured, 2 left of 3 presets. 1 failed.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Live Playwright capture: 1 captured, 2 left. 1 failed.')
    ).toBeInTheDocument();
  });

  it('disables pipeline actions until a draft is selected', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();
    const handleCaptureImagesOnly = vi.fn();

    mockSocialPostContextReturnValue({
      activePostId: null,
      editorState: {
        titlePl: '',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      handleRunFullPipeline,
      handleRunFullPipelineWithFreshCapture,
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
      handleCaptureImagesOnly,
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

    expect(screen.getByRole('button', { name: 'Run full pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Image analysis' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Programmable Playwright' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fresh capture & pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture images only' })).toBeDisabled();
    expect(
      screen.getByText('Create or select a draft before running the social pipeline.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run full pipeline' }));
    expect(handleRunFullPipeline).not.toHaveBeenCalled();
    expect(handleRunFullPipelineWithFreshCapture).not.toHaveBeenCalled();
    expect(handleCaptureImagesOnly).not.toHaveBeenCalled();
  });

  it('shows the active draft target when a post is selected for the pipeline', () => {
    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
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

    expect(screen.getByText('Active draft:')).toBeInTheDocument();
    expect(screen.getByText('Selected pipeline target')).toBeInTheDocument();
  });

  it('opens the visual-analysis flow from the dedicated pipeline button', () => {
    const handleOpenVisualAnalysisModal = vi.fn();

    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal,
      handleOpenProgrammablePlaywrightModal: vi.fn(),
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

    fireEvent.click(screen.getByRole('button', { name: 'Image analysis' }));

    expect(handleOpenVisualAnalysisModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Image analysis' })).toHaveAttribute(
      'title',
      'Analyze the selected visuals first, then use Generate post with analysis as the follow-up AI pass.'
    );
  });

  it('opens the programmable Playwright modal from the dedicated pipeline button', () => {
    const handleOpenProgrammablePlaywrightModal = vi.fn();

    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal,
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
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    fireEvent.click(screen.getByRole('button', { name: 'Programmable Playwright' }));

    expect(handleOpenProgrammablePlaywrightModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Programmable Playwright' })).toHaveAttribute(
      'title',
      'Choose a Playwright persona, edit the script, and define custom routes for fresh screenshots.'
    );
  });

  it('shows live runtime job pills for the active draft workflows', () => {
    mockSocialPostContextReturnValue({
      activePost: {
        visualAnalysisStatus: 'queued',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-7',
      },
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'capturing',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      currentVisualAnalysisJob: {
        id: 'job-analysis-7',
        status: 'active',
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'analyzing',
          message: 'Running Redis-backed image analysis...',
          updatedAt: 1_700_000_000_500,
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: null,
        },
        result: null,
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-3',
        status: 'waiting',
        progress: null,
        result: null,
        failedReason: null,
      },
      currentPipelineJob: {
        id: 'job-pipeline-5',
        status: 'active',
        progress: {
          type: 'manual-post-pipeline',
          step: 'capturing',
          captureMode: 'existing_assets',
          message: 'Generating from the selected visuals...',
          updatedAt: 1_700_000_000_600,
          contextDocCount: 1,
          contextSummary: null,
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
        result: null,
        failedReason: null,
      },
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
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
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.getByText('Runtime jobs:')).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
    expect(screen.getByText('Generate post: Queued')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Running')).toBeInTheDocument();
  });

  it('blocks new launch actions while Redis Social jobs are still in flight', () => {
    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Selected pipeline target',
        titleEn: '',
      },
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-7',
        status: 'active',
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'analyzing',
          message: 'Running Redis-backed image analysis...',
          updatedAt: 1_700_000_000_500,
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: null,
        },
        result: null,
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-3',
        status: 'waiting',
        progress: null,
        result: null,
        failedReason: null,
      },
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleOpenVisualAnalysisModal: vi.fn(),
      handleOpenProgrammablePlaywrightModal: vi.fn(),
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
      programmableCapturePending: false,
      programmableCaptureMessage: null,
      programmableCaptureErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.getByRole('button', { name: 'Run full pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Run full pipeline' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Fresh capture & pipeline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Capture images only' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Programmable Playwright' })).toBeEnabled();
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
    expect(
      screen.getByText(/Saved run: Completed\./)
    ).toBeInTheDocument();
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

    expect(
      screen.queryByText(/Image analysis ready for this draft\./)
    ).not.toBeInTheDocument();
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
