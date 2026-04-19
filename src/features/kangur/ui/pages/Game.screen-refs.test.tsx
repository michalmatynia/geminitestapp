/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useGameHomeScreenRefs,
  useGameSessionScreenRefs,
} from './Game.screen-refs';

describe('useGameHomeScreenRefs', () => {
  it('returns only the shared home refs', () => {
    const { result } = renderHook(() => useGameHomeScreenRefs());

    expect(Object.keys(result.current).sort()).toEqual([
      'homeActionsRef',
      'homeAssignmentsRef',
      'homeLeaderboardRef',
      'homeProgressRef',
      'homeQuestRef',
    ]);
    expect(result.current.homeActionsRef).toBeTruthy();
  });

  it('keeps the home refs stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useGameHomeScreenRefs());

    const firstHomeRefs = result.current;

    rerender();

    expect(result.current.homeActionsRef).toBe(firstHomeRefs.homeActionsRef);
    expect(result.current.homeQuestRef).toBe(firstHomeRefs.homeQuestRef);
  });
});

describe('useGameSessionScreenRefs', () => {
  it('returns only the shared standard-session refs', () => {
    const { result } = renderHook(() => useGameSessionScreenRefs());

    expect(Object.keys(result.current).sort()).toEqual([
      'kangurSessionRef',
      'kangurSetupRef',
      'operationSelectorRef',
      'resultLeaderboardRef',
      'resultSummaryRef',
      'trainingSetupRef',
    ]);
    expect(result.current.kangurSessionRef).toBeTruthy();
  });

  it('keeps the shared session refs stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useGameSessionScreenRefs());

    const firstSessionRefs = result.current;

    rerender();

    expect(result.current.kangurSessionRef).toBe(firstSessionRefs.kangurSessionRef);
    expect(result.current.resultSummaryRef).toBe(firstSessionRefs.resultSummaryRef);
  });
});
