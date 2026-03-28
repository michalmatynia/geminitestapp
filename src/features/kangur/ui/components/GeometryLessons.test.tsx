/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { addXp } from '@/features/kangur/ui/services/progress';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <button type='button' onClick={onFinish}>
      Mock Geometry Drawing Game
    </button>
  ),
}));
vi.mock('@/features/kangur/ui/components/ShapeRecognitionStageGame', () => ({
  default: ({ onFinish }: { onFinish?: () => void }): React.JSX.Element => (
    <button type='button' onClick={onFinish}>
      Mock Shape Recognition Game
    </button>
  ),
}));
vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  default: ({
    gameId,
    onFinish,
  }: {
    gameId: string;
    onFinish: () => void;
  }): React.JSX.Element => {
    const labels: Record<string, string> = {
      geometry_shape_spotter: 'Mock Shape Recognition Game',
      geometry_shape_workshop: 'Mock Geometry Drawing Game',
    };

    return (
      <button type='button' onClick={onFinish}>
        {labels[gameId] ?? `Mock ${gameId}`}
      </button>
    );
  },
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
import GeometryShapeRecognitionLesson from '@/features/kangur/ui/components/GeometryShapeRecognitionLesson';
import GeometryShapesLesson from '@/features/kangur/ui/components/GeometryShapesLesson';
import GeometrySymmetryLesson from '@/features/kangur/ui/components/GeometrySymmetryLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      <KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>
    </NextIntlClientProvider>
  );

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
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.getByRole('button', { name: /wróć do tematów/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: 'Mock Geometry Drawing Game' })).toBeInTheDocument();
    expect(addXp).toHaveBeenCalledTimes(1);
  });

  it('routes the shape recognition practice and draw sections through shared launchable instances', () => {
    renderLesson(<GeometryShapeRecognitionLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-practice'));

    expect(screen.getByTestId('geometry-shape-recognition-practice-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(
      screen.getByRole('button', { name: 'Mock Shape Recognition Game' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-activity-back-button'));
    fireEvent.click(screen.getByTestId('lesson-hub-section-draw'));

    expect(screen.getByTestId('geometry-shape-recognition-draw-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.getByRole('button', { name: 'Mock Geometry Drawing Game' })).toBeInTheDocument();
  });
});
