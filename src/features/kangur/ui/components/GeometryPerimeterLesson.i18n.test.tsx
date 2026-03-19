/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/components/GeometryPerimeterDrawingGame', () => ({
  default: () => <div>Mock Geometry Perimeter Drawing Game</div>,
}));

import enMessages from '@/i18n/messages/en.json';
import GeometryPerimeterLesson from '@/features/kangur/ui/components/GeometryPerimeterLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (ui: ReactNode = <GeometryPerimeterLesson />) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      <KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>
    </NextIntlClientProvider>
  );

describe('GeometryPerimeterLesson i18n', () => {
  it('renders English hub labels', () => {
    renderLesson();

    expect(screen.getByRole('button', { name: /What is perimeter\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Perimeter of a square/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Perimeter of a rectangle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Game: Draw the perimeter/i })).toBeInTheDocument();
  });

  it('renders English intro and square copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /What is perimeter\?/i }));

    expect(screen.getByText('What is perimeter?')).toBeInTheDocument();
    expect(
      screen.getByText('Perimeter is the total length of the outline of a shape. We add all the sides.')
    ).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Perimeter of a square/i }));

    expect(screen.getByText('Each side is 3 cm')).toBeInTheDocument();
    expect(screen.getByText('Formula for a square:')).toBeInTheDocument();
    expect(screen.getByText('Example: a = 5 cm -> P = 4 × 5 = 20 cm')).toBeInTheDocument();
  });

  it('renders English rectangle and game copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Perimeter of a rectangle/i }));

    expect(screen.getByText('Sides: 6 cm, 4 cm, 6 cm, 4 cm')).toBeInTheDocument();
    expect(screen.getByText('Opposite sides are equal - add the pairs.')).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Game: Draw the perimeter/i }));

    expect(screen.getByText('Mock Geometry Perimeter Drawing Game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to topics/i })).toBeInTheDocument();
  });
});
