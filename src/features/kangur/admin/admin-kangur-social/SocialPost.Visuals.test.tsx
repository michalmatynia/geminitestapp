/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
  useSocialPostContext: () => useSocialPostContextMock(),
}));

import { SocialPostVisuals } from './SocialPost.Visuals';

const buildPost = () => ({
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
  visualDocUpdates: [],
  docUpdatesAppliedAt: null,
  docUpdatesAppliedBy: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
});

describe('SocialPostVisuals', () => {
  it('keeps only post-scoped add-on selection controls in the editor surface', () => {
    useSocialPostContextMock.mockReturnValue({
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
});
