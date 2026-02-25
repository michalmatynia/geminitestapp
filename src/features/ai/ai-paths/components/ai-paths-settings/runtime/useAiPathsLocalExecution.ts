'use client';

import { useAiPathsLocalExecutionLogic } from './useAiPathsLocalExecution.logic';
import type { LocalExecutionArgs } from './types';

export function useAiPathsLocalExecution(args: LocalExecutionArgs) {
  return useAiPathsLocalExecutionLogic(args);
}
