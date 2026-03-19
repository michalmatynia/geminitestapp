/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/CalendarTrainingGame', () => ({
  default: () => <div data-testid='mock-calendar-training-game'>Mock Calendar Training</div>,
}));

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: () => <div data-testid='mock-geometry-training-game'>Mock Geometry Training</div>,
}));

import { KangurGameCalendarTrainingWidget } from '@/features/kangur/ui/components/KangurGameCalendarTrainingWidget';
import { KangurGameGeometryTrainingWidget } from '@/features/kangur/ui/components/KangurGameGeometryTrainingWidget';

describe('Kangur game training widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared top section for the calendar training widget', () => {
    const setScreen = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'calendar_quiz',
      setScreen,
    });

    render(<KangurGameCalendarTrainingWidget />);

    expect(screen.getByTestId('kangur-calendar-training-top-section')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByRole('heading', { name: 'screens.calendar_quiz.label' })).toHaveClass(
      'text-lg',
      'sm:text-xl'
    );
    expect(screen.getByRole('button', { name: 'quizBackButton' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-calendar-training-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'quizBackButton' }));

    expect(setScreen).toHaveBeenCalledWith('operation');
  });

  it('uses the shared top section for the geometry training widget and stays hidden off-screen', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    const { rerender } = render(<KangurGameGeometryTrainingWidget />);

    expect(screen.queryByTestId('kangur-geometry-training-top-section')).toBeNull();

    const setScreen = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'geometry_quiz',
      setScreen,
    });

    rerender(<KangurGameGeometryTrainingWidget />);

    expect(screen.getByTestId('kangur-geometry-training-top-section')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByRole('heading', { name: 'screens.geometry_quiz.label' })).toHaveClass(
      'text-lg',
      'sm:text-xl'
    );
    expect(screen.getByRole('button', { name: 'quizBackButton' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-geometry-training-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'quizBackButton' }));

    expect(setScreen).toHaveBeenCalledWith('operation');
  });
});
