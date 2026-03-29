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
  FormModal: ({
    open,
    title,
    subtitle,
    actions,
    onSave,
    isSaveDisabled,
    saveText = 'Save',
    cancelText = 'Close',
    onClose,
    children,
  }: {
    open?: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    onSave: () => void;
    isSaveDisabled?: boolean;
    saveText?: string;
    cancelText?: string;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role='dialog' aria-label={String(title)}>
        <div>{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        <button type='button' disabled={Boolean(isSaveDisabled)} onClick={() => onSave()}>
          {saveText}
        </button>
        <div>{actions}</div>
        <button type='button' onClick={() => onClose()}>
          {cancelText}
        </button>
        {children}
      </div>
    ) : null,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  LoadingState: ({ message }: { message?: string }) => <div role='status'>{message}</div>,
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
}));

import { SocialPostVisualAnalysisModal } from './SocialPost.VisualAnalysisModal';

const recentAddon = {
  id: 'addon-1',
  title: 'Homepage hero',
  description: 'Updated homepage hero area.',
  imageAsset: {
    id: 'asset-1',
    url: '/asset-1.png',
    filepath: '/asset-1.png',
    filename: 'asset-1.png',
  },
};

describe('SocialPostVisualAnalysisModal', () => {
  it('renders selected visuals and the returned analysis result', () => {
    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleRunFullPipelineWithVisualAnalysis: vi.fn(),
      visualAnalysisResult: {
        summary: 'The hero now emphasizes the classroom card and stronger CTA.',
        highlights: ['Classroom card is larger', 'CTA is stronger'],
        docUpdates: [
          {
            docPath: 'docs/social/teacher-launch.md',
            section: 'Hero',
            proposedText: 'Use the classroom CTA variant.',
            reason: 'Keep the teacher-facing CTA language aligned with the analyzed visual.',
          },
        ],
      },
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
    });

    render(<SocialPostVisualAnalysisModal />);

    expect(screen.getByRole('dialog', { name: 'Image analysis pipeline' })).toBeInTheDocument();
    expect(screen.getByText('Homepage hero')).toBeInTheDocument();
    expect(
      screen.getByText('The hero now emphasizes the classroom card and stronger CTA.')
    ).toBeInTheDocument();
    expect(screen.getByText('- Classroom card is larger')).toBeInTheDocument();
    expect(screen.getByText('- CTA is stronger')).toBeInTheDocument();
    expect(screen.getByText('Suggested documentation updates')).toBeInTheDocument();
    expect(screen.getByText('docs/social/teacher-launch.md · Hero')).toBeInTheDocument();
    expect(
      screen.getByText('Keep the teacher-facing CTA language aligned with the analyzed visual.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toBeEnabled();
  });

  it('triggers analysis and generation actions from the modal controls', () => {
    const handleCloseVisualAnalysisModal = vi.fn();
    const handleAnalyzeSelectedVisuals = vi.fn();
    const handleRunFullPipelineWithVisualAnalysis = vi.fn();

    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal,
      handleAnalyzeSelectedVisuals,
      handleRunFullPipelineWithVisualAnalysis,
      visualAnalysisResult: null,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
    });

    render(<SocialPostVisualAnalysisModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Analyze selected visuals' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(handleAnalyzeSelectedVisuals).toHaveBeenCalledTimes(1);
    expect(handleCloseVisualAnalysisModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toBeDisabled();
    expect(handleRunFullPipelineWithVisualAnalysis).not.toHaveBeenCalled();
  });
});
