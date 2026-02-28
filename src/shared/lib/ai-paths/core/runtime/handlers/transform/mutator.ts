import type { StringMutatorOperation } from '@/shared/contracts/ai-paths';
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
} from '../../../utils';

export const handleMutator: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs['context']) as Record<string, unknown> | undefined;
  if (!contextValue) {
    return {};
  }
  const mutatorConfig = node.config?.mutator ?? {
    path: 'entity.title',
    valueTemplate: '{{value}}',
  };
  const targetPath = normalizeMappingPath(mutatorConfig.path ?? '', contextValue);
  if (!targetPath) {
    return { context: contextValue };
  }
  const currentValue = getValueAtMappingPath(contextValue, targetPath);
  const rendered = renderTemplate(
    mutatorConfig.valueTemplate ?? '{{value}}',
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
    } catch {
      return current;
    }
  }
  if (matchMode === 'all') {
    return current.split(search).join(replacement);
  }
  return current.replace(search, replacement);
};

export const handleStringMutator: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const rawInput = coerceInput(nodeInputs['value'] ?? nodeInputs['prompt'] ?? nodeInputs['result']);
  if (rawInput === undefined || rawInput === null) {
    return {};
  }
  const stringConfig = node.config?.stringMutator ?? { operations: [] };
  const operations = Array.isArray(stringConfig.operations) ? stringConfig.operations : [];
  let current = safeStringify(rawInput);
  operations.forEach((operation: StringMutatorOperation): void => {
    switch (operation.type) {
      case 'trim': {
        const mode = operation.mode ?? 'both';
        if (mode === 'start') {
          current = current.trimStart();
        } else if (mode === 'end') {
          current = current.trimEnd();
        } else {
          current = current.trim();
        }
        break;
      }
      case 'replace':
      case 'remove': {
        current = applyStringMutatorReplace(current, operation);
        break;
      }
      case 'case': {
        const mode = operation.mode ?? 'lower';
        if (mode === 'upper') {
          current = current.toUpperCase();
        } else if (mode === 'title') {
          current = current.replace(
            /\w\S*/g,
            (token: string) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
          );
        } else {
          current = current.toLowerCase();
        }
        break;
      }
      case 'append': {
        const value = operation.value ?? '';
        const position = operation.position ?? 'suffix';
        current = position === 'prefix' ? `${value}${current}` : `${current}${value}`;
        break;
      }
      case 'slice': {
        const start = typeof operation.start === 'number' ? operation.start : undefined;
        const end = typeof operation.end === 'number' ? operation.end : undefined;
        current = current.slice(start, end);
        break;
      }
      default:
        break;
    }
  });
  return { value: current };
};
