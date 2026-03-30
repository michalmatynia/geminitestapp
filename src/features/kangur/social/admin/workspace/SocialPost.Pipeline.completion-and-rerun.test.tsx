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

describe('SocialPostPipeline completion and rerun states', () => {
  beforeEach(() => {
    resetSocialPostPipelineTestHarness();
  });

  afterEach(() => {
    cleanupSocialPostPipelineTestHarness();
  });

  it('surfaces a completed pipeline by opening the draft editor', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();
    const handleCaptureImagesOnly = vi.fn();
    const setIsPostEditorModalOpen = vi.fn();

    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Generated weekly update',
        titleEn: '',
      },
      pipelineStep: 'done',
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
      setIsPostEditorModalOpen,
    });

    render(<SocialPostPipeline />);

    expect(
      screen.getByText(
        'Draft updated: Generated weekly update. The editor opened with the generated content.'
      )
    ).toBeInTheDocument();
    const runFullPipelineButton = screen.getByRole('button', { name: 'Run full pipeline' });
    const freshCaptureButton = screen.getByRole('button', { name: 'Fresh capture & pipeline' });
    const captureImagesOnlyButton = screen.getByRole('button', { name: 'Capture images only' });

    expect(runFullPipelineButton).toBeEnabled();
    expect(freshCaptureButton).toBeEnabled();
    expect(captureImagesOnlyButton).toBeEnabled();

    fireEvent.click(runFullPipelineButton);
    fireEvent.click(freshCaptureButton);
    fireEvent.click(captureImagesOnlyButton);

    expect(handleRunFullPipeline).toHaveBeenCalledTimes(1);
    expect(handleRunFullPipelineWithFreshCapture).toHaveBeenCalledTimes(1);
    expect(handleCaptureImagesOnly).toHaveBeenCalledTimes(1);
    expect(setIsPostEditorModalOpen).toHaveBeenCalledWith(true);
  });

  it('allows rerunning the pipeline after a failed attempt', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();

    mockSocialPostContextReturnValue({
      activePostId: 'post-1',
      editorState: {
        titlePl: 'Generated weekly update',
        titleEn: '',
      },
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
      pipelineErrorMessage: 'Pipeline stopped: no screenshots captured.',
      handleRunFullPipeline,
      handleRunFullPipelineWithFreshCapture,
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

    const runFullPipelineButton = screen.getByRole('button', { name: 'Run full pipeline' });
    const freshCaptureButton = screen.getByRole('button', { name: 'Fresh capture & pipeline' });

    expect(runFullPipelineButton).toBeEnabled();
    expect(freshCaptureButton).toBeEnabled();

    fireEvent.click(runFullPipelineButton);
    fireEvent.click(freshCaptureButton);

    expect(handleRunFullPipeline).toHaveBeenCalledTimes(1);
    expect(handleRunFullPipelineWithFreshCapture).toHaveBeenCalledTimes(1);
  });
});
