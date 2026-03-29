/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock, usePlaywrightPersonasMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
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

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: (...args: unknown[]) => usePlaywrightPersonasMock(...args),
}));

import { SocialPostVisualAnalysisModal } from './SocialPost.VisualAnalysisModal';

const recentAddon = {
  id: 'addon-1',
  title: 'Homepage hero',
  description: 'Updated homepage hero area.',
  sourceLabel: 'Programmable Playwright capture',
  playwrightPersonaId: 'teacher-persona',
  playwrightCaptureRouteId: 'homepage-route',
  playwrightCaptureRouteTitle: 'Homepage route',
  playwrightRunId: 'playwright-run-4',
  presetId: null,
  imageAsset: {
    id: 'asset-1',
    url: '/asset-1.png',
    filepath: '/asset-1.png',
    filename: 'asset-1.png',
  },
};

describe('SocialPostVisualAnalysisModal', () => {
  beforeEach(() => {
    usePlaywrightPersonasMock.mockReset();
    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'teacher-persona', name: 'Teacher reviewer' }],
      isLoading: false,
    });
  });

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
            docPath: 'docs/homepage.md',
            section: 'Hero',
            reason: 'Document the stronger CTA emphasis for teachers.',
            proposedText: 'Describe the larger CTA card in the homepage hero docs.',
          },
        ],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
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
    expect(screen.getByText('Source: Programmable Playwright capture')).toBeInTheDocument();
    expect(screen.getByText('Persona: Teacher reviewer (teacher-persona)')).toBeInTheDocument();
    expect(screen.getByText('Route: Homepage route (homepage-route)')).toBeInTheDocument();
    expect(screen.getByText('Run: playwright-run-4')).toBeInTheDocument();
    expect(screen.getByText('- Classroom card is larger')).toBeInTheDocument();
    expect(screen.getByText('- CTA is stronger')).toBeInTheDocument();
    expect(screen.getByText('Suggested documentation updates')).toBeInTheDocument();
    expect(screen.getByText('docs/homepage.md -> Hero')).toBeInTheDocument();
    expect(
      screen.getByText('Document the stronger CTA emphasis for teachers.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Describe the larger CTA card in the homepage hero docs.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Analyze the selected visuals to produce a visual description first. Then use Generate post with analysis to combine that description with the current context in a separate AI pass.'
      )
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
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
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
    expect(
      screen.getByText(
        'Run image analysis first. After reviewing the visual description, use Generate post with analysis to create the LinkedIn update in the next AI pass.'
      )
    ).toBeInTheDocument();
  });

  it('warns when saved analysis exists but no longer matches the current draft scope', () => {
    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleRunFullPipelineWithVisualAnalysis: vi.fn(),
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: true,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
    });

    render(<SocialPostVisualAnalysisModal />);

    expect(
      screen.getByText(
        'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis to refresh it before generating copy.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rerun image analysis first. After reviewing the refreshed visual description, use Generate post with analysis to create the LinkedIn update in the next AI pass.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toBeDisabled();
  });
});
