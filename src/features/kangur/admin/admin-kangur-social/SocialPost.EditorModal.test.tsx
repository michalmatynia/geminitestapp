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
    FormModal: ({
      open,
      title,
      subtitle,
      actions,
      onSave,
      isSaveDisabled,
      hasUnsavedChanges,
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
      hasUnsavedChanges?: boolean;
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
            data-variant={hasUnsavedChanges ? 'success' : 'outline'}
            disabled={Boolean(isSaveDisabled)}
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
    Button: ({
      children,
      variant,
      ...rest
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children: React.ReactNode;
      variant?: string;
    }) => (
      <button data-variant={variant} {...rest}>
        {children}
      </button>
    ),
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

vi.mock('./SocialPost.Editor', () => ({
  SocialPostEditor: () => <div data-testid='social-post-editor'>social-post-editor</div>,
  renderSocialPostEditor: () => <div data-testid='social-post-editor'>social-post-editor</div>,
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
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
});

describe('SocialPostEditorModal', () => {
  it('uses product-style header actions, removes the draft pill, and switches between tabs', () => {
    const handleSave = vi.fn(async () => {});
    const handlePublish = vi.fn(async () => {});

    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      scheduledAt: '2026-03-21T10:30',
      setScheduledAt: vi.fn(),
      hasUnsavedChanges: true,
      handleSave,
      handlePublish,
      patchMutation: { isPending: false },
      publishMutation: { isPending: false },
      currentVisualAnalysisJob: {
        id: 'job-analysis-1',
        status: 'active',
        progress: { message: 'Analyzing the selected screenshots.' },
        failedReason: null,
      },
      currentGenerationJob: {
        id: 'job-generate-1',
        status: 'waiting',
        progress: { message: 'Waiting for the draft generation worker.' },
        failedReason: null,
      },
      currentPipelineJob: {
        id: 'job-pipeline-1',
        status: 'completed',
        progress: { message: 'Pipeline finished and saved the updated draft.' },
        failedReason: null,
      },
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
    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
    expect(screen.getByText('Generate post: Queued')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toHaveAttribute(
      'data-variant',
      'success'
    );
    expect(screen.getByRole('button', { name: 'Publish to LinkedIn' })).toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish to LinkedIn' }));

    expect(handleSave).toHaveBeenCalledWith('draft');
    expect(handlePublish).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Schedule' }));

    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-21T10:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Images' }));

    expect(screen.getByTestId('social-post-images-panel')).toBeInTheDocument();
  });

  it('keeps the save action muted when there are no unsaved changes', () => {
    useSocialPostContextMock.mockReturnValue({
      activePost: buildPost(),
      scheduledAt: '2026-03-21T10:30',
      setScheduledAt: vi.fn(),
      hasUnsavedChanges: false,
      handleSave: vi.fn(async () => {}),
      handlePublish: vi.fn(async () => {}),
      patchMutation: { isPending: false },
      publishMutation: { isPending: false },
      currentVisualAnalysisJob: null,
      currentGenerationJob: null,
      currentPipelineJob: null,
      imageAssets: buildPost().imageAssets,
      handleRemoveImage: vi.fn(),
      setShowMediaLibrary: vi.fn(),
      showMediaLibrary: false,
      handleAddImages: vi.fn(),
    });

    render(
      <SocialPostEditorModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Save draft' })).toHaveAttribute(
      'data-variant',
      'outline'
    );
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });
});
