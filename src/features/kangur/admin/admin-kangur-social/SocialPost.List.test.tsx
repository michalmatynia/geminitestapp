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
  visualAnalysisStatus: null,
  visualAnalysisUpdatedAt: null,
  visualAnalysisJobId: null,
  visualAnalysisModelId: null,
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

  it('marks posts with image analysis and lets search match visual-analysis text', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-visual',
            titlePl: 'Visual refresh',
            titleEn: 'Visual refresh',
            visualSummary: 'The hero now focuses on a larger CTA card for teachers.',
            visualHighlights: ['Larger CTA card', 'Teacher illustration is more central'],
            visualAnalysisStatus: 'completed',
            visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
            visualAnalysisModelId: 'vision-1',
            visualAnalysisJobId: 'job-analysis-1',
          },
          {
            ...buildPost(),
            id: 'post-plain',
            titlePl: 'Plain draft',
            titleEn: 'Plain draft',
          },
        ],
        activePostId: 'post-visual',
      })
    );

    render(<SocialPostList />);

    expect(screen.getByText('Image analysis: Completed')).toBeInTheDocument();
    expect(screen.getByText(/Analyzed /)).toBeInTheDocument();
    expect(screen.getByText('Model: vision-1')).toBeInTheDocument();
    expect(screen.getByText('Job: job-analysis-1')).toBeInTheDocument();
    expect(screen.getByText('2 highlights')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search social posts'), {
      target: { value: 'teacher illustration is more central' },
    });

    expect(screen.getByText('Visual refresh')).toBeInTheDocument();
    expect(screen.queryByText('Plain draft')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search social posts'), {
      target: { value: 'larger CTA card' },
    });

    expect(screen.getByText('Visual refresh')).toBeInTheDocument();
    expect(screen.queryByText('Plain draft')).not.toBeInTheDocument();
  });

  it('shows queued analysis state even before saved results exist', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-queued',
            titlePl: 'Queued visual analysis',
            titleEn: 'Queued visual analysis',
            visualAnalysisStatus: 'queued',
            visualAnalysisJobId: 'job-analysis-queued-1',
            visualAnalysisModelId: 'vision-queued',
          },
        ],
        activePostId: 'post-queued',
      })
    );

    render(<SocialPostList />);

    expect(screen.getByText('Image analysis: Queued')).toBeInTheDocument();
    expect(screen.getByText('Model: vision-queued')).toBeInTheDocument();
    expect(screen.getByText('Job: job-analysis-queued-1')).toBeInTheDocument();
  });

  it('shows live runtime job pills for the active post row', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-active',
            titlePl: 'Active runtime draft',
            titleEn: 'Active runtime draft',
          },
          {
            ...buildPost(),
            id: 'post-other',
            titlePl: 'Other draft',
            titleEn: 'Other draft',
          },
        ],
        activePostId: 'post-active',
        currentVisualAnalysisJob: {
          id: 'job-analysis-live-1',
          status: 'active',
          progress: { message: 'Analyzing visuals for the active draft.' },
          failedReason: null,
        },
        currentGenerationJob: {
          id: 'job-generate-live-1',
          status: 'waiting',
          progress: { message: 'Waiting for the generation worker.' },
          failedReason: null,
        },
        currentPipelineJob: {
          id: 'job-pipeline-live-1',
          status: 'completed',
          progress: { message: 'Pipeline finished for the active draft.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(screen.getByText('Runtime jobs:')).toBeInTheDocument();
    expect(screen.getByText('Image analysis: Running')).toBeInTheDocument();
    expect(screen.getByText('Generate post: Queued')).toBeInTheDocument();
    expect(screen.getByText('Full pipeline: Completed')).toBeInTheDocument();
  });

  it('prefers the live analysis job over saved analysis metadata for the active row badge', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-active',
            titlePl: 'Active analyzed draft',
            titleEn: 'Active analyzed draft',
            visualAnalysisStatus: 'completed',
            visualAnalysisUpdatedAt: '2026-03-20T12:00:00.000Z',
            visualAnalysisModelId: 'vision-1',
            visualAnalysisJobId: 'job-analysis-saved-1',
          },
        ],
        activePostId: 'post-active',
        currentVisualAnalysisJob: {
          id: 'job-analysis-live-2',
          status: 'active',
          progress: { message: 'Refreshing the analysis for the active draft.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(screen.getAllByText('Image analysis: Running')).toHaveLength(2);
    expect(screen.getByText('Job: job-analysis-live-2')).toBeInTheDocument();
    expect(screen.queryByText('Job: job-analysis-saved-1')).not.toBeInTheDocument();
    expect(screen.getByText('Model: vision-1')).toBeInTheDocument();
  });

  it('blocks quick publish controls for the active row while Social runtime jobs are in flight', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-active',
            titlePl: 'Active runtime draft',
            titleEn: 'Active runtime draft',
          },
        ],
        activePostId: 'post-active',
        currentGenerationJob: {
          id: 'job-generate-live-1',
          status: 'waiting',
          progress: { message: 'Waiting for the generation worker.' },
          failedReason: null,
        },
        currentPipelineJob: {
          id: 'job-pipeline-live-1',
          status: 'active',
          progress: { message: 'Pipeline is still updating the draft.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(screen.getByText('Runtime jobs:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wait for the current Social runtime job to finish.' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Wait for the current Social runtime job to finish.' })
    ).toHaveAttribute('title', 'Wait for the current Social runtime job to finish.');
  });

  it('shows the runtime lock reason on draft publish menu actions', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-active',
            titlePl: 'Active runtime draft',
            titleEn: 'Active runtime draft',
          },
        ],
        activePostId: 'post-active',
        currentGenerationJob: {
          id: 'job-generate-live-1',
          status: 'waiting',
          progress: { message: 'Waiting for the generation worker.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(screen.getByRole('button', { name: 'Publish to LinkedIn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish to LinkedIn' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Publish without images' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish without images' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
  });

  it('shows the runtime lock reason on published LinkedIn menu actions', () => {
    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          {
            ...buildPost(),
            id: 'post-active',
            titlePl: 'Published runtime post',
            titleEn: 'Published runtime post',
            status: 'published',
            publishedAt: '2026-03-20T12:00:00.000Z',
            linkedinPostId: 'linkedin-post-1',
            linkedinUrl: 'https://linkedin.example/post/1',
          },
        ],
        activePostId: 'post-active',
        currentPipelineJob: {
          id: 'job-pipeline-live-1',
          status: 'active',
          progress: { message: 'Pipeline is still updating the published draft.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(screen.getByRole('button', { name: 'Unpublish from LinkedIn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unpublish from LinkedIn' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
    expect(screen.getByRole('button', { name: 'Unpublish and delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unpublish and delete' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );
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

  it('selects a post for pipeline without opening the editor modal', () => {
    const setActivePostId = vi.fn();
    const handleOpenPostEditor = vi.fn();

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          buildPost(),
          {
            ...buildPost(),
            id: 'post-2',
            titlePl: 'Second pipeline target',
            titleEn: 'Second pipeline target',
          },
        ],
        activePostId: 'post-1',
        setActivePostId,
        handleOpenPostEditor,
      })
    );

    render(<SocialPostList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Select Second pipeline target for pipeline' })
    );

    expect(setActivePostId).toHaveBeenCalledWith('post-2');
    expect(handleOpenPostEditor).not.toHaveBeenCalled();
  });

  it('blocks switching to another post while Social runtime jobs are still in flight', () => {
    const setActivePostId = vi.fn();
    const handleOpenPostEditor = vi.fn();

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [
          buildPost(),
          {
            ...buildPost(),
            id: 'post-2',
            titlePl: 'Second pipeline target',
            titleEn: 'Second pipeline target',
          },
        ],
        activePostId: 'post-1',
        setActivePostId,
        handleOpenPostEditor,
        currentVisualAnalysisJob: {
          id: 'job-analysis-live-1',
          status: 'active',
          progress: { message: 'Analyzing visuals for the active draft.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(
      screen.getByRole('button', { name: 'Select Second pipeline target for pipeline' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Select Second pipeline target for pipeline' })
    ).toHaveAttribute('title', 'Wait for the current Social runtime job to finish.');
    expect(
      screen.getByRole('button', { name: 'Open social post Second pipeline target' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Open social post Second pipeline target' })
    ).toHaveAttribute('title', 'Wait for the current Social runtime job to finish.');
    expect(screen.getAllByRole('button', { name: 'Edit post' })[1]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Edit post' })[1]).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Open social post Second pipeline target' })
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit post' })[1]);

    expect(setActivePostId).not.toHaveBeenCalled();
    expect(handleOpenPostEditor).not.toHaveBeenCalled();
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

  it('blocks deleting the active post while Social runtime jobs are still in flight', () => {
    const post = buildPost();
    const setPostToDelete = vi.fn();
    const clearDeleteError = vi.fn();

    useSocialPostContextMock.mockReturnValue(
      buildSocialPostContextState({
        posts: [post],
        activePostId: 'post-1',
        setPostToDelete,
        clearDeleteError,
        currentGenerationJob: {
          id: 'job-generate-live-9',
          status: 'waiting',
          progress: { message: 'Waiting for the generation worker.' },
          failedReason: null,
        },
      })
    );

    render(<SocialPostList />);

    expect(screen.getByRole('button', { name: 'Delete post permanently' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete post permanently' })).toHaveAttribute(
      'title',
      'Wait for the current Social runtime job to finish.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete post permanently' }));

    expect(clearDeleteError).not.toHaveBeenCalled();
    expect(setPostToDelete).not.toHaveBeenCalled();
  });

  it('opens the post editor from the three dot menu edit action', () => {
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

    expect(screen.getByRole('button', { name: 'Open post actions' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit post' }));

    expect(setActivePostId).toHaveBeenCalledWith('post-1');
    expect(handleOpenPostEditor).toHaveBeenCalledWith('post-1');
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
    currentVisualAnalysisJob: null,
    currentGenerationJob: null,
    currentPipelineJob: null,
    setPostToDelete: vi.fn(),
    setPostToUnpublish: vi.fn(),
    clearDeleteError: vi.fn(),
    ...overrides,
  };
}
