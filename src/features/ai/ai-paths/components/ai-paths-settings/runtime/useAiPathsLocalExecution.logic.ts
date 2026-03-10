import { useMemo } from 'react';

import { useLocalExecutionLoop } from './segments/useLocalExecutionLoop';
import { useLocalExecutionTriggers } from './segments/useLocalExecutionTriggers';
import { useLocalRunOutcome } from './segments/useLocalRunOutcome';

import type { LocalExecutionArgs } from './types';

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
