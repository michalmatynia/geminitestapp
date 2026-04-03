import type { StringMutatorOperation } from '@/shared/contracts/ai-paths-core/nodes';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import {
  cloneValue,
  coerceInput,
  getValueAtMappingPath,
  normalizeMappingPath,
  renderTemplate,
  setValueAtMappingPath,
  safeStringify,
} from '@/shared/lib/ai-paths/core/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const handleMutator: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs['context']) as Record<string, unknown> | undefined;
  if (!contextValue) {
    return {};
  }
  const mutatorConfigRaw = node.config?.['mutator'];
  const mutatorConfig = (mutatorConfigRaw as Record<string, unknown>) ?? {
    path: 'entity.title',
    valueTemplate: '{{value}}',
  };
  const targetPath = normalizeMappingPath((mutatorConfig['path'] as string) ?? '', contextValue);
  if (!targetPath) {
    return { context: contextValue };
  }
  const currentValue = getValueAtMappingPath(contextValue, targetPath);
  const rendered = renderTemplate(
    (mutatorConfig['valueTemplate'] as string) ?? '{{value}}',
    { ...contextValue, ...nodeInputs } as Record<string, unknown>,
    currentValue
  );
  const updated = cloneValue(contextValue);
  setValueAtMappingPath(updated, targetPath, rendered);
  return { context: updated };
};

const normalizeStringMutatorFlags = (
  flags: string | undefined,
  matchMode: 'first' | 'all' | undefined
): string => {
  const allowed = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
  const seen = new Set<string>();
  const base = Array.from(flags ?? '')
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    })
    .join('');
  if (matchMode === 'all') {
    return base.includes('g') ? base : `${base}g`;
  }
  if (matchMode === 'first') {
    return base.replace(/g/g, '');
  }
  return base;
};

const applyStringMutatorReplace = (
  current: string,
  operation: Extract<StringMutatorOperation, { type: 'replace' | 'remove' }>
): string => {
  const search = operation.search ?? '';
  if (!search) return current;
  const matchMode = operation.matchMode ?? 'all';
  const replacement = operation.type === 'remove' ? '' : (operation.replace ?? '');
  if (operation.useRegex) {
    const flags = normalizeStringMutatorFlags(operation.flags, matchMode);
    try {
      const regex = new RegExp(search, flags);
      return current.replace(regex, replacement);
    } catch (error) {
      logClientError(error);
      return current;
    }
  }
  if (matchMode === 'all') {
    return current.split(search).join(replacement);
  }
  return current.replace(search, replacement);
};

const applyStringMutatorTrim = (
  current: string,
  operation: Extract<StringMutatorOperation, { type: 'trim' }>
): string => {
  const mode = (operation.mode as string) ?? 'both';
  if (mode === 'start' || mode === 'left') {
    return current.trimStart();
  }
  if (mode === 'end' || mode === 'right') {
    return current.trimEnd();
  }
  return current.trim();
};

const applyStringMutatorCase = (
  current: string,
  operation: Extract<StringMutatorOperation, { type: 'case' }>
): string => {
  const mode = (operation.mode as string) ?? 'lower';
  if (mode === 'upper') {
    return current.toUpperCase();
  }
  if (mode === 'title') {
    return current.replace(
      /\w\S*/g,
      (token: string) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
    );
  }
  return current.toLowerCase();
};

const applyStringMutatorAppend = (
  current: string,
  operation: Extract<StringMutatorOperation, { type: 'append' }>
): string => {
  const value = operation.value ?? '';
  return operation.position === 'prefix' ? `${value}${current}` : `${current}${value}`;
};

const applyStringMutatorSlice = (
  current: string,
  operation: Extract<StringMutatorOperation, { type: 'slice' }>
): string => {
  const start = typeof operation.start === 'number' ? operation.start : undefined;
  const end = typeof operation.end === 'number' ? operation.end : undefined;
  return current.slice(start, end);
};

type StringMutatorOperationHandler = (
  current: string,
  operation: StringMutatorOperation
) => string;

const STRING_MUTATOR_OPERATION_HANDLERS: Partial<
  Record<StringMutatorOperation['type'], StringMutatorOperationHandler>
> = {
  trim: (current, operation) =>
    applyStringMutatorTrim(current, operation as Extract<StringMutatorOperation, { type: 'trim' }>),
  replace: (current, operation) =>
    applyStringMutatorReplace(
      current,
      operation as Extract<StringMutatorOperation, { type: 'replace' }>
    ),
  remove: (current, operation) =>
    applyStringMutatorReplace(
      current,
      operation as Extract<StringMutatorOperation, { type: 'remove' }>
    ),
  case: (current, operation) =>
    applyStringMutatorCase(current, operation as Extract<StringMutatorOperation, { type: 'case' }>),
  append: (current, operation) =>
    applyStringMutatorAppend(
      current,
      operation as Extract<StringMutatorOperation, { type: 'append' }>
    ),
  slice: (current, operation) =>
    applyStringMutatorSlice(current, operation as Extract<StringMutatorOperation, { type: 'slice' }>),
};

const applyStringMutatorOperation = (
  current: string,
  operation: StringMutatorOperation
): string => {
  const handler = STRING_MUTATOR_OPERATION_HANDLERS[operation.type];
  return handler ? handler(current, operation) : current;
};

export const handleStringMutator: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const rawInput = coerceInput(nodeInputs['value'] ?? nodeInputs['prompt'] ?? nodeInputs['result']);
  if (rawInput === undefined || rawInput === null) {
    return {};
  }
  const stringConfigRaw = node.config?.['stringMutator'];
  const stringConfig = (stringConfigRaw as Record<string, unknown>) ?? { operations: [] };
  const operations = Array.isArray(stringConfig['operations'])
    ? (stringConfig['operations'] as StringMutatorOperation[])
    : [];
  const value = operations.reduce(
    (current: string, operation: StringMutatorOperation) =>
      applyStringMutatorOperation(current, operation),
    safeStringify(rawInput)
  );
  return { value };
};
