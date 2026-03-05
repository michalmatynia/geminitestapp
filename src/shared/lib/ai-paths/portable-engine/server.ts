import 'server-only';

import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';

import {
  PortablePathValidationError,
  resolvePortablePathInput,
  runPortablePathClient,
  type PortablePathRunOptions,
  type PortablePathRunResult,
  validatePortablePathConfig,
} from './index';

export { runPortablePathClient };

export const runPortablePathServer = async (
  input: unknown,
  options: PortablePathRunOptions = {}
): Promise<PortablePathRunResult> => {
  const {
    validateBeforeRun = true,
    repairIdentities = true,
    reportAiPathsError,
    ...engineOptions
  } = options;
  const resolved = resolvePortablePathInput(input, { repairIdentities });
  if (!resolved.ok) {
    throw new Error(`Invalid AI-Path payload: ${resolved.error}`);
  }

  const validation = validateBeforeRun ? validatePortablePathConfig(resolved.value.pathConfig) : null;
  if (validation && !validation.ok) {
    throw new PortablePathValidationError(validation);
  }

  const runtimeState = await evaluateGraphServer({
    nodes: resolved.value.pathConfig.nodes,
    edges: resolved.value.pathConfig.edges,
    ...engineOptions,
    reportAiPathsError: reportAiPathsError ?? (() => {}),
  });

  return {
    resolved: resolved.value,
    validation,
    runtimeState,
  };
};
