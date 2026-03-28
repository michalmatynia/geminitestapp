/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useSocialPostContextMock } = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));

type ListPanelMockProps = {
  header?: React.ReactNode;
  children?: React.ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
};

function MockListPanel(props: ListPanelMockProps): React.JSX.Element {
  const { header, children, isLoading, loadingMessage } = props;
  return (
    <div>
      {header}
      {isLoading ? <div role='status'>{loadingMessage ?? 'Loading...'}</div> : children}
    </div>
  );
}

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
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
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
  ListPanel: MockListPanel,
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () => useSocialPostContextMock(),
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

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts,
        activePostId: 'post-1',
      })
    );

    render(<SocialPostList />);

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
    const setActivePostId = vi.fn();
    const handleOpenPostEditor = vi.fn();

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [buildPost()],
        activePostId: 'post-1',
        setActivePostId,
        handleOpenPostEditor,
      })
    );

    render(<SocialPostList />);

    const row = screen.getByTestId('social-post-row-post-1');
    expect(row).not.toHaveClass('motion-safe:hover:scale-[1.01]');
    expect(row).not.toHaveClass('hover:bg-background/70');

    const nameButton = screen.getByRole('button', { name: 'Open social post StudiQ Social Update' });
    expect(nameButton).toHaveClass('hover:underline');
    expect(nameButton).toHaveClass('hover:text-white/80');

    fireEvent.click(nameButton);

    expect(setActivePostId).toHaveBeenCalledWith('post-1');
    expect(handleOpenPostEditor).toHaveBeenCalledWith('post-1');
  });

  it('keeps delete actions separate from opening the post modal', () => {
    const post = buildPost();
    const setActivePostId = vi.fn();
    const handleOpenPostEditor = vi.fn();
    const setPostToDelete = vi.fn();

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [post],
        activePostId: 'post-1',
        setActivePostId,
        handleOpenPostEditor,
        setPostToDelete,
      })
    );

    render(<SocialPostList />);

    expect(screen.getByRole('button', { name: 'Open post actions' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete post permanently' }));

    expect(setPostToDelete).toHaveBeenCalledWith(post);
    expect(setActivePostId).not.toHaveBeenCalled();
    expect(handleOpenPostEditor).not.toHaveBeenCalled();
  });

  it('renders the shared posts loader while posts are loading', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [],
        activePostId: null,
        postsQuery: { isLoading: true },
      })
    );

    render(<SocialPostList />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading social posts...');
    expect(
      screen.queryByText('No social posts yet. Create a new draft to start.')
    ).not.toBeInTheDocument();
  });
});

function buildSocialPostContextState(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    posts: [buildPost()],
    activePostId: null,
    setActivePostId: vi.fn(),
    postsQuery: { isLoading: false },
    handleOpenPostEditor: vi.fn(),
    handleQuickPublishPost: vi.fn(),
    handleUnpublishPost: vi.fn(),
    publishingPostId: null,
    unpublishingPostId: null,
    setPostToDelete: vi.fn(),
    setPostToUnpublish: vi.fn(),
    clearDeleteError: vi.fn(),
    ...overrides,
  };
}
