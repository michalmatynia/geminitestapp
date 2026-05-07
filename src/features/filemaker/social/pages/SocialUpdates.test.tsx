/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useSocialPublishingPostsMock,
  trackSocialPublishingClientEventMock,
  openLoginModalMock,
  logoutMock,
  setGuestPlayerNameMock,
  replaceMock,
} = vi.hoisted(() => ({
  useSocialPublishingPostsMock: vi.fn(),
  trackSocialPublishingClientEventMock: vi.fn(),
  openLoginModalMock: vi.fn(),
  logoutMock: vi.fn(),
  setGuestPlayerNameMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/lesson-library/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div data-testid='social-updates-intro'>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='social-updates-layout'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='social-updates-top-nav' />,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    user: null,
    logout: logoutMock,
  }),
  useKangurAuthSessionState: () => ({
    user: null,
    isAuthenticated: false,
    hasResolvedAuth: true,
    canAccessParentAssignments: false,
  }),
  useKangurAuthActions: () => ({
    logout: logoutMock,
    navigateToLogin: vi.fn(),
    checkAppState: vi.fn(),
    selectLearner: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: 'Guest',
    setGuestPlayerName: setGuestPlayerNameMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: openLoginModalMock,
  }),
  useKangurLoginModalActions: () => ({
    openLoginModal: openLoginModalMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/filemaker/social/hooks/useSocialPublishingPosts', () => ({
  useSocialPublishingPosts: (...args: unknown[]) => useSocialPublishingPostsMock(...args),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  KangurInfoCard: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <section>{children}</section>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_INLINE_CENTER_ROW_CLASSNAME: 'inline-center',
  KANGUR_PANEL_GAP_CLASSNAME: 'panel-gap',
  KANGUR_STACK_RELAXED_CLASSNAME: 'stack-relaxed',
}));

vi.mock('@/features/filemaker/social/client-observability', () => ({
  trackSocialPublishingClientEvent: (...args: unknown[]) => trackSocialPublishingClientEventMock(...args),

  isRecoverableSocialPublishingClientFetchError: vi.fn().mockReturnValue(false),}));

import SocialUpdates from '@/features/filemaker/social/pages/SocialUpdates';

const buildPost = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  titlePl: 'Product weekly digest',
  titleEn: 'Product weekly digest',
  bodyPl: 'Polish update body',
  bodyEn: 'English update body',
  combinedBody: '',
  status: 'published',
  scheduledAt: null,
  publishedAt: '2026-03-19T12:00:00.000Z',
  publishedPostId: 'li-post-1',
  publishedUrl: 'https://www.linkedin.com/feed/update/post-1',
  publishingConnectionId: null,
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
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T12:00:00.000Z',
  ...overrides,
});

describe('SocialUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the latest public post and a recent updates archive', () => {
    useSocialPublishingPostsMock.mockReturnValue({
      data: [
        buildPost({
          id: 'post-latest',
          titlePl: 'Latest product release',
          publishedUrl: 'https://www.linkedin.com/feed/update/latest',
        }),
        buildPost({
          id: 'post-older',
          titlePl: 'Earlier archive post',
          bodyPl: 'Archive body copy for the older release.',
          publishedUrl: 'https://www.linkedin.com/feed/update/archive',
          publishedAt: '2026-03-12T12:00:00.000Z',
        }),
      ],
      isLoading: false,
    });

    render(<SocialUpdates />);

    expect(screen.getByRole('heading', { name: 'Social Publishing Updates' })).toBeInTheDocument();
    expect(screen.getByText('Latest product release')).toBeInTheDocument();
    expect(screen.getByText('Recent updates archive')).toBeInTheDocument();
    expect(screen.getByText('Earlier archive post')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View published post' })).toHaveLength(2);
    expect(trackSocialPublishingClientEventMock).toHaveBeenCalledWith(
      'social_publishing_updates_view',
      expect.objectContaining({
        hasPost: true,
        postId: 'post-latest',
        hasPublishedUrl: true,
      })
    );
  });

  it('renders a public post even when the local status drifted back to draft after Publication', () => {
    useSocialPublishingPostsMock.mockReturnValue({
      data: [
        buildPost({
          id: 'post-drifted',
          status: 'draft',
          publishedAt: null,
          publishedPostId: 'li-post-drifted',
          publishedUrl: 'https://www.linkedin.com/feed/update/drifted',
        }),
      ],
      isLoading: false,
    });

    render(<SocialUpdates />);

    expect(screen.getByText('Product weekly digest')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View published post' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/feed/update/drifted'
    );
    expect(trackSocialPublishingClientEventMock).toHaveBeenCalledWith(
      'social_publishing_updates_view',
      expect.objectContaining({
        hasPost: true,
        postId: 'post-drifted',
        hasPublishedUrl: true,
      })
    );
  });

  it('shows the empty state when there are no public posts', () => {
    useSocialPublishingPostsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<SocialUpdates />);

    expect(screen.getByText('No public updates yet')).toBeInTheDocument();
    expect(screen.queryByText('Recent updates archive')).not.toBeInTheDocument();
    expect(trackSocialPublishingClientEventMock).toHaveBeenCalledWith(
      'social_publishing_updates_view',
      expect.objectContaining({
        hasPost: false,
        postId: null,
        hasPublishedUrl: false,
      })
    );
  });
});
