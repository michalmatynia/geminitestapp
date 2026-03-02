import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type { FunctionConfig } from '@/shared/contracts/ai-paths-core/nodes';

import { parseJsonSafe, safeStringify } from '../../utils';

const getAtPath = (value: unknown, path: string): unknown => {
  if (!path.trim()) return value;
  const segments = path.split('.').filter(Boolean);
  let current: unknown = value;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const setAtPath = (
  target: unknown,
  path: string,
  nextValue: unknown
): Record<string, unknown> => {
  const base: Record<string, unknown> =
    target && typeof target === 'object' && !Array.isArray(target)
      ? (target as Record<string, unknown>)
      : {};
  if (!path.trim()) {
    return base;
  }
  const segments = path.split('.').filter(Boolean);
  let cursor: Record<string, unknown> = base;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    if (index === segments.length - 1) {
      cursor[segment] = nextValue;
      break;
    }
    const existing = cursor[segment];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      const next: Record<string, unknown> = {};
      cursor[segment] = next;
      cursor = next;
    } else {
      cursor = existing as Record<string, unknown>;
    }
  }
  return base;
};

const cloneValue = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const ensureNumber = (value: unknown, fallback: number = 0): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const buildFunctionContext = (config: FunctionConfig | undefined): Record<string, unknown> => {
  const baseContext = (() => {
    if (!config?.contextJson) return {};
    const parsed = parseJsonSafe(config.contextJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  })();

  const existingUtils =
    baseContext['utils'] && typeof baseContext['utils'] === 'object'
      ? (baseContext['utils'] as Record<string, unknown>)
      : {};

  const utils = {
    ...existingUtils,
    get: getAtPath,
    set: setAtPath,
    clone: cloneValue,
    ensureNumber,
  };

  return {
    ...baseContext,
    utils,
  };
};

export const handleFunctionNode: NodeHandler = ({
  node,
  nodeInputs,
  prevOutputs,
}: NodeHandlerContext): RuntimePortValues => {
  if (node.type !== 'function') return prevOutputs;

  const config = node.config?.['function'] as FunctionConfig | undefined;
  const script = config?.script?.trim();
  if (!script) {
    return {
      ...prevOutputs,
      status: 'failed',
      error: 'Function script is empty.',
      errorCode: 'FUNCTION_SCRIPT_EMPTY',
    };
  }

  const fnContext = buildFunctionContext(config);

  let fn: (inputs: RuntimePortValues, context: Record<string, unknown>) => unknown;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function(
      'inputs',
      'context',
      `"use strict";\n${script}`
    ) as (inputs: RuntimePortValues, context: Record<string, unknown>) => unknown;
  } catch (error) {
    return {
      ...prevOutputs,
      status: 'failed',
      error:
        error instanceof Error
          ? `Function script compile error: ${error.message}`
          : 'Failed to compile function script.',
      errorCode: 'FUNCTION_SCRIPT_COMPILE_ERROR',
    };
  }

  try {
    const result = fn(nodeInputs, fnContext);

    if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
      return result as RuntimePortValues;
    }

    return {
      value: result as unknown,
    };
  } catch (error) {
    const serializedError =
      error instanceof Error ? error.message : safeStringify(error ?? 'Unknown error');
    return {
      ...prevOutputs,
      status: 'failed',
      error: `Function script execution failed: ${serializedError}`,
      errorCode: 'FUNCTION_SCRIPT_RUNTIME_ERROR',
      errorRaw: error instanceof Error ? { name: error.name, message: error.message } : undefined,
    };
  }
};

