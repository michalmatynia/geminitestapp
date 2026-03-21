/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/shared/ui', () => ({
  ActionMenu: ({
    ariaLabel,
    children,
  }: {
    ariaLabel?: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <button type='button' aria-label={ariaLabel ?? 'Open actions menu'}>
        Actions
      </button>
      <div>{children}</div>
    </div>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    onSelect?: (event: Event) => void;
  }) => (
    <button
      type='button'
      {...props}
      onClick={() => onSelect?.({ preventDefault() {} } as Event)}
    >
      {children}
    </button>
  ),
  ListPanel: ({
    header,
    children,
    isLoading,
    loadingMessage,
  }: {
    header?: React.ReactNode;
    children?: React.ReactNode;
    isLoading?: boolean;
    loadingMessage?: string;
  }) => (
    <div>
      {header}
      {isLoading ? <div role='status'>{loadingMessage ?? 'Loading...'}</div> : children}
    </div>
  ),
}));

import { SocialPostList } from './SocialPost.List';

const buildPost = () => ({
  id: 'post-1',
  titlePl: 'StudiQ Social Update',
  titleEn: 'StudiQ Social Update',
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

describe('SocialPostList', () => {
  it('supports search, status filtering, and pagination for larger post sets', () => {
    const posts = Array.from({ length: 9 }, (_, index) => ({
      ...buildPost(),
      id: `post-${index + 1}`,
      titlePl: index === 8 ? 'Published roadmap highlight' : `Draft update ${index + 1}`,
      titleEn: index === 8 ? 'Published roadmap highlight' : `Draft update ${index + 1}`,
      status: index === 8 ? ('published' as const) : ('draft' as const),
    }));

    render(
      <SocialPostList
        posts={posts}
        activePostId='post-1'
        onSelectPost={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Search social posts')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter posts by status')).toBeInTheDocument();
    expect(screen.getByText('Page 1/2')).toBeInTheDocument();
    expect(screen.queryByText('Draft update 9')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search social posts'), {
      target: { value: 'roadmap' },
    });

    expect(screen.getByText('Published roadmap highlight')).toBeInTheDocument();
    expect(
      screen.queryByText('No social posts match the current search and status filter.')
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter posts by status'), {
      target: { value: 'draft' },
    });

    expect(
      screen.getByText('No social posts match the current search and status filter.')
    ).toBeInTheDocument();
  });

  it('opens the modal from the post name without row hover zoom treatment', () => {
    const onSelectPost = vi.fn();
    const onOpenPost = vi.fn();

    render(
      <SocialPostList
        posts={[buildPost()]}
        activePostId='post-1'
        onSelectPost={onSelectPost}
        onOpenPost={onOpenPost}
      />
    );

    const row = screen.getByTestId('social-post-row-post-1');
    expect(row).not.toHaveClass('motion-safe:hover:scale-[1.01]');
    expect(row).not.toHaveClass('hover:bg-background/70');

    const nameButton = screen.getByRole('button', { name: 'Open social post StudiQ Social Update' });
    expect(nameButton).toHaveClass('hover:underline');
    expect(nameButton).toHaveClass('hover:text-white/80');

    fireEvent.click(nameButton);

    expect(onSelectPost).toHaveBeenCalledWith('post-1');
    expect(onOpenPost).toHaveBeenCalledWith('post-1');
  });

  it('keeps delete actions separate from opening the post modal', () => {
    const onSelectPost = vi.fn();
    const onOpenPost = vi.fn();
    const onDeletePost = vi.fn();
    const post = buildPost();

    render(
      <SocialPostList
        posts={[post]}
        activePostId='post-1'
        onSelectPost={onSelectPost}
        onOpenPost={onOpenPost}
        onDeletePost={onDeletePost}
      />
    );

    expect(screen.getByRole('button', { name: 'Open post actions' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete post permanently' }));

    expect(onDeletePost).toHaveBeenCalledWith(post);
    expect(onSelectPost).not.toHaveBeenCalled();
    expect(onOpenPost).not.toHaveBeenCalled();
  });

  it('renders the shared posts loader while posts are loading', () => {
    render(
      <SocialPostList
        posts={[]}
        activePostId={null}
        isLoading={true}
        onSelectPost={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading social posts...');
    expect(
      screen.queryByText('No social posts yet. Create a new draft to start.')
    ).not.toBeInTheDocument();
  });
});
