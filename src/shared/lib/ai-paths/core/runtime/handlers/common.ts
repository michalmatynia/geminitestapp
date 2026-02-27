import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import type { LogicalConditionConfig, LogicalConditionOperator } from '@/shared/contracts/ai-paths';

import { DELAY_OUTPUT_PORTS, ROUTER_OUTPUT_PORTS } from '../../constants';
import {
  coerceInput,
  coerceInputArray,
  safeStringify,
} from '../../utils';

export const handleConstant: NodeHandler = ({ node }: NodeHandlerContext): RuntimePortValues => {
  const constantConfig = node.config?.constant ?? {
    valueType: 'string',
    value: '',
  };
  let value: unknown = constantConfig.value ?? '';
  if (constantConfig.valueType === 'number') {
    value = Number(constantConfig.value ?? 0);
  } else if (constantConfig.valueType === 'boolean') {
    value = String(constantConfig.value ?? 'false') === 'true';
  } else if (constantConfig.valueType === 'json') {
    // using a simple parse here as safeParseJson is in utils and we can't easily import everything
    try {
      value = JSON.parse(String(constantConfig.value ?? '')) as unknown;
    } catch {
      value = null;
    }
  }
  return { value };
};

export const handleMath: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const inputValue = coerceInput(nodeInputs['value']);
  const numeric = Number(inputValue);
  const mathConfig = node.config?.math ?? { operation: 'add', operand: 0 };
  const operand = mathConfig.operand ?? 0;
  if (!Number.isFinite(numeric)) {
    return { value: inputValue };
  }
  let result: number;
  switch (mathConfig.operation) {
    case 'add':
      result = numeric + operand;
      break;
    case 'subtract':
      result = numeric - operand;
      break;
    case 'multiply':
      result = numeric * operand;
      break;
    case 'divide':
      result = operand === 0 ? numeric : numeric / operand;
      break;
    case 'round':
      result = Math.round(numeric);
      break;
    case 'ceil':
      result = Math.ceil(numeric);
      break;
    case 'floor':
      result = Math.floor(numeric);
      break;
    default:
      result = numeric;
  }
  return { value: result };
};

export const handleCompare: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const compareConfig = node.config?.compare ?? {
    operator: 'eq',
    compareTo: '',
    caseSensitive: false,
    message: 'Comparison failed',
  };
  const currentValue = coerceInput(nodeInputs['value']);
  const compareTo = compareConfig.compareTo ?? '';
  const base = safeStringify(currentValue);
  const target = String(compareTo ?? '');
  const value = compareConfig.caseSensitive ? base : base.toLowerCase();
  const targetValue = compareConfig.caseSensitive ? target : target.toLowerCase();
  let valid: boolean;
  switch (compareConfig.operator) {
    case 'eq':
      valid = value === targetValue;
      break;
    case 'neq':
      valid = value !== targetValue;
      break;
    case 'gt':
      valid = Number(value) > Number(targetValue);
      break;
    case 'gte':
      valid = Number(value) >= Number(targetValue);
      break;
    case 'lt':
      valid = Number(value) < Number(targetValue);
      break;
    case 'lte':
      valid = Number(value) <= Number(targetValue);
      break;
    case 'contains':
      valid = value.includes(targetValue);
      break;
    case 'startsWith':
      valid = value.startsWith(targetValue);
      break;
    case 'endsWith':
      valid = value.endsWith(targetValue);
      break;
    case 'isEmpty':
      valid = value.trim() === '';
      break;
    case 'notEmpty':
      valid = value.trim() !== '';
      break;
    default:
      valid = false;
  }
  return {
    value: currentValue,
    valid,
    errors: valid ? [] : [compareConfig.message ?? 'Comparison failed'],
  };
};

const resolveLogicalConditionInput = (
  inputPort: 'value' | 'result' | 'context' | 'bundle',
  fieldPath: string | undefined,
  nodeInputs: RuntimePortValues
): unknown => {
  const raw = coerceInput(nodeInputs[inputPort]);
  if (!fieldPath?.trim()) return raw;
  const parts = fieldPath.split('.');
  let cursor: unknown = raw;
  for (const part of parts) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
};

const evaluateLogicalConditionItem = (
  value: unknown,
  operator: LogicalConditionOperator,
  compareTo: string | undefined,
  caseSensitive: boolean | undefined
): boolean => {
  const asString = safeStringify(value ?? '');
  const normalized = caseSensitive ? asString : asString.toLowerCase();
  const target = caseSensitive
    ? String(compareTo ?? '')
    : String(compareTo ?? '').toLowerCase();

  switch (operator) {
    case 'truthy':
      return Boolean(value);
    case 'falsy':
      return !value;
    case 'equals':
      return normalized === target;
    case 'notEquals':
      return normalized !== target;
    case 'contains':
      return normalized.includes(target);
    case 'notContains':
      return !normalized.includes(target);
    case 'startsWith':
      return normalized.startsWith(target);
    case 'endsWith':
      return normalized.endsWith(target);
    case 'isEmpty':
      return (
        normalized.trim() === '' ||
        normalized.trim() === '[]' ||
        normalized.trim() === '{}'
      );
    case 'notEmpty':
      return (
        normalized.trim() !== '' &&
        normalized.trim() !== '[]' &&
        normalized.trim() !== '{}'
      );
    case 'greaterThan':
      return Number(asString) > Number(compareTo ?? 0);
    case 'lessThan':
      return Number(asString) < Number(compareTo ?? 0);
    case 'greaterThanOrEqual':
      return Number(asString) >= Number(compareTo ?? 0);
    case 'lessThanOrEqual':
      return Number(asString) <= Number(compareTo ?? 0);
    default:
      return false;
  }
};

export const handleLogicalCondition: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const config: LogicalConditionConfig = node.config?.logicalCondition ?? {
    combinator: 'and',
    conditions: [],
  };
  const { combinator, conditions } = config;

  const primaryPort = conditions[0]?.inputPort ?? 'value';
  const primaryValue = coerceInput(nodeInputs[primaryPort]);

  if (!conditions || conditions.length === 0) {
    return { value: primaryValue, valid: true, errors: [] };
  }

  const errors: string[] = [];
  let valid: boolean;

  if (combinator === 'and') {
    valid = true;
    for (const condition of conditions) {
      const val = resolveLogicalConditionInput(
        condition.inputPort,
        condition.fieldPath,
        nodeInputs
      );
      const result = evaluateLogicalConditionItem(
        val,
        condition.operator,
        condition.compareTo,
        condition.caseSensitive
      );
      if (!result) {
        errors.push(`Condition failed: [${condition.inputPort}] ${condition.operator}`);
        valid = false;
        break;
      }
    }
  } else {
    valid = false;
    for (const condition of conditions) {
      const val = resolveLogicalConditionInput(
        condition.inputPort,
        condition.fieldPath,
        nodeInputs
      );
      const result = evaluateLogicalConditionItem(
        val,
        condition.operator,
        condition.compareTo,
        condition.caseSensitive
      );
      if (result) {
        valid = true;
        break;
      }
      errors.push(
        `Condition did not match: [${condition.inputPort}] ${condition.operator}`
      );
    }
    if (valid) {
      errors.length = 0;
    }
  }

  return {
    value: primaryValue,
    valid,
    errors,
  };
};

export const handleRouter: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const config = node.config?.router ?? {
    mode: 'valid',
    matchMode: 'truthy',
    compareTo: '',
  };
  const valueCandidate =
    config.mode === 'valid' ? coerceInput(nodeInputs['valid']) : coerceInput(nodeInputs['value']);
  const compareTarget = config.compareTo ?? '';
  const asString = safeStringify(valueCandidate);
  let shouldPass: boolean;
  switch (config.matchMode) {
    case 'truthy':
      shouldPass = Boolean(valueCandidate);
      break;
    case 'falsy':
      shouldPass = !valueCandidate;
      break;
    case 'equals':
      shouldPass = asString === String(compareTarget);
      break;
    case 'contains':
      shouldPass = asString.includes(String(compareTarget));
      break;
    default:
      shouldPass = Boolean(valueCandidate);
  }
  const next: Record<string, unknown> = {
    valid: shouldPass,
    errors: shouldPass ? [] : ['Router blocked'],
  };
  if (shouldPass) {
    ROUTER_OUTPUT_PORTS.forEach((port: string) => {
      if (port === 'valid' || port === 'errors') return;
      if (nodeInputs[port] !== undefined) {
        next[port] = nodeInputs[port];
      }
    });
  }
  return next;
};

export const handleGate: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs['context']) as
    | Record<string, unknown>
    | undefined;
  const validInput = coerceInput(nodeInputs['valid']);
  const errorsInput = coerceInputArray(nodeInputs['errors']);
  const config = node.config?.gate ?? { mode: 'block', failMessage: 'Gate blocked' };
  const isValid = typeof validInput === 'boolean' ? validInput : Boolean(validInput);
  if (!isValid && config.mode === 'block') {
    return {
      context: null,
      valid: false,
      errors: errorsInput.length ? errorsInput : [config.failMessage ?? 'Gate blocked'],
    };
  }
  return {
    context: contextValue,
    valid: isValid,
    errors: errorsInput,
  };
};

export const handleBundle: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const config = node.config?.bundle ?? { includePorts: [] };
  const includePorts = config.includePorts?.length
    ? config.includePorts
    : node.inputs;
  const bundle = includePorts.reduce<Record<string, unknown>>((acc: Record<string, unknown>, port: string) => {
    if (nodeInputs[port] !== undefined) {
      acc[port] = nodeInputs[port];
    }
    return acc;
  }, {});
  return { bundle };
};

export const handleDelay: NodeHandler = async ({
  node,
  nodeInputs,
  executed,
  abortSignal,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (!executed.delay.has(node.id)) {
    const delayMs = node.config?.delay?.ms ?? 300;
    if (abortSignal?.aborted) {
      const abortError = new Error('Operation aborted.');
      (abortError as { name?: string }).name = 'AbortError';
      throw abortError;
    }
    await new Promise<void>((resolve, reject) => {
      if (!abortSignal) {
        setTimeout(resolve, Math.max(0, delayMs));
        return;
      }
      const onAbort = (): void => {
        clearTimeout(timer);
        const abortError = new Error('Operation aborted.');
        (abortError as { name?: string }).name = 'AbortError';
        reject(abortError);
      };
      const timer = setTimeout(() => {
        abortSignal.removeEventListener('abort', onAbort);
        resolve();
      }, Math.max(0, delayMs));
      abortSignal.addEventListener('abort', onAbort, { once: true });
    });
    executed.delay.add(node.id);
  }
  const delayed: Record<string, unknown> = {};
  DELAY_OUTPUT_PORTS.forEach((port: string) => {
    if (nodeInputs[port] !== undefined) {
      delayed[port] = nodeInputs[port];
    }
  });
  return delayed;
};

export const handleViewer: NodeHandler = ({ node, prevOutputs }: NodeHandlerContext): RuntimePortValues => {
  // Viewer mainly displays data in UI, runtime behavior is pass-through or sync
  // Assuming it might pass through inputs to outputs if connected, but standard viewer has no outputs.
  // We check if it has outputs configured (custom viewer?)
  if (node.outputs.length === 0) return prevOutputs;

  // If it has outputs, behave like a bundle/pass-through
  // but viewer inputs are specific.
  // For now return prevOutputs as in original code logic (it wasn't explicit about viewer outputs)
  // Re-reading original code: "case 'viewer'" was not present in the switch, 
  // so it fell through to default? No, the loop iterates all nodes, switch has cases.
  // If no case match, nextOutputs = prevOutputs.
  // Wait, I need to check if viewer was in the switch.
  // "case 'viewer'" is NOT in the big switch I read earlier. 
  // Ah, actually, if I look at "case 'parser'", "case 'mapper'", etc.
  // Viewer likely just holds state in `nextInputs` which UI reads. 
  // But if I want to support viewer passing data, I should check.
  // The normalized definition of viewer has outputs: [] usually.
  
  // So for viewer we just return prevOutputs (empty usually).
  return prevOutputs;
};
