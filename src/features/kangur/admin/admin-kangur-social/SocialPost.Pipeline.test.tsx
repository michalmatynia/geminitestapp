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
      handleCaptureImagesOnly,
      canGenerateSocialDraft: false,
      canRunFreshCapturePipeline: false,
      batchCaptureBaseUrl: '',
      batchCapturePresetIds: ['home', 'pricing', 'faq'],
      socialDraftBlockedReason:
        'Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.',
      socialBatchCaptureBlockedReason: 'Set a batch capture base URL in Social Settings first.',
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 2,
      hasBatchCaptureConfig: false,
    });

    render(<SocialPostPipeline />);

    const button = screen.getByRole('button', { name: 'Run full pipeline' });
    expect(button).toBeDisabled();
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
        runId: null,
      },
      pipelineErrorMessage: 'Pipeline stopped: no screenshots captured.',
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home', 'pricing', 'faq', 'pricing-mobile'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
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
      handleCaptureImagesOnly,
      canGenerateSocialDraft: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
      captureOnlyPending: false,
      captureOnlyMessage: null,
      captureOnlyErrorMessage: null,
      batchCapturePresetLimit: 1,
      hasBatchCaptureConfig: true,
      setIsPostEditorModalOpen: vi.fn(),
    });

    render(<SocialPostPipeline />);

    expect(screen.getByRole('button', { name: 'Run full pipeline' })).toBeDisabled();
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

  it('surfaces a completed pipeline by opening the draft editor', () => {
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
      handleRunFullPipeline: vi.fn(),
      handleRunFullPipelineWithFreshCapture: vi.fn(),
      handleCaptureImagesOnly: vi.fn(),
      canGenerateSocialDraft: true,
      canRunFreshCapturePipeline: true,
      batchCaptureBaseUrl: 'https://kangur.app',
      batchCapturePresetIds: ['home'],
      socialDraftBlockedReason: null,
      socialBatchCaptureBlockedReason: null,
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
    expect(setIsPostEditorModalOpen).toHaveBeenCalledWith(true);
  });
});
