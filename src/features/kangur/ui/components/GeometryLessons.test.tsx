/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <button type='button' onClick={onFinish}>
      Mock Geometry Drawing Game
    </button>
  ),
}));

vi.mock('@/features/kangur/ui/services/progress', () => ({
  XP_REWARDS: {
    lesson_completed: 40,
  },
  addXp: vi.fn(),
  buildLessonMasteryUpdate: vi.fn(() => ({})),
  loadProgress: vi.fn(() => ({
    lessonsCompleted: 0,
    lessonMastery: {},
  })),
}));

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

    expect(screen.getByText(/odcinek ma poczatek i koniec/i)).toHaveClass('text-slate-500');
  });

  it('uses the lighter helper copy palette in the perimeter lesson', () => {
    renderLesson(<GeometryPerimeterLesson />);

    fireEvent.click(screen.getByRole('button', { name: /obwód kwadratu/i }));

    expect(screen.getByText(/każdy bok ma 3 cm/i)).toHaveClass('text-slate-700');
    expect(screen.getByText(/przykład: a = 5 cm/i)).toHaveClass('text-slate-500');
  });

  it('uses the lighter helper copy palette in the symmetry lesson', () => {
    renderLesson(<GeometrySymmetryLesson />);

    fireEvent.click(screen.getByRole('button', { name: /os symetrii/i }));

    expect(screen.getByText(/pionowa kreska to os symetrii/i)).toHaveClass('text-slate-600');
    expect(screen.getByText(/figura może miec więcej niż jedna os symetrii/i)).toHaveClass(
      'text-slate-500'
    );
  });

  it('uses the lighter game shell and detail copy in the shapes lesson', () => {
    const { unmount } = renderLesson(<GeometryShapesLesson />);

    fireEvent.click(screen.getByRole('button', { name: /boki i rogi/i }));

    expect(screen.getByText('Koło')).toHaveClass('text-slate-800');
    expect(screen.getByText('0 boków i 0 rogów')).toHaveClass('text-slate-500');

    unmount();

    renderLesson(<GeometryShapesLesson />);
    fireEvent.click(screen.getByRole('button', { name: /rysuj figury/i }));

    expect(screen.getByTestId('geometry-shapes-game-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByRole('heading', { name: /ćwiczenia z figurami/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wróć do tematów/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });
});
