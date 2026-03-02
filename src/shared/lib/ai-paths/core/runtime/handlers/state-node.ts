import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type { StateConfig } from '@/shared/contracts/ai-paths-core/nodes';

import { parseJsonSafe } from '../../utils';

const coerceNumber = (value: unknown, fallback: number): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

  if (mode === 'read') {
    let next = current;
    if (next === undefined) {
      const initial =
        config?.initialJson && config.initialJson.trim()
          ? parseJsonSafe(config.initialJson)
          : undefined;
      if (initial !== undefined) {
        setVariable(key, initial);
        next = initial;
      } else if (nodeInputs['value'] !== undefined) {
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
    setVariable(key, next);
    return {
      value: next,
      previous: base,
      delta,
    };
  }

  return prevOutputs;
};

