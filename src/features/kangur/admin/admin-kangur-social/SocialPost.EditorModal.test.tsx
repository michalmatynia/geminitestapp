/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/shared/ui')>(
    '@/features/kangur/shared/ui'
  );

  return {
    ...actual,
    AppModal: ({
      open,
      title,
      subtitle,
      headerActions,
      children,
    }: {
      open?: boolean;
      title: React.ReactNode;
      subtitle?: React.ReactNode;
      headerActions?: React.ReactNode;
      children: React.ReactNode;
    }) =>
      open ? (
        <div role='dialog' aria-label={String(title)}>
          <div>{title}</div>
          {subtitle ? <div>{subtitle}</div> : null}
          <div>{headerActions}</div>
          {children}
        </div>
      ) : null,
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

vi.mock('./SocialPost.Editor', () => ({
  SocialPostEditor: () => <div data-testid='social-post-editor'>social-post-editor</div>,
}));

vi.mock('./SocialPost.ImagesPanel', () => ({
  SocialPostImagesPanel: () => (
    <div data-testid='social-post-images-panel'>social-post-images-panel</div>
  ),
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
}));

import { SocialPostEditorModal } from './SocialPost.EditorModal';

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
  imageAssets: [{ id: 'image-1', url: '/image-1.jpg', filename: 'image-1.jpg', filepath: '/image-1.jpg' }],
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

describe('SocialPostEditorModal', () => {
  it('uses edit and images tabs inside the modal and switches between them', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      scheduledAt: '2026-03-21T10:30',
      setScheduledAt: vi.fn(),
      handleSave: vi.fn(async () => {}),
      patchMutation: { isPending: false },
      imageAssets: buildPost().imageAssets,
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(
      <SocialPostEditorModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByRole('dialog', { name: 'StudiQ Weekly Update' })).toBeInTheDocument();
    expect(screen.getByTestId('social-post-editor')).toBeInTheDocument();
    expect(screen.getByText('1 image')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Schedule' }));

    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-21T10:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));

    expect(screen.getByTestId('social-post-images-panel')).toBeInTheDocument();
  });
});
