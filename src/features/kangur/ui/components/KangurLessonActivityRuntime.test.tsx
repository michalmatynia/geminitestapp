/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurLessonActivityRuntimeSpec } from '@/shared/contracts/kangur-games';

const {
  addingBallMock,
  addingSynthesisMock,
  divisionMock,
  multiplicationArrayMock,
  multiplicationMock,
  subtractingGardenMock,
} = vi.hoisted(() => ({
  addingBallMock: vi.fn(),
  addingSynthesisMock: vi.fn(),
  divisionMock: vi.fn(),
  multiplicationArrayMock: vi.fn(),
  multiplicationMock: vi.fn(),
  subtractingGardenMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    addingBallMock({ onFinish });
    return <button data-testid='adding-ball-runtime' onClick={onFinish} type='button' />;
  },
}));

vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    addingSynthesisMock({ onFinish });
    return <button data-testid='adding-synthesis-runtime' onClick={onFinish} type='button' />;
  },
}));

vi.mock('@/features/kangur/ui/components/DivisionGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    divisionMock({ onFinish });
    return <button data-testid='division-runtime' onClick={onFinish} type='button' />;
  },
}));

vi.mock('@/features/kangur/ui/components/MultiplicationArrayGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    multiplicationArrayMock({ onFinish });
    return <button data-testid='multiplication-array-runtime' onClick={onFinish} type='button' />;
  },
}));

vi.mock('@/features/kangur/ui/components/MultiplicationGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    multiplicationMock({ onFinish });
    return <button data-testid='multiplication-runtime' onClick={onFinish} type='button' />;
  },
}));

vi.mock('@/features/kangur/ui/components/SubtractingGardenGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }) => {
    subtractingGardenMock({ onFinish });
    return <button data-testid='subtracting-garden-runtime' onClick={onFinish} type='button' />;
  },
}));

import { KangurLessonActivityRuntime } from './KangurLessonActivityRuntime';

describe('KangurLessonActivityRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      activityId: 'adding-ball',
      rendererId: 'adding_ball_game',
      testId: 'adding-ball-runtime',
      mock: addingBallMock,
      title: 'Adding ball',
    },
    {
      activityId: 'adding-synthesis',
      rendererId: 'adding_synthesis_game',
      testId: 'adding-synthesis-runtime',
      mock: addingSynthesisMock,
      title: 'Adding synthesis',
    },
    {
      activityId: 'subtracting-game',
      rendererId: 'subtracting_garden_game',
      testId: 'subtracting-garden-runtime',
      mock: subtractingGardenMock,
      title: 'Subtracting garden',
    },
    {
      activityId: 'multiplication-array',
      rendererId: 'multiplication_array_game',
      testId: 'multiplication-array-runtime',
      mock: multiplicationArrayMock,
      title: 'Multiplication array',
    },
    {
      activityId: 'multiplication-quiz',
      rendererId: 'multiplication_game',
      testId: 'multiplication-runtime',
      mock: multiplicationMock,
      title: 'Multiplication quiz',
    },
    {
      activityId: 'division-game',
      rendererId: 'division_game',
      testId: 'division-runtime',
      mock: divisionMock,
      title: 'Division game',
    },
  ])('renders the $rendererId lesson activity runtime', ({ activityId, mock, rendererId, testId, title }) => {
    const runtime: KangurLessonActivityRuntimeSpec = {
      kind: 'lesson_activity',
      activityId,
      rendererId,
      title,
    };

    render(<KangurLessonActivityRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
