import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  logicResult: { run: vi.fn(), status: 'idle' },
  logicCalls: [] as Array<unknown>,
}));

vi.mock('../useAiPathsLocalExecution.logic', () => ({
  useAiPathsLocalExecutionLogic: (args: unknown) => {
    mockState.logicCalls.push(args);
    return mockState.logicResult;
  },
}));

import { useAiPathsLocalExecution } from '../useAiPathsLocalExecution';

describe('useAiPathsLocalExecution', () => {
  beforeEach(() => {
    mockState.logicResult = { run: vi.fn(), status: 'idle' };
    mockState.logicCalls.length = 0;
  });

  it('forwards args to useAiPathsLocalExecutionLogic and returns its result', () => {
    const args = { pathId: 'path-1', executionMode: 'local' };

    const { result } = renderHook(() => useAiPathsLocalExecution(args as never));

    expect(mockState.logicCalls).toEqual([args]);
    expect(result.current).toBe(mockState.logicResult);
  });
});
