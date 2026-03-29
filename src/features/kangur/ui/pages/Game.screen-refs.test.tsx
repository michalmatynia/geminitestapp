/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';

import { useGameScreenRefs } from './Game.screen-refs';

describe('useGameScreenRefs', () => {
  it('provides a ref for every launchable game screen, including arithmetic fullscreen screens', () => {
    const { result } = renderHook(() => useGameScreenRefs());

    expect(Object.keys(result.current.sessionRefs.launchableGameScreenRefs).sort()).toEqual(
      [...KANGUR_LAUNCHABLE_GAME_SCREENS].sort()
    );
    expect(result.current.sessionRefs.launchableGameScreenRefs.multiplication_array_quiz).toBeTruthy();
    expect(result.current.sessionRefs.launchableGameScreenRefs.multiplication_quiz).toBeTruthy();
  });

  it('keeps the launchable screen refs stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useGameScreenRefs());

    const firstRefs = result.current.sessionRefs.launchableGameScreenRefs;

    rerender();

    expect(result.current.sessionRefs.launchableGameScreenRefs.multiplication_array_quiz).toBe(
      firstRefs.multiplication_array_quiz
    );
    expect(result.current.sessionRefs.launchableGameScreenRefs.multiplication_quiz).toBe(
      firstRefs.multiplication_quiz
    );
  });
});
