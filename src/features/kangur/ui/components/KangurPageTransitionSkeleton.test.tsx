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

  it('uses a fixed viewport overlay for standalone Kangur routes', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Lessons' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveClass('fixed', 'inset-0');
    expect(screen.getByTestId('kangur-page-transition-skeleton')).not.toHaveClass('absolute');
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
  });

  it('keeps the lessons-library transition skeleton centered and narrow', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    renderWithIntl(<KangurPageTransitionSkeleton pageKey='Lessons' variant='lessons-library' />);

    expect(
      screen.getByTestId('kangur-page-transition-skeleton-lessons-library-layout')
    ).toHaveClass('max-w-lg');
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
