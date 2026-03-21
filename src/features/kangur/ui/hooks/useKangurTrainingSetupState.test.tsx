/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurTrainingSetupState } from '@/features/kangur/ui/hooks/useKangurTrainingSetupState';

describe('useKangurTrainingSetupState', () => {
  it('tracks training selections and emits the current payload on start', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useKangurTrainingSetupState({
        onStart,
      })
    );

    expect(result.current.categoryOptions.filter((option) => option.selected)).toHaveLength(7);
    expect(result.current.toggleAllLabel).toBe('Odznacz wszystkie');

    act(() => {
      result.current.toggleAllCategories();
    });

    expect(result.current.categoryOptions.filter((option) => option.selected)).toHaveLength(1);
    expect(result.current.toggleAllLabel).toBe('Zaznacz wszystkie');

    act(() => {
      result.current.countOptions.find((option) => option.value === 20)?.select();
    });

    act(() => {
      result.current.setDifficulty('hard');
    });

    act(() => {
      result.current.startTraining();
    });

    expect(onStart).toHaveBeenCalledWith({
      categories: ['addition'],
      count: 20,
      difficulty: 'hard',
    });
  });

  it('uses the suggested selection as the initial training preset', () => {
    const { result } = renderHook(() =>
      useKangurTrainingSetupState({
        suggestedSelection: {
          categories: ['division'],
          count: 15,
          difficulty: 'hard',
        },
      })
    );

    expect(result.current.selectedCategories).toEqual(['division']);
    expect(result.current.questionCount).toBe(15);
    expect(result.current.difficulty).toBe('hard');
  });
});
