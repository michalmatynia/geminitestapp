/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useOptionalKangurRoutingMock } = vi.hoisted(() => ({
  useOptionalKangurRoutingMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

import { KangurPageTransitionSkeleton } from '@/features/kangur/ui/components/KangurPageTransitionSkeleton';

describe('KangurPageTransitionSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a fixed viewport overlay for standalone Kangur routes', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
    });

    render(<KangurPageTransitionSkeleton pageKey='Lessons' />);

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

    render(<KangurPageTransitionSkeleton pageKey='Lessons' />);

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

    render(<KangurPageTransitionSkeleton pageKey='Lessons' variant='lessons-focus' />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-kangur-skeleton-variant',
      'lessons-focus'
    );
  });
});
