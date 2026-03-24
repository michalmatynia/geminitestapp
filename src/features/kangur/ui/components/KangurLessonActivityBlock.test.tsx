/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

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
import { KangurLessonPrintProvider } from '@/features/kangur/ui/context/KangurLessonPrintContext';

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
      'kangur-panel-soft',
      'kangur-surface-panel-accent-emerald'
    );
    expect(screen.getByTestId('lesson-activity-block-shell')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('lesson-activity-block-print-summary')).toHaveTextContent(
      'Interactive activity'
    );
    expect(screen.getByTestId('lesson-activity-block-print-summary')).toHaveTextContent(
      'Clock practice'
    );
    expect(screen.getByTestId('lesson-activity-block-print-summary')).toHaveTextContent(
      'Open this lesson on screen to play the interactive task.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'ClockTrainingGame' }));

    expect(screen.getByText(/activity completed/i)).toBeInTheDocument();
    expect(screen.getByText(/activity completed/i).parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByText(/activity completed/i).parentElement).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );
    expect(screen.getByTestId('lesson-activity-block-print-summary')).toHaveTextContent(
      'Completed in the live lesson view.'
    );
    expect(screen.getByRole('button', { name: /restart activity/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
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
      'kangur-panel-soft',
      'kangur-surface-panel-accent-emerald'
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

  it('renders a local print button and targets the activity block panel through the shared lesson print context', () => {
    const onPrintPanel = vi.fn();

    render(
      <KangurLessonPrintProvider onPrintPanel={onPrintPanel}>
        <KangurLessonActivityBlock
          block={{
            id: 'activity-print',
            type: 'activity',
            activityId: 'clock-training',
            title: 'Clock practice',
            description: 'Practice reading time.',
          }}
        />
      </KangurLessonPrintProvider>
    );

    const shell = screen.getByTestId('lesson-activity-block-shell');
    const printButton = screen.getByTestId('lesson-activity-block-print-button');

    expect(shell).toHaveAttribute('data-kangur-print-panel-id', 'lesson-activity-block-activity-print');
    expect(shell).toHaveAttribute('data-kangur-print-panel-title', 'Clock practice');
    expect(printButton).toHaveAttribute('aria-label', 'Drukuj panel');

    fireEvent.click(printButton);

    expect(onPrintPanel).toHaveBeenCalledWith('lesson-activity-block-activity-print');
  });
});
