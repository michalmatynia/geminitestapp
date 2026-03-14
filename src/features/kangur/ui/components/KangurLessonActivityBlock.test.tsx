/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { createMockGame } = vi.hoisted(() => ({
  createMockGame: (label: string) =>
    function MockGame({ onFinish }: { onFinish: () => void }): React.JSX.Element {
      return (
        <button type='button' onClick={onFinish}>
          {label}
        </button>
      );
    },
}));

vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  default: createMockGame('AddingBallGame'),
}));
vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  default: createMockGame('AddingSynthesisGame'),
}));
vi.mock('@/features/kangur/ui/components/CalendarInteractiveGame', () => ({
  default: createMockGame('CalendarInteractiveGame'),
}));
vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  default: createMockGame('ClockTrainingGame'),
}));
vi.mock('@/features/kangur/ui/components/DivisionGame', () => ({
  default: createMockGame('DivisionGame'),
}));
vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: createMockGame('GeometryDrawingGame'),
}));
vi.mock('@/features/kangur/ui/components/MultiplicationArrayGame', () => ({
  default: createMockGame('MultiplicationArrayGame'),
}));
vi.mock('@/features/kangur/ui/components/MultiplicationGame', () => ({
  default: createMockGame('MultiplicationGame'),
}));
vi.mock('@/features/kangur/ui/components/SubtractingGardenGame', () => ({
  default: createMockGame('SubtractingGardenGame'),
}));

import { KangurLessonActivityBlock } from '@/features/kangur/ui/components/KangurLessonActivityBlock';

describe('KangurLessonActivityBlock', () => {
  it('renders the mapped activity widget in lesson mode and supports restart after completion', () => {
    render(
      <KangurLessonActivityBlock
        block={{
          id: 'activity-1',
          type: 'activity',
          activityId: 'clock-training',
          title: 'Clock practice',
          description: 'Practice reading time.',
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'ClockTrainingGame' })).toBeInTheDocument();
    expect(screen.getByText('Activity')).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('lesson-activity-block-shell')).toHaveClass(
      'glass-panel',
      'border-emerald-200/80'
    );

    fireEvent.click(screen.getByRole('button', { name: 'ClockTrainingGame' }));

    expect(screen.getByText(/activity completed/i)).toBeInTheDocument();
    expect(screen.getByText(/activity completed/i).parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByRole('button', { name: /restart activity/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );

    fireEvent.click(screen.getByRole('button', { name: /restart activity/i }));

    expect(screen.getByRole('button', { name: 'ClockTrainingGame' })).toBeInTheDocument();
  });

  it('renders a placeholder card in editor mode instead of the live game', () => {
    render(
      <KangurLessonActivityBlock
        renderMode='editor'
        block={{
          id: 'activity-2',
          type: 'activity',
          activityId: 'adding-ball',
          title: 'Ball activity',
          description: 'Practice addition.',
        }}
      />
    );

    expect(screen.getByText('Ball activity')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-activity-block-editor-shell')).toHaveClass(
      'glass-panel',
      'border-emerald-200/80'
    );
    expect(screen.getByText(/live game widget is hidden in editor preview/i)).toBeInTheDocument();
    expect(screen.getByText(/live game widget is hidden in editor preview/i).parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
    );
    expect(screen.queryByRole('button', { name: 'AddingBallGame' })).toBeNull();
  });

  it('renders the new addition synthesis activity', () => {
    render(
      <KangurLessonActivityBlock
        block={{
          id: 'activity-3',
          type: 'activity',
          activityId: 'adding-synthesis',
          title: 'Synteza dodawania',
          description: 'Lane-based addition trainer.',
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'AddingSynthesisGame' })).toBeInTheDocument();
  });
});
