import { describe, expect, it } from 'vitest';

import {
  INITIAL_RUNTIME_STATUS_STATE,
  runtimeStatusReducer,
} from '../RuntimeContext.status-reducer';

describe('runtimeStatusReducer', () => {
  it('updates run status without mutating the rest of the status slice', () => {
    const next = runtimeStatusReducer(
      {
        ...INITIAL_RUNTIME_STATUS_STATE,
        currentRunId: 'run-1',
        lastRunAt: '2026-04-09T12:00:00.000Z',
      },
      {
        type: 'setRuntimeRunStatus',
        value: 'paused',
      }
    );

    expect(next).toEqual({
      currentRunId: 'run-1',
      lastError: null,
      lastRunAt: '2026-04-09T12:00:00.000Z',
      runtimeRunStatus: 'paused',
    });
  });

  it('stores error payloads and current run identity independently', () => {
    const withError = runtimeStatusReducer(INITIAL_RUNTIME_STATUS_STATE, {
      type: 'setLastError',
      value: {
        message: 'missing handler',
        time: '2026-04-09T12:05:00.000Z',
      },
    });
    const withRunIdentity = runtimeStatusReducer(withError, {
      type: 'setCurrentRunId',
      value: 'run-2',
    });

    expect(withRunIdentity).toEqual({
      currentRunId: 'run-2',
      lastError: {
        message: 'missing handler',
        time: '2026-04-09T12:05:00.000Z',
      },
      lastRunAt: null,
      runtimeRunStatus: 'idle',
    });
  });
});
