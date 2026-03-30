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
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  FormSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  LoadingState: ({ message }: { message?: string }) => <div role='status'>{message ?? 'Loading...'}</div>,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock('./SocialPost.ImagesPanel', () => ({
  SocialPostImagesPanel: () => <div data-testid='social-post-images-panel'>images-panel</div>,
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => ({
    activePost: null,
    recentAddons: [],
    addonsQuery: { isLoading: false, isFetching: false, refetch: vi.fn() },
    imageAddonIds: [],
    missingSelectedImageAddonIds: [],
    handleSelectAddon: vi.fn(),
    handleRemoveAddon: vi.fn(),
    handleRefreshMissingImageAddons: vi.fn().mockResolvedValue(undefined),
    handleRemoveMissingAddons: vi.fn().mockResolvedValue(undefined),
    missingImageAddonActionPending: null,
    missingImageAddonActionErrorMessage: null,
    imageAssets: [],
    handleRemoveImage: vi.fn(),
    setShowMediaLibrary: vi.fn(),
    showMediaLibrary: false,
    handleAddImages: vi.fn(),
    ...useSocialPostContextMock(),
  }),
}));

vi.mock('@/shared/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: (...args: unknown[]) => usePlaywrightPersonasMock(...args),
}));

import { SocialPostVisuals } from './SocialPost.Visuals';

const buildPost = (overrides: Partial<ReturnType<typeof buildPostBase>> = {}) => ({
  ...buildPostBase(),
  ...overrides,
});

const buildPostBase = () => ({
  id: 'post-1',
  titlePl: 'StudiQ Weekly Update',
  titleEn: 'StudiQ Weekly Update',
  bodyPl: '',
  bodyEn: '',
  combinedBody: '',
  status: 'draft' as const,
  scheduledAt: null,
  publishedAt: null,
  linkedinPostId: null,
  linkedinUrl: null,
  linkedinConnectionId: null,
  brainModelId: null,
  visionModelId: null,
  publishError: null,
  imageAssets: [],
  imageAddonIds: [],
  docReferences: [],
  contextSummary: null,
  generatedSummary: null,
  visualSummary: null,
  visualHighlights: [],
  visualAnalysisStatus: null,
  visualAnalysisUpdatedAt: null,
  visualAnalysisJobId: null,
  visualAnalysisModelId: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
});

describe('SocialPostVisuals', () => {
  beforeEach(() => {
    useSocialPostContextMock.mockReset();
    usePlaywrightPersonasMock.mockReset();
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('keeps only post-scoped add-on selection controls in the editor surface', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Image add-ons')).toBeInTheDocument();
    expect(
      screen.getByText('Select existing visual add-ons for this post. Create new captures from the Settings modal.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Capture with Playwright')).not.toBeInTheDocument();
    expect(screen.queryByText('Batch capture presets')).not.toBeInTheDocument();
    expect(screen.queryByText('Capture presets')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Base URL (e.g. https://kangur.app)')).not.toBeInTheDocument();
    expect(screen.queryByText('Scheduling')).not.toBeInTheDocument();
    expect(screen.getByText('No image add-ons yet.')).toBeInTheDocument();
    expect(screen.queryByText('Documentation references')).not.toBeInTheDocument();
    expect(screen.queryByText('Documentation updates')).not.toBeInTheDocument();
  });

  it('renders the shared add-ons loader when recent add-ons are loading', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: [],
      addonsQuery: { isLoading: true },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading image add-ons...');
    expect(screen.queryByText('No image add-ons yet.')).not.toBeInTheDocument();
  });

  it('warns when selected add-ons are missing from the loaded add-on list', () => {
    const handleRefreshMissingImageAddons = vi.fn().mockResolvedValue(undefined);
    const handleRemoveMissingAddons = vi.fn().mockResolvedValue(undefined);
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: [],
      addonsQuery: { isLoading: false, isFetching: false, refetch: vi.fn() },
      imageAddonIds: ['addon-1', 'addon-2'],
      missingSelectedImageAddonIds: ['addon-1', 'addon-2'],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      handleRefreshMissingImageAddons,
      handleRemoveMissingAddons,
      missingImageAddonActionPending: null,
      missingImageAddonActionErrorMessage: null,
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(
      screen.getByText(
        '2 selected image add-ons are missing from the loaded list. Refresh the image add-ons to review or remove them here.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh image add-ons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove missing add-ons' }));

    expect(handleRefreshMissingImageAddons).toHaveBeenCalledTimes(1);
    expect(handleRemoveMissingAddons).toHaveBeenCalledTimes(1);
  });

  it('shows pending and error feedback while resolving missing add-ons', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: [],
      addonsQuery: { isLoading: false, isFetching: false, refetch: vi.fn() },
      imageAddonIds: ['addon-1', 'addon-2'],
      missingSelectedImageAddonIds: ['addon-2'],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      handleRefreshMissingImageAddons: vi.fn().mockResolvedValue(undefined),
      handleRemoveMissingAddons: vi.fn().mockResolvedValue(undefined),
      missingImageAddonActionPending: 'refresh',
      missingImageAddonActionErrorMessage: 'Failed to refresh the selected image add-ons.',
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByRole('button', { name: 'Refreshing image add-ons...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove missing add-ons' })).toBeDisabled();
    expect(
      screen.getByText('Failed to refresh the selected image add-ons.')
    ).toBeInTheDocument();
  });

  it('does not crash when missing-addon context fields are temporarily undefined', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: undefined,
      addonsQuery: undefined,
      imageAddonIds: undefined,
      missingSelectedImageAddonIds: undefined,
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      handleRefreshMissingImageAddons: undefined,
      handleRemoveMissingAddons: undefined,
      missingImageAddonActionPending: null,
      missingImageAddonActionErrorMessage: null,
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Image add-ons')).toBeInTheDocument();
    expect(screen.getByText('No image add-ons yet.')).toBeInTheDocument();
  });

  it('shows the stored image analysis summary and highlights when the post has visual analysis data', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost({
        visualSummary: 'The hero now highlights the classroom card and a stronger CTA.',
        visualHighlights: ['Classroom card is larger', 'CTA is more prominent'],
        visualAnalysisStatus: 'completed',
        visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
        visualAnalysisJobId: 'job-analysis-7',
        visualAnalysisModelId: 'vision-1',
      }),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-7',
        status: 'active',
        progress: { message: 'Refreshing the image analysis.' },
        failedReason: null,
      },
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Image analysis result')).toBeInTheDocument();
    expect(
      screen.getByText('The hero now highlights the classroom card and a stronger CTA.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Image analysis: Running')).toHaveLength(2);
    expect(screen.getByText('- Classroom card is larger')).toBeInTheDocument();
    expect(screen.getByText('- CTA is more prominent')).toBeInTheDocument();
    expect(screen.getByText('Status: Running')).toBeInTheDocument();
    expect(screen.getByText('Model: vision-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job: job-analysis-live-7')).toBeInTheDocument();
  });

  it('shows saved run metadata even when no summary or highlights are present yet', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost({
        visualAnalysisStatus: 'completed',
        visualAnalysisJobId: 'job-analysis-docs-1',
        visualAnalysisModelId: 'vision-1',
      }),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: false,
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Image analysis result')).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Completed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No saved analysis summary yet. The queue metadata above reflects the latest image-analysis run for this post.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Status: Completed')).toBeInTheDocument();
    expect(screen.getByText('Model: vision-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job: job-analysis-docs-1')).toBeInTheDocument();
  });

  it('shows pending analysis metadata even before a summary is saved', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost({
        visualAnalysisStatus: 'queued',
        visualAnalysisJobId: 'job-analysis-queued-1',
        visualAnalysisModelId: 'vision-queued',
      }),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Image analysis result')).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Queued')).toBeInTheDocument();
    expect(screen.getByText('Status: Queued')).toBeInTheDocument();
    expect(screen.getByText('Model: vision-queued')).toBeInTheDocument();
    expect(screen.getByText('Queue job: job-analysis-queued-1')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No saved analysis summary yet. The queue metadata above reflects the latest image-analysis run for this post.'
      )
    ).toBeInTheDocument();
  });

  it('shows the saved image-analysis failure reason when the latest run failed', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost({
        visualAnalysisStatus: 'failed',
        visualAnalysisJobId: 'job-analysis-failed-1',
        visualAnalysisModelId: 'vision-failed',
        visualAnalysisError: 'The selected screenshots could not be loaded.',
      }),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(
      screen.getByText('The selected screenshots could not be loaded.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Failure: The selected screenshots could not be loaded.')
    ).toBeInTheDocument();
  });

  it('shows live runtime job pills alongside the saved image-analysis metadata', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost({
        visualAnalysisStatus: 'queued',
        visualAnalysisJobId: 'job-analysis-queued-1',
        visualAnalysisModelId: 'vision-queued',
      }),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      hasSavedVisualAnalysis: false,
      isSavedVisualAnalysisStale: false,
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-2',
        status: 'active',
        progress: { message: 'Analyzing the refreshed screenshots.' },
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-live-2',
        status: 'waiting',
        progress: { message: 'Waiting for generation worker capacity.' },
        failedReason: null,
      },
      currentPipelineJob: {
        id: 'job-pipeline-live-2',
        status: 'completed',
        progress: { message: 'Pipeline finished for this draft.' },
        failedReason: null,
      },
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Runtime jobs:')).toBeInTheDocument();
    expect(screen.getAllByText('Image analysis: Running')).toHaveLength(2);
    expect(screen.getByText('Generate post: Queued')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Completed')).toBeInTheDocument();
  });

  it('warns when the saved image analysis is outdated for the current draft scope', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost({
        visualSummary: 'Old analysis summary.',
        visualHighlights: ['Old highlight'],
        visualAnalysisStatus: 'completed',
      }),
      recentAddons: [],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      hasSavedVisualAnalysis: true,
      isSavedVisualAnalysisStale: true,
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(
      screen.getByText(
        'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating new copy from it.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Old analysis summary.')).toBeInTheDocument();
  });

  it('shows programmable Playwright provenance on captured add-ons', () => {
    usePlaywrightPersonasMock.mockReturnValue({
      data: [{ id: 'teacher-persona', name: 'Teacher reviewer' }],
      isLoading: false,
    });
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: [
        {
          id: 'addon-1',
          title: 'Pricing hero capture',
          description: 'Programmable capture from the pricing route.',
          sourceUrl: 'https://example.com/pricing',
          sourceLabel: 'Programmable Playwright capture',
          imageAsset: {
            id: 'asset-1',
            url: 'https://example.com/pricing.png',
            filepath: '/tmp/pricing.png',
            filename: 'pricing.png',
          },
          presetId: null,
          previousAddonId: null,
          playwrightRunId: 'playwright-run-9',
          playwrightArtifact: 'screenshots/pricing.png',
          playwrightPersonaId: 'teacher-persona',
          playwrightCaptureRouteId: 'pricing-route',
          playwrightCaptureRouteTitle: 'Pricing page',
          captureAppearanceMode: 'dark',
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: '2026-03-21T09:00:00.000Z',
          updatedAt: '2026-03-21T09:00:00.000Z',
        },
      ],
      addonsQuery: { isLoading: false },
      imageAddonIds: ['addon-1'],
      handleSelectAddon: vi.fn(),
      handleRemoveAddon: vi.fn(),
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByText('Source: Programmable Playwright capture')).toBeInTheDocument();
    expect(screen.getByText('Persona: Teacher reviewer (teacher-persona)')).toBeInTheDocument();
    expect(screen.getByText('Route: Pricing page (pricing-route)')).toBeInTheDocument();
    expect(screen.getByText('Run: playwright-run-9')).toBeInTheDocument();
    expect(screen.getByText('Appearance: dark')).toBeInTheDocument();
  });

  it('blocks add-on selection changes while Social runtime jobs are still in flight', () => {
    const handleSelectAddon = vi.fn();
    const handleRemoveAddon = vi.fn();

    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      recentAddons: [
        {
          id: 'addon-1',
          title: 'Pricing hero capture',
          description: 'Programmable capture from the pricing route.',
          sourceUrl: 'https://example.com/pricing',
          sourceLabel: 'Programmable Playwright capture',
          imageAsset: {
            id: 'asset-1',
            url: 'https://example.com/pricing.png',
            filepath: '/tmp/pricing.png',
            filename: 'pricing.png',
          },
          presetId: null,
          previousAddonId: null,
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: '2026-03-21T09:00:00.000Z',
          updatedAt: '2026-03-21T09:00:00.000Z',
        },
      ],
      addonsQuery: { isLoading: false },
      imageAddonIds: [],
      handleSelectAddon,
      handleRemoveAddon,
      imageAssets: [],
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
      currentVisualAnalysisJob: {
        id: 'job-analysis-live-9',
        status: 'active',
        progress: { message: 'Analyzing visuals for the active draft.' },
        failedReason: null,
      },
      currentGenerationJob: null,
      currentPipelineJob: null,
    });

    render(<SocialPostVisuals showImagesPanel={false} />);

    expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(handleSelectAddon).not.toHaveBeenCalled();
    expect(handleRemoveAddon).not.toHaveBeenCalled();
  });
});
