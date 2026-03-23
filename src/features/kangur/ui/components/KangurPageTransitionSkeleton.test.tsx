/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

const {
  usePathnameMock,
  useKangurProgressStateMock,
  useOptionalKangurAuthMock,
  useOptionalKangurRoutingMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('KangurPageTransitionSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/en/lessons');
    useOptionalKangurAuthMock.mockReturnValue({
      canAccessParentAssignments: true,
      isAuthenticated: true,
      user: {
        activeLearner: { id: 'learner-1' },
        actorType: 'learner',
      },
    });
    useKangurProgressStateMock.mockReturnValue({
      dailyQuestsCompleted: 0,
      gamesPlayed: 0,
      lessonsCompleted: 0,
      totalXp: 1,
    });
  });

  it('offsets standalone learner-profile overlays below the top navigation host', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='LearnerProfile' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveStyle({
      top: '88px',
    });
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('absolute');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('inset-0');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-variant',
      'learner-profile'
    );
  });

  it('offsets the standalone game-home overlay below the top navigation host', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Game' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveStyle({
      top: '88px',
    });
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('inset-0');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-variant',
      'game-home'
    );
  });

  it('offsets the standalone lessons overlay below the top navigation host', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Lessons' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveStyle({
      top: '88px',
    });
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('inset-0');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-variant',
      'lessons-library'
    );
  });

  it('can render an inline navbar placeholder for lazy page fallbacks without offsetting the overlay', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(
      <KangurPageTransitionSkeleton
        pageKey='Lessons'
        renderInlineTopNavigationSkeleton
      />
    );

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'fixed',
      'inset-0',
      'flex',
      'flex-col'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass(
      'inset-x-0',
      'bottom-0',
    );
    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toHaveClass('shrink-0', 'overflow-hidden');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toHaveStyle({
      height: '88px',
    });
    expect(screen.getByTestId('kangur-page-transition-skeleton-body')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton-shell')).toHaveClass(
      'h-full',
      'min-h-full',
      '[&>div]:h-full',
      '[&>div]:!min-h-full'
    );

    const routeMainContainer = screen
      .getByTestId('kangur-page-transition-skeleton')
      .querySelector('[data-kangur-route-main="false"]');
    if (!routeMainContainer) {
      throw new Error('Expected the inline-navbar transition skeleton to render a route-main container.');
    }

    expect(
      screen
        .getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
        .compareDocumentPosition(routeMainContainer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);
  });

  it('can force a standalone lessons transition shell even while the current Kangur route is embedded', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: true,
    });

    renderWithIntl(
      <KangurPageTransitionSkeleton
        embeddedOverride={false}
        pageKey='Lessons'
        renderInlineTopNavigationSkeleton
      />
    );

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'fixed',
      'inset-0',
      'flex',
      'flex-col'
    );
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeInTheDocument();
  });

  it('uses an explicit top-bar height override for inline navbar skeletons', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(
      <KangurPageTransitionSkeleton
        pageKey='Lessons'
        renderInlineTopNavigationSkeleton
        topBarHeightCssValue='136px'
      />
    );

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveStyle({
      '--kangur-top-bar-height': '136px',
    });
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toHaveStyle({
      height: '136px',
    });
  });

  it('renders with path-based fallback copy when next-intl context is unavailable', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    render(<KangurPageTransitionSkeleton pageKey='Lessons' variant='lessons-library' />);

    expect(screen.getByText('Loading Kangur page')).toBeInTheDocument();
    expect(screen.getAllByText('Lessons')).not.toHaveLength(0);
  });

  it('keeps standalone game-session overlays below the top bar without adding a second top-bar offset', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Competition' variant='game-session' />);

    const skeleton = screen.getByTestId('kangur-page-transition-skeleton');
    expect(skeleton).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0'
    );
    expect(skeleton).toHaveStyle({
      top: '88px',
    });

    const container = skeleton.querySelector('[data-kangur-route-main="false"]');
    if (!container) {
      throw new Error('Expected the standalone game-session skeleton container to render.');
    }

    expect(container).toHaveClass('pt-24', 'sm:pt-28');
    expect(container).not.toHaveClass('pt-[calc(var(--kangur-top-bar-height,88px)+12px)]');
  });

  it('uses an in-shell absolute overlay for embedded Kangur routes', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: true,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Lessons' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'absolute',
      'inset-0'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('fixed');
  });

  it('can force an embedded overlay even while the current Kangur route is standalone', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: false,
    });

    renderWithIntl(
      <KangurPageTransitionSkeleton embeddedOverride pageKey='Game' variant='game-home' />
    );

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass(
      'absolute',
      'inset-0'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('fixed');
    expect(screen.getByTestId('kangur-page-transition-skeleton-shell')).toHaveClass(
      'min-h-full'
    );
  });

  it('renders the focused-lesson skeleton variant when requested', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Lessons' variant='lessons-focus' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-variant',
      'lessons-focus'
    );
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-focus-layout')
    ).toHaveClass('items-center');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-focus-layout')
    ).toHaveClass('w-full');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-focus-header')
    ).toHaveClass('w-full', 'max-w-5xl');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-focus-navigation')
    ).toHaveClass('w-full', 'max-w-5xl');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-focus-content')
    ).toHaveClass('w-full');
  });

  it('keeps the lessons-library transition skeleton centered and narrow', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Lessons' variant='lessons-library' />);

    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-layout')
    ).toHaveClass('max-w-lg', 'items-center');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-intro')
    ).toHaveClass('w-full');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-intro-card')
    ).toHaveClass('w-full', 'text-center');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-intro-art')
    ).toHaveClass('relative', 'w-full', 'max-w-[272px]', 'sm:max-w-[356px]');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-intro-back-button')
        .firstElementChild
    ).toHaveClass('relative', 'mx-auto', 'w-full', 'max-w-fit');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-list')
    ).toHaveClass('w-full', 'flex-col');
  });

  it('matches the centered home progress grid width for the Game transition skeleton', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Game' />);

    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-progress-grid')
    ).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-[900px]',
      'items-start',
      'xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
    );
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-actions-column')
    ).toHaveClass('w-full', 'max-w-[560px]', 'space-y-8', 'sm:space-y-10');
  });

  it('mirrors the Home widget surface shells for the Game transition skeleton', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Game' />);

    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-parent-spotlight-shell')
    ).toHaveClass('kangur-glass-surface-mist', 'kangur-panel-elevated');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-parent-spotlight-inner-shell')
    ).toHaveClass('kangur-glass-surface-solid', 'kangur-panel-subtle');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-actions-shell')
    ).toHaveClass('kangur-glass-surface-mist', 'kangur-panel-soft');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-action-lessons')
    ).toHaveClass('home-action-featured-shell', 'home-action-theme-neutral');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-duels-shell')
    ).toHaveClass('kangur-glass-surface-solid', 'kangur-panel-soft');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-quest-shell')
    ).toHaveClass('kangur-glass-surface-mist-strong', 'kangur-panel-soft');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-assignments-shell')
    ).toHaveClass('kangur-glass-surface-mist', 'kangur-panel-soft');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-leaderboard-shell')
    ).toHaveClass('kangur-glass-surface-solid', 'kangur-panel-soft');
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-player-progress-shell')
    ).toHaveClass('kangur-glass-surface-solid', 'kangur-panel-soft');
  });

  it('keeps the Game home transition skeleton in the same section order as the page it reveals', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Game' />);

    const parentSpotlight = screen.getByTestId(
      'kangur-page-transition-skeleton-game-home-parent-spotlight'
    );
    const actionsColumn = screen.getByTestId(
      'kangur-page-transition-skeleton-game-home-actions-column'
    );
    const quest = screen.getByTestId('kangur-page-transition-skeleton-game-home-quest');
    const summary = screen.getByTestId('kangur-page-transition-skeleton-game-home-summary');
    const assignments = screen.getByTestId(
      'kangur-page-transition-skeleton-game-home-assignments'
    );
    const progressGrid = screen.getByTestId(
      'kangur-page-transition-skeleton-game-home-progress-grid'
    );

    expect(parentSpotlight).toHaveClass('w-full', 'max-w-[900px]');
    expect(quest).toHaveClass('mx-auto', 'w-full', 'max-w-[900px]');
    expect(assignments).toHaveClass('mx-auto', 'w-full', 'max-w-[900px]');

    expect(parentSpotlight.compareDocumentPosition(actionsColumn) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(actionsColumn.compareDocumentPosition(quest) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(quest.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(summary.compareDocumentPosition(assignments) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(assignments.compareDocumentPosition(progressGrid) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('matches the live parent-without-learner home section set instead of rendering hidden learner panels', () => {
    useOptionalKangurAuthMock.mockReturnValue({
      canAccessParentAssignments: false,
      isAuthenticated: true,
      user: {
        activeLearner: null,
        actorType: 'parent',
      },
    });
    useKangurProgressStateMock.mockReturnValue({
      dailyQuestsCompleted: 0,
      gamesPlayed: 0,
      lessonsCompleted: 0,
      totalXp: 0,
    });
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Game' />);

    expect(
      screen.queryByTestId('kangur-page-transition-skeleton-game-home-parent-spotlight')
    ).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton-game-home-actions-column')).toBeInTheDocument();
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-game-home-missing-learner-shell')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton-game-home-quest')).toBeNull();
    expect(screen.queryByTestId('kangur-page-transition-skeleton-game-home-summary')).toBeNull();
    expect(
      screen.queryByTestId('kangur-page-transition-skeleton-game-home-assignments')
    ).toBeNull();
    expect(
      screen.queryByTestId('kangur-page-transition-skeleton-game-home-progress-grid')
    ).toBeNull();
  });

  it('uses a softer blurred overlay for locale-switch skeletons', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(
      <KangurPageTransitionSkeleton
        pageKey='Lessons'
        reason='locale-switch'
        variant='lessons-library'
      />
    );

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-reason',
      'locale-switch'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass('backdrop-blur-md');
    expect(screen.getByRole('status')).not.toHaveTextContent(/^$/);
  });
});
