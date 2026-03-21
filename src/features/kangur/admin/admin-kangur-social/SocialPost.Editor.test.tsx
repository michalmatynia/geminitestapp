/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
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
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock('./SocialPost.Visuals', () => ({
  SocialPostVisuals: () => <div data-testid='social-post-visuals'>social-post-visuals</div>,
}));

import { SocialPostEditor } from './SocialPost.Editor';

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

describe('SocialPostEditor', () => {
  it('keeps the editor post-specific and no longer renders general LinkedIn settings', () => {
    render(
      <SocialPostEditor
        activePost={buildPost()}
        editorState={{ titlePl: '', titleEn: '', bodyPl: '', bodyEn: '' }}
        setEditorState={vi.fn()}
        scheduledAt=''
        setScheduledAt={vi.fn()}
        imageAssets={[]}
        handleRemoveImage={vi.fn()}
        setShowMediaLibrary={vi.fn()}
        showMediaLibrary={false}
        handleAddImages={vi.fn()}
        recentAddons={[]}
        recentAddonsLoading={false}
        selectedAddonSet={new Set<string>()}
        handleSelectAddon={vi.fn()}
        handleRemoveAddon={vi.fn()}
        handleSave={vi.fn()}
        handlePublish={vi.fn()}
        saveMutationPending={false}
        patchMutationPending={false}
        publishMutationPending={false}
      />
    );

    expect(screen.getByText('Post editor')).toBeInTheDocument();
    expect(screen.getByTestId('social-post-visuals')).toBeInTheDocument();
    expect(screen.queryByText('LinkedIn connection')).not.toBeInTheDocument();
    expect(screen.queryByText('Default LinkedIn connection')).not.toBeInTheDocument();
    expect(screen.queryByText('Loaded context')).not.toBeInTheDocument();
    expect(screen.queryByText('Documentation references')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schedule' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish to LinkedIn' })).toBeInTheDocument();
  });
});
