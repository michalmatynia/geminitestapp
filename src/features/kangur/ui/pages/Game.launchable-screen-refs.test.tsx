/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';

import { useGameLaunchableScreenRefs } from './Game.launchable-screen-refs';

describe('useGameLaunchableScreenRefs', () => {
  it('provides a ref for every launchable game screen, including arithmetic fullscreen screens', () => {
    const { result } = renderHook(() => useGameLaunchableScreenRefs());

    expect(Object.keys(result.current).sort()).toEqual([...KANGUR_LAUNCHABLE_GAME_SCREENS].sort());
    expect(result.current.multiplication_array_quiz).toBeTruthy();
    expect(result.current.multiplication_quiz).toBeTruthy();
  });

  it('keeps the launchable screen refs stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useGameLaunchableScreenRefs());

    const firstRefs = result.current;

    rerender();

    expect(result.current.multiplication_array_quiz).toBe(firstRefs.multiplication_array_quiz);
    expect(result.current.multiplication_quiz).toBe(firstRefs.multiplication_quiz);
  });
});
