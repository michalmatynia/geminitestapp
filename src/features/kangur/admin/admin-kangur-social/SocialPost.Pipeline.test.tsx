/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
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
}));

import { SocialPostPipeline } from './SocialPost.Pipeline';

describe('SocialPostPipeline', () => {
  it('disables the pipeline when no social or AI Brain post model is configured', () => {
    const handleRunFullPipeline = vi.fn();
    const handleRunFullPipelineWithFreshCapture = vi.fn();
    const handleCaptureImagesOnly = vi.fn();

    render(
      <SocialPostPipeline
        activePostId='post-1'
        pipelineStep='idle'
        pipelineProgress={null}
        pipelineErrorMessage={null}
        handleRunFullPipeline={handleRunFullPipeline}
        handleRunFullPipelineWithFreshCapture={handleRunFullPipelineWithFreshCapture}
        handleCaptureImagesOnly={handleCaptureImagesOnly}
        canRunPipeline={false}
        canRunFreshCapturePipeline={false}
        canCaptureImagesOnly={false}
        pipelineBlockedReason='Choose a StudiQ Social post model in Settings or assign AI Brain routing in /admin/brain?tab=routing.'
        captureBlockedReason='Set a batch capture base URL in Social Settings first.'
        captureOnlyPending={false}
        captureOnlyMessage={null}
        captureOnlyErrorMessage={null}
        batchCapturePresetCount={3}
        effectiveBatchCapturePresetCount={2}
        batchCapturePresetLimit={2}
      />
    );

    const button = screen.getByRole('button', { name: 'Run pipeline' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Run pipeline + fresh capture' })).toBeDisabled();
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
    render(
      <SocialPostPipeline
        activePostId='post-1'
        pipelineStep='error'
        pipelineProgress={{
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
        }}
        pipelineErrorMessage='Pipeline stopped: no screenshots captured.'
        handleRunFullPipeline={vi.fn()}
        handleRunFullPipelineWithFreshCapture={vi.fn()}
        handleCaptureImagesOnly={vi.fn()}
        canRunPipeline={true}
        canRunFreshCapturePipeline={true}
        canCaptureImagesOnly={true}
        pipelineBlockedReason={null}
        captureBlockedReason={null}
        captureOnlyPending={false}
        captureOnlyMessage='Captured 2 screenshots from 2 presets and linked them to the draft.'
        captureOnlyErrorMessage={null}
        batchCapturePresetCount={4}
        effectiveBatchCapturePresetCount={2}
        batchCapturePresetLimit={2}
      />
    );

    expect(screen.getAllByText('Pipeline stopped: no screenshots captured.')).toHaveLength(2);
    expect(screen.getByText('No screenshots were captured.')).toBeInTheDocument();
    expect(screen.getByText('Capture issues')).toBeInTheDocument();
    expect(screen.getByText('home: Timeout')).toBeInTheDocument();
    expect(screen.getByText('pricing: Navigation failed')).toBeInTheDocument();
    expect(
      screen.getByText('Fresh capture will use up to 2 of 4 selected presets.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Captured 2 screenshots from 2 presets and linked them to the draft.')
    ).toBeInTheDocument();
  });
});
