import { cloneJsonSafe } from '@/shared/lib/ai-paths/core/utils/runtime';
import type {
  AiPathRunNodeRecord,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';

type PortBucket = 'inputs' | 'outputs' | 'nodeOutputs';

export type RuntimePortRepairCounts = {
  inputs: number;
  outputs: number;
  nodeOutputs: number;
  total: number;
};

export type RuntimePortRepairResult = {
  runtimeState: RuntimeState;
  changed: boolean;
  counts: RuntimePortRepairCounts;
  nodesTouched: string[];
};

const isSerializablePortValue = (value: unknown): boolean =>
  value !== undefined && typeof value !== 'function' && typeof value !== 'symbol';

const toPortMap = (value: unknown): Record<string, RuntimePortValues> =>
  isObjectRecord(value) ? ({ ...value } as Record<string, RuntimePortValues>) : {};

const toRuntimeState = (value: unknown): RuntimeState => {
  if (!isObjectRecord(value)) {
    return { inputs: {}, outputs: {}, nodeOutputs: {} } as RuntimeState;
  }
  const parsed = value as RuntimeState;
  return {
    ...parsed,
    inputs: toPortMap(parsed.inputs),
    outputs: toPortMap(parsed.outputs),
    nodeOutputs: toPortMap(parsed.nodeOutputs),
  } as RuntimeState;
};

const readLatestHistoryEntry = (value: unknown): RuntimeHistoryEntry | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const entries = value as unknown[];
  const latest = entries[entries.length - 1];
  if (!isObjectRecord(latest)) return null;
  return latest as RuntimeHistoryEntry;
};

const readPortRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const clonePortValue = (value: unknown): unknown => {
  if (value === null) return null;
  if (typeof value !== 'object') return value;
  const safe = cloneJsonSafe(value);
  if (safe === null && value !== null) return undefined;
  return safe;
};

export const repairRuntimeStatePorts = (args: {
  runtimeState: unknown;
  runNodes: AiPathRunNodeRecord[];
}): RuntimePortRepairResult => {
  const current = toRuntimeState(args.runtimeState);
  const nextState: RuntimeState = {
    ...current,
    inputs: { ...(current.inputs ?? {}) },
    outputs: { ...(current.outputs ?? {}) },
    nodeOutputs: { ...(current.nodeOutputs ?? {}) },
  };

  const counts = { inputs: 0, outputs: 0, nodeOutputs: 0 };
  const touched = new Set<string>();

  const ensureNodePorts = (bucket: PortBucket, nodeId: string): Record<string, unknown> => {
    const byNode = nextState[bucket] ?? {};
    nextState[bucket] = byNode;
    const currentPorts = byNode[nodeId];
    if (isObjectRecord(currentPorts)) return currentPorts;
    const initialized: Record<string, unknown> = {};
    byNode[nodeId] = initialized;
    return initialized;
  };

  const addMissingPorts = (
    bucket: PortBucket,
    nodeId: string,
    source: Record<string, unknown> | null
  ): number => {
    if (!source) return 0;
    const target = ensureNodePorts(bucket, nodeId);
    let added = 0;
    Object.entries(source).forEach(([port, value]) => {
      if (!isSerializablePortValue(value)) return;
      if (Object.prototype.hasOwnProperty.call(target, port)) return;
      const cloned = clonePortValue(value);
      if (cloned === undefined && value !== undefined) return;
      target[port] = cloned;
      added += 1;
    });
    if (added > 0) {
      touched.add(nodeId);
    }
    return added;
  };

  args.runNodes.forEach((node) => {
    const nodeId = node.nodeId;
    if (!nodeId) return;
    const nodeInputs = readPortRecord(node.inputs);
    const nodeOutputs = readPortRecord(node.outputs);
    counts.inputs += addMissingPorts('inputs', nodeId, nodeInputs);
    counts.outputs += addMissingPorts('outputs', nodeId, nodeOutputs);
    counts.nodeOutputs += addMissingPorts('nodeOutputs', nodeId, nodeOutputs);
  });

  if (isObjectRecord(current.history)) {
    Object.entries(current.history).forEach(([nodeId, historyEntries]) => {
      const latest = readLatestHistoryEntry(historyEntries);
      if (!latest) return;
      const historyInputs = readPortRecord(latest.inputs);
      const historyOutputs = readPortRecord(latest.outputs);
      counts.inputs += addMissingPorts('inputs', nodeId, historyInputs);
      counts.outputs += addMissingPorts('outputs', nodeId, historyOutputs);
      counts.nodeOutputs += addMissingPorts('nodeOutputs', nodeId, historyOutputs);
    });
  }

  const total = counts.inputs + counts.outputs + counts.nodeOutputs;
  return {
    runtimeState: nextState,
    changed: total > 0,
    counts: {
      ...counts,
      total,
    },
    nodesTouched: Array.from(touched).sort((a, b) => a.localeCompare(b)),
  };
};
