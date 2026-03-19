import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  outcome: { outcomeOnly: 'outcome', shared: 'outcome-shared' },
  loop: { loopOnly: 'loop', shared: 'loop-shared' },
  triggers: { triggerOnly: 'trigger', shared: 'trigger-shared' },
  outcomeCalls: [] as Array<unknown>,
  loopCalls: [] as Array<unknown>,
  triggerCalls: [] as Array<{ args: unknown; loop: unknown; outcome: unknown }>,
}));

vi.mock('../segments/useLocalRunOutcome', () => ({
  useLocalRunOutcome: (args: unknown) => {
    mockState.outcomeCalls.push(args);
    return mockState.outcome;
  },
}));

vi.mock('../segments/useLocalExecutionLoop', () => ({
  useLocalExecutionLoop: (args: unknown) => {
    mockState.loopCalls.push(args);
    return mockState.loop;
  },
}));

vi.mock('../segments/useLocalExecutionTriggers', () => ({
  useLocalExecutionTriggers: (args: unknown, loop: unknown, outcome: unknown) => {
    mockState.triggerCalls.push({ args, loop, outcome });
    return mockState.triggers;
  },
}));

import { useAiPathsLocalExecutionLogic } from '../useAiPathsLocalExecution.logic';

describe('useAiPathsLocalExecutionLogic', () => {
  beforeEach(() => {
    mockState.outcome = { outcomeOnly: 'outcome', shared: 'outcome-shared' };
    mockState.loop = { loopOnly: 'loop', shared: 'loop-shared' };
    mockState.triggers = { triggerOnly: 'trigger', shared: 'trigger-shared' };
    mockState.outcomeCalls.length = 0;
    mockState.loopCalls.length = 0;
    mockState.triggerCalls.length = 0;
  });

  it('merges outcome, loop, and trigger state with later spreads taking precedence', () => {
    const args = { pathId: 'path-1', mode: 'local' };
    const { result } = renderHook(() => useAiPathsLocalExecutionLogic(args as never));

    expect(mockState.outcomeCalls).toEqual([args]);
    expect(mockState.loopCalls).toEqual([args]);
    expect(mockState.triggerCalls).toEqual([{ args, loop: mockState.loop, outcome: mockState.outcome }]);
    expect(result.current).toEqual({
      outcomeOnly: 'outcome',
      loopOnly: 'loop',
      triggerOnly: 'trigger',
      shared: 'trigger-shared',
    });
  });

  it('preserves the memoized object when segment references do not change and rebuilds when they do', () => {
    const args = { pathId: 'path-2' };
    const { result, rerender } = renderHook(() => useAiPathsLocalExecutionLogic(args as never));
    const initial = result.current;

    rerender();
    expect(result.current).toBe(initial);

    mockState.triggers = { triggerOnly: 'updated-trigger', shared: 'updated-shared' };
    rerender();

    expect(result.current).not.toBe(initial);
    expect(result.current).toEqual({
      outcomeOnly: 'outcome',
      loopOnly: 'loop',
      triggerOnly: 'updated-trigger',
      shared: 'updated-shared',
    });
  });
});
