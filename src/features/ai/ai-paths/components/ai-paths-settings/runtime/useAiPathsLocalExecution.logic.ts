import { useMemo } from 'react';
import type { LocalExecutionArgs } from './types';
import { useLocalRunOutcome } from './segments/useLocalRunOutcome';
import { useLocalExecutionLoop } from './segments/useLocalExecutionLoop';
import { useLocalExecutionTriggers } from './segments/useLocalExecutionTriggers';

export function useAiPathsLocalExecutionLogic(args: LocalExecutionArgs) {
  const outcome = useLocalRunOutcome(args);
  const loop = useLocalExecutionLoop(args);
  const triggers = useLocalExecutionTriggers(args, loop, outcome);

  return useMemo(
    () => ({

      ...outcome,
      ...loop,
      ...triggers,
    }),
    [loop, outcome, triggers]
  );
}
