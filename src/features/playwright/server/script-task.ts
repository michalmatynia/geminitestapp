import 'server-only';

import {
  runPlaywrightConnectionEngineTask,
  type PlaywrightConnectionEngineTaskInput,
  type PlaywrightConnectionEngineTaskResult,
} from './connection-runtime';
import { resolvePlaywrightEngineRunOutputs } from './run-result';

export type PlaywrightConnectionScriptTaskInput = PlaywrightConnectionEngineTaskInput;

export type PlaywrightConnectionScriptTaskResult = PlaywrightConnectionEngineTaskResult & {
  outputs: Record<string, unknown>;
  resultValue: Record<string, unknown>;
  finalUrl: string | null;
};

export const runPlaywrightConnectionScriptTask = async (
  input: PlaywrightConnectionScriptTaskInput
): Promise<PlaywrightConnectionScriptTaskResult> => {
  const task = await runPlaywrightConnectionEngineTask(input);
  const { outputs, resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(task.run.result);

  return {
    ...task,
    outputs,
    resultValue,
    finalUrl,
  };
};
