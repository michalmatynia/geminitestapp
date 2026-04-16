import { useAiPathsLocalExecutionLogic } from './useAiPathsLocalExecution.logic';

import type { LocalExecutionArgs } from './types';

export function useAiPathsLocalExecution(
  args: LocalExecutionArgs
): ReturnType<typeof useAiPathsLocalExecutionLogic> {
  return useAiPathsLocalExecutionLogic(args);
}
