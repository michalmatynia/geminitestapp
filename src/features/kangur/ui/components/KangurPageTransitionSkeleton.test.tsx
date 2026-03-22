/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

const { useOptionalKangurRoutingMock } = vi.hoisted(() => ({
  useOptionalKangurRoutingMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
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
  });

  it('uses a fixed full-viewport overlay for standalone non-home non-lessons routes', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='LearnerProfile' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass('fixed', 'inset-0');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('absolute');
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
      'bottom-0',
      'top-[var(--kangur-top-bar-height,88px)]'
    );
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
      'bottom-0',
      'top-[var(--kangur-top-bar-height,88px)]'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('inset-0');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-variant',
      'lessons-library'
    );
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
