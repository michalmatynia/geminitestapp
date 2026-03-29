/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  Card: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...rest}>{children}</div>
  ),
  FormSection: ({
    title,
    description,
    actions,
    children,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
    </section>
  ),
  LoadingState: ({ message }: { message?: string }) => <div role='status'>{message ?? 'Loading...'}</div>,
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
}));

import { SocialPostPipeline } from './SocialPost.Pipeline';

describe('SocialPostPipeline', () => {
  it('disables the pipeline when no social or AI Brain post model is configured', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();
    const handleCaptureImagesOnly = vi.fn();

    useSocialPostContextMock.mockReturnValue({
      activePostId: 'post-1',
      pipelineStep: 'idle',
      pipelineProgress: null,
      pipelineErrorMessage: null,
      handleRunFullPipeline,
      handleRunFullPipelineWithFreshCapture,
      handleOpenVisualAnalysisModal: vi.fn(),
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
    expect(screen.getByRole('button', { name: 'Pipeline + image analysis' })).toBeDisabled();
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
    useSocialPostContextMock.mockReturnValue({
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
    useSocialPostContextMock.mockReturnValue({
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

    useSocialPostContextMock.mockReturnValue({
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
    expect(screen.getByRole('button', { name: 'Pipeline + image analysis' })).toBeDisabled();
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
    useSocialPostContextMock.mockReturnValue({
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

    useSocialPostContextMock.mockReturnValue({
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

    fireEvent.click(screen.getByRole('button', { name: 'Pipeline + image analysis' }));

    expect(handleOpenVisualAnalysisModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pipeline + image analysis' })).toHaveAttribute(
      'title',
      'Analyze the selected visuals first, then generate a post that mentions the findings.'
    );
  });

  it('shows when a cached image-analysis result is already ready for the draft', () => {
    useSocialPostContextMock.mockReturnValue({
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
        docUpdates: [
          {
            docPath: 'docs/social/teacher-launch.md',
            section: 'Hero',
            proposedText: 'Use the teacher CTA variant.',
            reason: 'Keep launch docs aligned with the analyzed visual.',
          },
        ],
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

    expect(screen.getByText('Image analysis ready for this draft. 2 highlights. 1 doc update. Open the modal to review or generate.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review image analysis' })).toHaveAttribute(
      'title',
      'Review the saved image analysis or generate from it without rerunning vision analysis.'
    );
  });

  it('surfaces a completed pipeline by opening the draft editor', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();
    const handleCaptureImagesOnly = vi.fn();
    const setIsPostEditorModalOpen = vi.fn();

    useSocialPostContextMock.mockReturnValue({
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

    useSocialPostContextMock.mockReturnValue({
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
