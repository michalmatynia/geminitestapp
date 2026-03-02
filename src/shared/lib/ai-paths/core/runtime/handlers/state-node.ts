import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type { StateConfig } from '@/shared/contracts/ai-paths-core/nodes';

import { parseJsonSafe, safeStringify } from '../../utils';

const coerceNumber = (value: unknown, fallback: number): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const exceedsSizeLimit = (value: unknown, maxBytes?: number | null): boolean => {
  if (!maxBytes || maxBytes <= 0) return false;
  const serialized = safeStringify(value);
  const size = typeof serialized === 'string' ? serialized.length : 0;
  return size > maxBytes;
};

export const handleStateNode: NodeHandler = ({
  node,
  nodeInputs,
  prevOutputs,
  variables,
  setVariable,
}: NodeHandlerContext): RuntimePortValues => {
  if (node.type !== 'state') return prevOutputs;

  const config = node.config?.['state'] as StateConfig | undefined;
  const key = config?.key?.trim();
  const mode = config?.mode ?? 'read';

  if (!key) {
    return {
      ...prevOutputs,
      status: 'failed',
      error: 'State key is required.',
      errorCode: 'STATE_KEY_MISSING',
    };
  }

  const current = variables[key];
  const maxValueBytes = config?.maxValueBytes;

  if (mode === 'read') {
    let next = current;
    if (next === undefined) {
      const initial =
        config?.initialJson && config.initialJson.trim()
          ? parseJsonSafe(config.initialJson)
          : undefined;
      if (initial !== undefined) {
        if (exceedsSizeLimit(initial, maxValueBytes)) {
          return {
            ...prevOutputs,
            status: 'failed',
            error: `State initial value exceeds maxValueBytes limit.`,
            errorCode: 'STATE_VALUE_TOO_LARGE',
          };
        }
        setVariable(key, initial);
        next = initial;
      } else if (nodeInputs['value'] !== undefined) {
        if (exceedsSizeLimit(nodeInputs['value'], maxValueBytes)) {
          return {
            ...prevOutputs,
            status: 'failed',
            error: `State value exceeds maxValueBytes limit.`,
            errorCode: 'STATE_VALUE_TOO_LARGE',
          };
        }
        setVariable(key, nodeInputs['value']);
        next = nodeInputs['value'];
      }
    }
    return {
      value: next,
    };
  }

  if (mode === 'write') {
    const value = nodeInputs['value'];
    if (exceedsSizeLimit(value, maxValueBytes)) {
      return {
        ...prevOutputs,
        status: 'failed',
        error: `State value exceeds maxValueBytes limit.`,
        errorCode: 'STATE_VALUE_TOO_LARGE',
      };
    }
    setVariable(key, value);
    return {
      value,
      previous: current,
    };
  }

  if (mode === 'increment') {
    const base = coerceNumber(current, 0);
    const delta = coerceNumber(nodeInputs['delta'] ?? 1, 1);
    const next = base + delta;
    if (exceedsSizeLimit(next, maxValueBytes)) {
      return {
        ...prevOutputs,
        status: 'failed',
        error: `State value exceeds maxValueBytes limit.`,
        errorCode: 'STATE_VALUE_TOO_LARGE',
      };
    }
    setVariable(key, next);
    return {
      value: next,
      previous: base,
      delta,
    };
  }

  return prevOutputs;
};

