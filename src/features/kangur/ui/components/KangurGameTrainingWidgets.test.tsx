/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
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

  it('uses the shared feature header for the calendar training widget', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'calendar_quiz',
    });

    render(<KangurGameCalendarTrainingWidget />);

    const header = screen.getByTestId('kangur-calendar-training-header');

    expect(within(header).getByRole('heading', { name: /ćwiczenia z kalendarzem/i })).toHaveClass(
      'text-xl',
      'text-green-700'
    );
    expect(within(header).getByText('📅')).toHaveClass(
      'h-12',
      'w-12',
      'bg-emerald-100',
      'text-emerald-700'
    );
    expect(screen.getByTestId('mock-calendar-training-game')).toBeInTheDocument();
  });

  it('uses the shared feature header for the geometry training widget and stays hidden off-screen', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'home',
    });

    const { rerender } = render(<KangurGameGeometryTrainingWidget />);

    expect(screen.queryByTestId('kangur-geometry-training-header')).toBeNull();

    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'geometry_quiz',
    });

    rerender(<KangurGameGeometryTrainingWidget />);

    const header = screen.getByTestId('kangur-geometry-training-header');

    expect(within(header).getByRole('heading', { name: /ćwiczenia z figur/i })).toHaveClass(
      'text-xl',
      'text-violet-700'
    );
    expect(within(header).getByText('🔷')).toHaveClass(
      'h-12',
      'w-12',
      'bg-violet-100',
      'text-violet-700'
    );
    expect(screen.getByTestId('mock-geometry-training-game')).toBeInTheDocument();
  });
});
