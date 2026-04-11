import type { LastErrorInfo, RuntimeRunStatus, RuntimeStatusState } from './RuntimeContext.shared';

export type RuntimeStatusReducerState = Pick<
  RuntimeStatusState,
  'currentRunId' | 'lastError' | 'lastRunAt' | 'runtimeRunStatus'
>;

export type RuntimeStatusReducerAction =
  | { type: 'setCurrentRunId'; value: string | null }
  | { type: 'setLastError'; value: LastErrorInfo | null }
  | { type: 'setLastRunAt'; value: string | null }
  | { type: 'setRuntimeRunStatus'; value: RuntimeRunStatus };

export const INITIAL_RUNTIME_STATUS_STATE: RuntimeStatusReducerState = {
  currentRunId: null,
  lastError: null,
  lastRunAt: null,
  runtimeRunStatus: 'idle',
};

export const runtimeStatusReducer = (
  state: RuntimeStatusReducerState,
  action: RuntimeStatusReducerAction
): RuntimeStatusReducerState => {
  switch (action.type) {
    case 'setCurrentRunId':
      return {
        ...state,
        currentRunId: action.value,
      };
    case 'setLastError':
      return {
        ...state,
        lastError: action.value,
      };
    case 'setLastRunAt':
      return {
        ...state,
        lastRunAt: action.value,
      };
    case 'setRuntimeRunStatus':
      return {
        ...state,
        runtimeRunStatus: action.value,
      };
    default:
      return state;
  }
};
