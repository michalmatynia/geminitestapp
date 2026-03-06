import {
  type ParserSampleState,
  type PathConfig,
  type UpdaterSampleState,
} from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { compileGraph } from '@/shared/lib/ai-paths/core/utils/graph';
import { validateCanonicalPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils/node-identity';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';

import { resolvePortablePathInput } from './portable-engine-resolvers';
import {
  type PortablePathValidationMode,
  type PortablePathValidationReport,
  type ValidatePortablePathConfigOptions,
  type ValidatePortablePathInputOptions,
  type ValidatePortablePathInputResult,
} from './portable-engine-types';
export { PortablePathValidationError } from './portable-engine-validation-error';

const coerceSampleStateMap = <T>(value: unknown): Record<string, T> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, T>;
};

export const validatePortablePathConfig = (
  pathConfig: PathConfig,
  options?: ValidatePortablePathConfigOptions
): PortablePathValidationReport => {
  const mode: PortablePathValidationMode = options?.mode ?? 'standard';
  const identityIssues = validateCanonicalPathNodeIdentities(pathConfig, { palette });
  const compileReport = compileGraph(pathConfig.nodes, pathConfig.edges);
  const parserSamples = coerceSampleStateMap<ParserSampleState>(pathConfig.parserSamples);
  const updaterSamples = coerceSampleStateMap<UpdaterSampleState>(pathConfig.updaterSamples);
  const preflightReport =
    mode === 'strict'
      ? evaluateRunPreflight({
        nodes: pathConfig.nodes,
        edges: pathConfig.edges,
        aiPathsValidation: pathConfig.aiPathsValidation,
        strictFlowMode: pathConfig.strictFlowMode !== false,
        triggerNodeId: options?.triggerNodeId ?? null,
        runtimeState:
            pathConfig.runtimeState && typeof pathConfig.runtimeState === 'object'
              ? (pathConfig.runtimeState as RuntimeState)
              : null,
        parserSamples,
        updaterSamples,
        mode: 'full',
      })
      : null;

  return {
    ok:
      identityIssues.length === 0 &&
      compileReport.ok &&
      (preflightReport ? !preflightReport.shouldBlock : true),
    mode,
    pathConfig,
    identityIssues,
    compileReport,
    preflightReport,
  };
};

export const validatePortablePathInput = (
  input: unknown,
  options?: ValidatePortablePathInputOptions
): ValidatePortablePathInputResult => {
  const resolved = resolvePortablePathInput(input, options);
  if (!resolved.ok) return resolved;
  const validation = validatePortablePathConfig(resolved.value.pathConfig, {
    mode: options?.mode,
    triggerNodeId: options?.triggerNodeId,
  });
  return {
    ok: true,
    value: {
      ...validation,
      resolved: resolved.value,
    },
  };
};
