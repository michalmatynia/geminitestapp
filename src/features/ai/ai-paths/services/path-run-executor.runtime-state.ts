import { type RuntimeState, type RuntimePortValues } from '@/shared/contracts/ai-paths';
import { cloneJsonSafe } from '@/shared/lib/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';

export {
  EMPTY_RUNTIME_STATE,
  parseRuntimeState,
} from '@/shared/lib/ai-paths/core/utils/runtime-state';

export const extractNodeErrorOutputs = (error: unknown): RuntimePortValues | null => {
  if (!isObjectRecord(error)) return null;
  const maybeNodeOutput = error['nodeOutput'];
  if (!isObjectRecord(maybeNodeOutput)) return null;
  return cloneJsonSafe(maybeNodeOutput) as RuntimePortValues;
};

export const isSerializablePortValue = (value: unknown): boolean =>
  value !== undefined && typeof value !== 'function' && typeof value !== 'symbol';

export type RuntimePortDropSample = {
  bucket: 'inputs' | 'outputs' | 'nodeOutputs';
  nodeId: string;
  ports: string[];
};

export type RuntimePortDropSummary = {
  inputs: number;
  outputs: number;
  nodeOutputs: number;
  total: number;
  samples: RuntimePortDropSample[];
};

export const collectDroppedRuntimePorts = (
  original: RuntimeState,
  sanitized: RuntimeState
): RuntimePortDropSummary => {
  const summary: RuntimePortDropSummary = {
    inputs: 0,
    outputs: 0,
    nodeOutputs: 0,
    total: 0,
    samples: [],
  };
  const buckets: Array<'inputs' | 'outputs' | 'nodeOutputs'> = ['inputs', 'outputs', 'nodeOutputs'];

  buckets.forEach((bucket) => {
    const originalBucket = original[bucket] || {};
    const sanitizedBucket = sanitized[bucket] || {};

    Object.keys(originalBucket).forEach((nodeId) => {
      const originalPorts = originalBucket[nodeId] || {};
      const sanitizedPorts = sanitizedBucket[nodeId] || {};
      const droppedPorts: string[] = [];

      Object.keys(originalPorts).forEach((portId) => {
        if (!(portId in sanitizedPorts) && originalPorts[portId] !== undefined) {
          droppedPorts.push(portId);
        }
      });

      if (droppedPorts.length > 0) {
        summary[bucket] += droppedPorts.length;
        summary.total += droppedPorts.length;
        if (summary.samples.length < 10) {
          summary.samples.push({ bucket, nodeId, ports: droppedPorts });
        }
      }
    });
  });

  return summary;
};
