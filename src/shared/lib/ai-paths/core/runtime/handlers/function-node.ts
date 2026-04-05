import type { FunctionConfig } from '@/shared/contracts/ai-paths-core/nodes';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

import { parseJsonSafe, safeStringify } from '../../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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

const toObjectRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizePathSegments = (path: string): string[] => path.split('.').filter(Boolean);

const ensureNestedObjectSegment = (
  cursor: Record<string, unknown>,
  segment: string
): Record<string, unknown> => {
  const existing = cursor[segment];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as Record<string, unknown>;
  }

  const next: Record<string, unknown> = {};
  cursor[segment] = next;
  return next;
};

const resolveWritablePath = (
  target: unknown,
  path: string
): { base: Record<string, unknown>; cursor: Record<string, unknown>; segment: string } | null => {
  const segments = normalizePathSegments(path);
  const segment = segments.pop();
  if (!segment) {
    return null;
  }

  const base = toObjectRecord(target);
  const cursor = segments.reduce(
    (current: Record<string, unknown>, part: string) => ensureNestedObjectSegment(current, part),
    base
  );

  return { base, cursor, segment };
};

const setAtPath = (target: unknown, path: string, nextValue: unknown): Record<string, unknown> => {
  if (!path.trim()) {
    return toObjectRecord(target);
  }

  const resolved = resolveWritablePath(target, path);
  if (!resolved) {
    return toObjectRecord(target);
  }

  resolved.cursor[resolved.segment] = nextValue;
  return resolved.base;
};

const cloneValue = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    logClientError(error);
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

const FORBIDDEN_SAFE_MODE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bprocess\./i, label: 'process.*' },
  { pattern: /\brequire\s*\(/i, label: 'require(...)' },
  { pattern: /\bimport\s*\(/i, label: 'import(...)' },
  { pattern: /\beval\s*\(/i, label: 'eval(...)' },
  { pattern: /\bFunction\s*\(/, label: 'Function(...)' },
  { pattern: /\bglobalThis\b/, label: 'globalThis' },
  { pattern: /\bwindow\b/, label: 'window' },
  { pattern: /\bdocument\b/, label: 'document' },
];

const buildFunctionNodeFailure = (
  prevOutputs: RuntimePortValues,
  error: string,
  errorCode: string,
  extra: RuntimePortValues = {}
): RuntimePortValues => ({
  ...prevOutputs,
  ...extra,
  status: 'failed',
  error,
  errorCode,
});

const findForbiddenSafeModeToken = (script: string): string | null => {
  const violated = FORBIDDEN_SAFE_MODE_PATTERNS.find(({ pattern }) => pattern.test(script));
  return violated?.label ?? null;
};

const createFunctionLogger = (logs: string[]): ((...args: unknown[]) => void) => {
  return (...args: unknown[]): void => {
    const payload = args.length === 1 ? args[0] : args;
    logs.push(safeStringify(payload));
  };
};

const compileFunctionScript = (
  script: string
):
  | { ok: true; fn: (inputs: RuntimePortValues, context: Record<string, unknown>) => unknown }
  | { ok: false; error: string } => {
  try {
    return {
      ok: true,
      fn: new Function('inputs', 'context', `"use strict";\n${script}`) as (
        inputs: RuntimePortValues,
        context: Record<string, unknown>
      ) => unknown,
    };
  } catch (error) {
    logClientError(error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Function script compile error: ${error.message}`
          : 'Failed to compile function script.',
    };
  }
};

const hasFunctionExecutionTimedOut = (
  startedAt: number,
  maxExecutionMs: number | undefined
): { elapsedMs: number; timedOut: boolean } => {
  const elapsedMs = Date.now() - startedAt;
  return {
    elapsedMs,
    timedOut: typeof maxExecutionMs === 'number' && elapsedMs > maxExecutionMs,
  };
};

const toFunctionOutputs = (result: unknown): RuntimePortValues =>
  result !== null && typeof result === 'object' && !Array.isArray(result)
    ? (result as RuntimePortValues)
    : { value: result };

const getPrimaryFunctionValue = (outputs: RuntimePortValues, result: unknown): unknown =>
  outputs['value'] !== undefined ? outputs['value'] : result;

const resolveFunctionOutputTypeMismatch = (
  expectedType: FunctionConfig['expectedType'],
  primaryValue: unknown
): string | null => {
  if (!expectedType || primaryValue === undefined) {
    return null;
  }

  const actualTag = resolveTypeTag(primaryValue);
  const matches =
    (expectedType === 'array' && actualTag === 'array') ||
    (expectedType === 'object' && actualTag === 'object') ||
    (expectedType === 'string' && actualTag === 'string') ||
    (expectedType === 'number' && actualTag === 'number') ||
    (expectedType === 'boolean' && actualTag === 'boolean');

  return matches ? null : actualTag;
};

const attachFunctionLogs = (outputs: RuntimePortValues, logs: string[]): RuntimePortValues =>
  logs.length > 0
    ? {
      ...outputs,
      __logs: logs,
    }
    : outputs;

const resolveFunctionOutputSize = (
  outputs: RuntimePortValues,
  maxOutputBytes: number | undefined
): { size: number; exceeded: boolean } => {
  if (typeof maxOutputBytes !== 'number' || maxOutputBytes <= 0) {
    return { size: 0, exceeded: false };
  }

  const serialized = safeStringify(outputs);
  const size = typeof serialized === 'string' ? serialized.length : 0;
  return {
    size,
    exceeded: size > maxOutputBytes,
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

  if (config?.safeMode) {
    const forbiddenToken = findForbiddenSafeModeToken(script);
    if (forbiddenToken) {
      return buildFunctionNodeFailure(
        prevOutputs,
        `Function script blocked by safeMode: forbidden token "${forbiddenToken}".`,
        'FUNCTION_SAFE_MODE_FORBIDDEN_TOKEN'
      );
    }
  }

  const logs: string[] = [];
  const fnContext = {
    ...buildFunctionContext(config),
    log: createFunctionLogger(logs),
  };

  const compiled = compileFunctionScript(script);
  if (!compiled.ok) {
    return buildFunctionNodeFailure(
      prevOutputs,
      compiled.error,
      'FUNCTION_SCRIPT_COMPILE_ERROR'
    );
  }

  const startedAt = Date.now();

  try {
    const result = compiled.fn(nodeInputs, fnContext);

    const timeout = hasFunctionExecutionTimedOut(startedAt, config?.maxExecutionMs);
    if (timeout.timedOut) {
      return buildFunctionNodeFailure(
        prevOutputs,
        `Function script exceeded maxExecutionMs (${timeout.elapsedMs}ms > ${config?.maxExecutionMs}ms).`,
        'FUNCTION_EXECUTION_TIMEOUT'
      );
    }

    let outputs = toFunctionOutputs(result);
    const primaryValue = getPrimaryFunctionValue(outputs, result);
    const outputTypeMismatch = resolveFunctionOutputTypeMismatch(config?.expectedType, primaryValue);
    if (outputTypeMismatch) {
      return buildFunctionNodeFailure(
        prevOutputs,
        `Function output type mismatch: expected ${config?.expectedType}, got ${outputTypeMismatch}.`,
        'FUNCTION_OUTPUT_TYPE_MISMATCH'
      );
    }

    outputs = attachFunctionLogs(outputs, logs);

    const outputSize = resolveFunctionOutputSize(outputs, config?.maxOutputBytes);
    if (outputSize.exceeded) {
      return buildFunctionNodeFailure(
        prevOutputs,
        `Function script output too large (${outputSize.size} bytes > ${config?.maxOutputBytes} bytes).`,
        'FUNCTION_OUTPUT_TOO_LARGE'
      );
    }

    return outputs;
  } catch (error) {
    logClientError(error);
    const serializedError =
      error instanceof Error ? error.message : safeStringify(error ?? 'Unknown error');
    return buildFunctionNodeFailure(
      prevOutputs,
      `Function script execution failed: ${serializedError}`,
      'FUNCTION_SCRIPT_RUNTIME_ERROR',
      {
        errorRaw:
          error instanceof Error
            ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              logs: logs.length > 0 ? logs : undefined,
            }
            : undefined,
      }
    );
  }
};
