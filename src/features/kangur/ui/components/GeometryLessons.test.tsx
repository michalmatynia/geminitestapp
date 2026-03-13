/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <button type='button' onClick={onFinish}>
      Mock Geometry Drawing Game
    </button>
  ),
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    addXp: vi.fn(),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 28,
      scorePercent: 100,
      progressUpdates: {},
    })),
    loadProgress: vi.fn(() => createDefaultKangurProgressState()),
  };
});

import GeometryBasicsLesson from '@/features/kangur/ui/components/GeometryBasicsLesson';
import GeometryPerimeterLesson from '@/features/kangur/ui/components/GeometryPerimeterLesson';
import GeometryShapesLesson from '@/features/kangur/ui/components/GeometryShapesLesson';
import GeometrySymmetryLesson from '@/features/kangur/ui/components/GeometrySymmetryLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (ui: ReactNode) =>
  render(<KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>);

describe('Geometry lessons shared surfaces', () => {
  it('uses the lighter helper copy palette in the geometry basics lesson', () => {
    renderLesson(<GeometryBasicsLesson />);

    fireEvent.click(screen.getByRole('button', { name: /punkt i odcinek/i }));

    expect(screen.getByText(/odcinek ma początek i koniec/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('uses the lighter helper copy palette in the perimeter lesson', () => {
    renderLesson(<GeometryPerimeterLesson />);

    fireEvent.click(screen.getByRole('button', { name: /obwód kwadratu/i }));

    expect(screen.getByText(/każdy bok ma 3 cm/i)).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByText(/przykład: a = 5 cm/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('uses the lighter helper copy palette in the symmetry lesson', () => {
    renderLesson(<GeometrySymmetryLesson />);

    fireEvent.click(screen.getByRole('button', { name: /oś symetrii/i }));

    expect(screen.getByText(/pionowa kreska to oś symetrii/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByText(/figura może mieć więcej niż jedną oś symetrii/i)).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('uses the lighter game shell and detail copy in the shapes lesson', () => {
    const { unmount } = renderLesson(<GeometryShapesLesson />);

    fireEvent.click(screen.getByRole('button', { name: /boki i rogi/i }));

    expect(screen.getByText('Koło')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(screen.getByText('0 boków i 0 rogów')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );

    unmount();

    renderLesson(<GeometryShapesLesson />);
    fireEvent.click(screen.getByRole('button', { name: /rysuj figury/i }));

    expect(screen.getByTestId('geometry-shapes-game-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByRole('button', { name: /wróć do tematów/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });
});
