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

const setAtPath = (target: unknown, path: string, nextValue: unknown): Record<string, unknown> => {
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

const resolveTypeTag = (
  value: unknown
): 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  return 'object';
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

  const config = node.config?.['function'];
  const script = config?.script?.trim();
  if (!script) {
    return {
      ...prevOutputs,
      status: 'failed',
      error: 'Function script is empty.',
      errorCode: 'FUNCTION_SCRIPT_EMPTY',
    };
  }

  const forbiddenPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bprocess\./i, label: 'process.*' },
    { pattern: /\brequire\s*\(/i, label: 'require(...)' },
    { pattern: /\bimport\s*\(/i, label: 'import(...)' },
    { pattern: /\beval\s*\(/i, label: 'eval(...)' },
    { pattern: /\bFunction\s*\(/, label: 'Function(...)' },
    { pattern: /\bglobalThis\b/, label: 'globalThis' },
    { pattern: /\bwindow\b/, label: 'window' },
    { pattern: /\bdocument\b/, label: 'document' },
  ];

  if (config?.safeMode) {
    const violated = forbiddenPatterns.find(({ pattern }) => pattern.test(script));
    if (violated) {
      return {
        ...prevOutputs,
        status: 'failed',
        error: `Function script blocked by safeMode: forbidden token "${violated.label}".`,
        errorCode: 'FUNCTION_SAFE_MODE_FORBIDDEN_TOKEN',
      };
    }
  }

  const logs: string[] = [];
  const fnContext = {
    ...buildFunctionContext(config),
    log: (...args: unknown[]): void => {
      const payload = args.length === 1 ? args[0] : args;
      logs.push(safeStringify(payload));
    },
  };

  let fn: (inputs: RuntimePortValues, context: Record<string, unknown>) => unknown;
  try {
    fn = new Function('inputs', 'context', `"use strict";\n${script}`) as (
      inputs: RuntimePortValues,
      context: Record<string, unknown>
    ) => unknown;
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

  const startedAt = Date.now();

  try {
    const result = fn(nodeInputs, fnContext);

    const elapsedMs = Date.now() - startedAt;
    if (typeof config?.maxExecutionMs === 'number' && elapsedMs > config.maxExecutionMs) {
      return {
        ...prevOutputs,
        status: 'failed',
        error: `Function script exceeded maxExecutionMs (${elapsedMs}ms > ${config.maxExecutionMs}ms).`,
        errorCode: 'FUNCTION_EXECUTION_TIMEOUT',
      };
    }

    let outputs: RuntimePortValues =
      result !== null && typeof result === 'object' && !Array.isArray(result)
        ? (result as RuntimePortValues)
        : { value: result };

    const primaryValue = outputs['value'] !== undefined ? outputs['value'] : result;

    if (config?.expectedType) {
      const actualTag = resolveTypeTag(primaryValue);
      const expected = config.expectedType;
      const matches =
        (expected === 'array' && actualTag === 'array') ||
        (expected === 'object' && actualTag === 'object') ||
        (expected === 'string' && actualTag === 'string') ||
        (expected === 'number' && actualTag === 'number') ||
        (expected === 'boolean' && actualTag === 'boolean');

      if (!matches && primaryValue !== undefined) {
        return {
          ...prevOutputs,
          status: 'failed',
          error: `Function output type mismatch: expected ${expected}, got ${actualTag}.`,
          errorCode: 'FUNCTION_OUTPUT_TYPE_MISMATCH',
        };
      }
    }

    if (logs.length > 0) {
      outputs = {
        ...outputs,
        __logs: logs,
      };
    }

    if (typeof config?.maxOutputBytes === 'number' && config.maxOutputBytes > 0) {
      const serialized = safeStringify(outputs);
      const size = typeof serialized === 'string' ? serialized.length : 0;
      if (size > config.maxOutputBytes) {
        return {
          ...prevOutputs,
          status: 'failed',
          error: `Function script output too large (${size} bytes > ${config.maxOutputBytes} bytes).`,
          errorCode: 'FUNCTION_OUTPUT_TOO_LARGE',
        };
      }
    }

    return outputs;
  } catch (error) {
    const serializedError =
      error instanceof Error ? error.message : safeStringify(error ?? 'Unknown error');
    return {
      ...prevOutputs,
      status: 'failed',
      error: `Function script execution failed: ${serializedError}`,
      errorCode: 'FUNCTION_SCRIPT_RUNTIME_ERROR',
      errorRaw:
        error instanceof Error
          ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            logs: logs.length > 0 ? logs : undefined,
          }
          : undefined,
    };
  }
};
