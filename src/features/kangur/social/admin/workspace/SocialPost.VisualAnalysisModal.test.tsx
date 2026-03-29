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
    saveTitle,
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
    saveTitle?: string;
    saveText?: string;
    cancelText?: string;
    onClose: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role='dialog' aria-label={String(title)}>
        <div>{title}</div>
        {subtitle ? <div>{subtitle}</div> : null}
        <button
          type='button'
          disabled={Boolean(isSaveDisabled)}
          title={saveTitle}
          onClick={() => onSave()}
        >
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
      activePost: {
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-7',
      },
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis: vi.fn(),
      visualAnalysisResult: {
        summary: 'The hero now emphasizes the classroom card and stronger CTA.',
        highlights: ['Classroom card is larger', 'CTA is stronger'],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-7',
        status: 'active',
        progress: {
          message: 'Refreshing the image analysis.',
        },
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-9',
        status: 'waiting',
        progress: {
          message: 'Waiting to generate the post from the saved analysis.',
        },
        failedReason: null,
      },
      currentPipelineJob: {
        id: 'job-pipeline-2',
        status: 'active',
        progress: {
          message: 'Generating the PL/EN post from the saved visual analysis.',
        },
        failedReason: null,
      },
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
    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
    expect(screen.getByText('- Classroom card is larger')).toBeInTheDocument();
    expect(screen.getByText('- CTA is stronger')).toBeInTheDocument();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
    expect(screen.getByText('Model: vision-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job: job-analysis-live-7')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Running')).toBeInTheDocument();
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument();
    expect(screen.queryByText('Suggested documentation updates')).not.toBeInTheDocument();
    expect(screen.queryByText('No documentation updates suggested.')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Analyze the selected visuals to produce a visual description first. Then use Generate post with analysis to combine that description with the current context in a separate AI pass.'
    )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Full pipeline in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Full pipeline in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Analyzing visuals...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analyzing visuals...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('triggers analysis and generation actions from the modal controls', () => {
    const handleCloseVisualAnalysisModal = vi.fn();
    const handleAnalyzeSelectedVisuals = vi.fn();
    const handleGeneratePostWithVisualAnalysis = vi.fn();

    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal,
      handleAnalyzeSelectedVisuals,
      handleGeneratePostWithVisualAnalysis,
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
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toHaveAttribute(
      'title',
      'Run image analysis before generating post copy from visuals.'
    );
    expect(handleGeneratePostWithVisualAnalysis).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Analyze selected visuals' })).toHaveAttribute(
      'title',
      'Analyze selected visuals'
    );
    expect(
      screen.getByText(
        'Run image analysis first. After reviewing the visual description, use Generate post with analysis to create the LinkedIn update in the next AI pass.'
      )
    ).toBeInTheDocument();
  });

  it('starts the dedicated generation step once image analysis is ready', () => {
    const handleGeneratePostWithVisualAnalysis = vi.fn();

    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis,
      visualAnalysisResult: {
        summary: 'The hero now emphasizes the classroom card and stronger CTA.',
        highlights: ['Classroom card is larger', 'CTA is stronger'],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
      currentVisualAnalysisJob: {
        id: 'job-analysis-complete-1',
        status: 'completed',
        progress: {
          message: 'Image analysis is ready to use for generation.',
        },
        failedReason: null,
      },
      currentGenerationJob: null,
      currentPipelineJob: null,
    });

    render(<SocialPostVisualAnalysisModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate post with analysis' }));

    expect(handleGeneratePostWithVisualAnalysis).toHaveBeenCalledTimes(1);
  });

  it('shows the dedicated generation progress label when only the follow-up generation job is running', () => {
    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis: vi.fn(),
      visualAnalysisResult: {
        summary: 'The hero now emphasizes the classroom card and stronger CTA.',
        highlights: ['Classroom card is larger', 'CTA is stronger'],
      },
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
      currentVisualAnalysisJob: null,
      currentGenerationJob: {
        id: 'job-generate-10',
        status: 'active',
        progress: {
          message: 'Generating the post from the saved image analysis.',
        },
        failedReason: null,
      },
      currentPipelineJob: null,
    });

    render(<SocialPostVisualAnalysisModal />);

    expect(screen.getByRole('button', { name: 'Generate post in progress...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate post in progress...' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('warns when saved analysis exists but no longer matches the current draft scope', () => {
    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis: vi.fn(),
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
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toHaveAttribute(
      'title',
      'Rerun image analysis before generating post copy from visuals.'
    );
  });

  it('surfaces failed saved-analysis metadata and rerun guidance before a new result exists', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: {
        visualAnalysisStatus: 'failed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisModelId: 'vision-1',
        visualAnalysisJobId: 'job-analysis-failed-1',
        visualAnalysisError: 'The selected screenshots could not be loaded.',
      },
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis: vi.fn(),
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

    expect(screen.getByText('Status: Failed')).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Failed')).toBeInTheDocument();
    expect(
      screen.getByText('The selected screenshots could not be loaded.')
    ).toBeInTheDocument();
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument();
    expect(screen.getByText('Model: vision-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job: job-analysis-failed-1')).toBeInTheDocument();
    expect(
      screen.getByText('Failure: The selected screenshots could not be loaded.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The latest saved image-analysis run failed. Review the status above, then rerun image analysis before generating copy from visuals.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rerun image analysis first. The latest saved run failed, so there is no usable visual description to generate from yet.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate post with analysis' })).toHaveAttribute(
      'title',
      'Rerun image analysis before generating post copy from visuals.'
    );
  });

  it('explains why image analysis cannot start when no visuals are selected', () => {
    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis: vi.fn(),
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: [],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
    });

    render(<SocialPostVisualAnalysisModal />);

    expect(screen.getByRole('button', { name: 'Analyze selected visuals' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analyze selected visuals' })).toHaveAttribute(
      'title',
      'Select at least one image add-on before running image analysis.'
    );
  });

  it('warns when selected add-ons are missing from the loaded add-on list', () => {
    useSocialPostContextMock.mockReturnValue({
      isVisualAnalysisModalOpen: true,
      handleCloseVisualAnalysisModal: vi.fn(),
      handleAnalyzeSelectedVisuals: vi.fn(),
      handleGeneratePostWithVisualAnalysis: vi.fn(),
      visualAnalysisResult: null,
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
      visualAnalysisErrorMessage: null,
      visualAnalysisPending: false,
      imageAddonIds: ['addon-1', 'addon-2', 'addon-3'],
      recentAddons: [recentAddon],
      visionModelId: 'vision-1',
      visionModelOptions: { effectiveModelId: 'vision-routing' },
    });

    render(<SocialPostVisualAnalysisModal />);

    expect(
      screen.getByText(
        '2 selected image add-ons are missing from the loaded list. Refresh the image add-ons and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('3 selected visuals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze selected visuals' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Analyze selected visuals' })).toHaveAttribute(
      'title',
      'Some selected image add-ons are not loaded yet. Refresh the image add-ons and try again.'
    );
  });
});
