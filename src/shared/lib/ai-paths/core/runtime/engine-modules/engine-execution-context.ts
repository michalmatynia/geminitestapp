import { AiNode, RuntimePortValues } from '@/shared/contracts/ai-paths';
import { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { cloneValue } from '../utils';
import { EngineStateManager } from './engine-state-manager';
import { buildRuntimeTelemetryFields } from './engine-execution-telemetry';
import { type EvaluateGraphOptions, type RuntimeNodeResolutionTelemetry } from './engine-types';

export const buildSpanId = (nodeId: string, attempt: number, nodeIteration: number): string =>
  `${nodeId}:${attempt}:${nodeIteration}`;

export type AppendHistoryEntryArgs = {
  node: AiNode;
  status: 'executed' | 'cached' | 'failed' | 'blocked';
  iteration: number;
  attempt: number;
  inputs: RuntimePortValues;
  outputs: RuntimePortValues;
  inputHash?: string | null;
  activationHash?: string | null;
  cacheDecision?: 'hit' | 'miss' | 'disabled' | 'seed';
  error?: string | null;
  durationMs?: number;
  runtimeTelemetry?: RuntimeNodeResolutionTelemetry | null;
};

export const appendHistoryEntry = (
  state: EngineStateManager,
  options: EvaluateGraphOptions,
  args: AppendHistoryEntryArgs
): void => {
  if (!options['recordHistory']) return;
  const entries = state.history.get(args.node.id) ?? [];
  entries.push({
    timestamp: new Date().toISOString(),
    pathId: options.pathId ?? null,
    pathName: null,
    nodeId: args.node.id,
    nodeType: args.node.type,
    nodeTitle: args.node.title ?? null,
    status: args.status,
    iteration: args.iteration,
    attempt: args.attempt,
    inputs: cloneValue(args.inputs),
    outputs: cloneValue(args.outputs),
    inputHash: args.inputHash ?? null,
    activationHash: args.activationHash ?? null,
    cacheDecision: args.cacheDecision ?? null,
    error: args.error ?? null,
    durationMs: args.durationMs ?? 0,
    ...buildRuntimeTelemetryFields(args.runtimeTelemetry ?? null),
  } as RuntimeHistoryEntry);
  state.history.set(args.node.id, entries);
};
