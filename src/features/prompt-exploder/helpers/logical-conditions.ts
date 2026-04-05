import { promptExploderSafeJsonStringify } from './formatting';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalJoin,
  PromptExploderLogicalOperator,
} from '../types';

// ── ID generation ───────────────────────────────────────────────────────────

export const createLogicalConditionId = (): string =>
  `condition_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const createLogicalCondition = (
  initial?: Partial<PromptExploderLogicalCondition>
): PromptExploderLogicalCondition => ({
  id: initial?.id ?? createLogicalConditionId(),
  paramPath: (initial?.paramPath ?? '').trim(),
  comparator: initial?.comparator ?? 'truthy',
  value: initial?.value ?? null,
  joinWithPrevious: initial?.joinWithPrevious ?? null,
});

// ── Option constants ────────────────────────────────────────────────────────

export const PROMPT_EXPLODER_LOGICAL_OPERATOR_OPTIONS: Array<
  LabeledOptionDto<PromptExploderLogicalOperator | 'none'>
> = [
  { value: 'none', label: 'No condition' },
  { value: 'if', label: 'If' },
  { value: 'only_if', label: 'Only if' },
  { value: 'unless', label: 'Unless' },
  { value: 'when', label: 'When' },
];

export const PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS: Array<
  LabeledOptionDto<PromptExploderLogicalComparator>
> = [
  { value: 'truthy', label: 'is true' },
  { value: 'falsy', label: 'is false' },
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' },
];

export const PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS: Array<
  LabeledOptionDto<PromptExploderLogicalJoin>
> = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

// ── Type guards ─────────────────────────────────────────────────────────────

export const isLogicalComparator = (value: string): value is PromptExploderLogicalComparator => {
  return PROMPT_EXPLODER_LOGICAL_COMPARATOR_OPTIONS.some((option) => option.value === value);
};

export const isLogicalJoin = (value: string): value is PromptExploderLogicalJoin => {
  return PROMPT_EXPLODER_LOGICAL_JOIN_OPTIONS.some((option) => option.value === value);
};

// ── Normalization ───────────────────────────────────────────────────────────

export const normalizeLogicalOperatorText = (
  value: string
): PromptExploderLogicalOperator | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'if') return 'if';
  if (normalized === 'only if') return 'only_if';
  if (normalized === 'unless') return 'unless';
  if (normalized === 'when') return 'when';
  return null;
};

export const normalizeLogicalComparatorText = (
  value: string | null | undefined
): PromptExploderLogicalComparator | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === '=' || normalized === '==') return 'equals';
  if (normalized === '!=') return 'not_equals';
  if (normalized === '>') return 'gt';
  if (normalized === '>=') return 'gte';
  if (normalized === '<') return 'lt';
  if (normalized === '<=') return 'lte';
  if (normalized === 'contains') return 'contains';
  return null;
};

// ── Value parsing/formatting ────────────────────────────────────────────────

const normalizeLogicalValueInput = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseLogicalBooleanValue = (trimmed: string): boolean | null => {
  if (!/^(true|false)$/i.test(trimmed)) return null;
  return /^true$/i.test(trimmed);
};

const isLogicalNullValue = (trimmed: string): boolean => /^null$/i.test(trimmed);

const parseLogicalNumericValue = (trimmed: string): number | null =>
  /^-?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;

const stripQuotedLogicalValue = (trimmed: string): string | null => {
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }
  return null;
};

export const parseLogicalValueText = (value: string | null | undefined): unknown => {
  const trimmed = normalizeLogicalValueInput(value);
  if (!trimmed) return null;

  const booleanValue = parseLogicalBooleanValue(trimmed);
  if (booleanValue !== null) return booleanValue;
  if (isLogicalNullValue(trimmed)) return null;

  const numericValue = parseLogicalNumericValue(trimmed);
  return numericValue ?? stripQuotedLogicalValue(trimmed) ?? trimmed;
};

export const formatLogicalValueText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  return promptExploderSafeJsonStringify(value);
};

// ── Subsection condition parsing ────────────────────────────────────────────

const SUBSECTION_CONDITION_OPERATOR_REGEX = /^(if|only if|unless|when)\s+(.+)$/i;
const SUBSECTION_CONDITION_EXPRESSION_REGEX =
  /^([A-Za-z_][A-Za-z0-9_.[\]]*)(?:\s*(==|=|!=|>=|<=|>|<|contains)\s*(.+))?$/i;

const parseSubsectionConditionExpression = (
  expression: string
): {
  paramPath: string;
  comparatorText: string | undefined;
  rawValue: string | undefined;
} | null => {
  const expressionMatch = SUBSECTION_CONDITION_EXPRESSION_REGEX.exec(expression);
  if (!expressionMatch) return null;

  const paramPath = (expressionMatch[1] ?? '').trim().replace(/^params\./i, '');
  if (!paramPath) return null;

  return {
    paramPath,
    comparatorText: expressionMatch[2],
    rawValue: expressionMatch[3],
  };
};

const resolveSubsectionComparator = (
  operator: PromptExploderLogicalOperator,
  comparatorText: string | undefined
): PromptExploderLogicalComparator =>
  normalizeLogicalComparatorText(comparatorText) ?? (operator === 'unless' ? 'falsy' : 'truthy');

const resolveSubsectionConditionValue = (
  comparator: PromptExploderLogicalComparator,
  rawValue: string | undefined
): unknown => (comparator === 'truthy' || comparator === 'falsy' ? null : parseLogicalValueText(rawValue));

export const parseSubsectionConditionText = (
  condition: string | null | undefined
): {
  operator: PromptExploderLogicalOperator;
  paramPath: string;
  comparator: PromptExploderLogicalComparator;
  value: unknown;
} | null => {
  const trimmed = (condition ?? '').trim().replace(/:$/, '');
  if (!trimmed) return null;

  const operatorMatch = SUBSECTION_CONDITION_OPERATOR_REGEX.exec(trimmed);
  if (!operatorMatch) return null;

  const operator = normalizeLogicalOperatorText(operatorMatch[1] ?? '');
  if (!operator) return null;

  const expression = (operatorMatch[2] ?? '').trim();
  const parsedExpression = parseSubsectionConditionExpression(expression);
  if (!parsedExpression) return null;

  const comparator = resolveSubsectionComparator(operator, parsedExpression.comparatorText);
  const value = resolveSubsectionConditionValue(comparator, parsedExpression.rawValue);
  return {
    operator,
    paramPath: parsedExpression.paramPath,
    comparator,
    value,
  };
};

export const buildSubsectionConditionText = (input: {
  operator: PromptExploderLogicalOperator | null;
  paramPath: string;
  comparator: PromptExploderLogicalComparator;
  value: unknown;
}): string | null => {
  const operator = input.operator;
  const paramPath = input.paramPath.trim();
  if (!operator || !paramPath) return null;
  const operatorLabel =
    operator === 'only_if'
      ? 'Only if'
      : `${operator.slice(0, 1).toUpperCase()}${operator.slice(1)}`;
  if (input.comparator === 'truthy') return `${operatorLabel} ${paramPath}:`;
  if (input.comparator === 'falsy') return `${operatorLabel} ${paramPath}=false:`;
  if (input.comparator === 'equals')
    return `${operatorLabel} ${paramPath}=${formatLogicalValueText(input.value)}:`;
  if (input.comparator === 'not_equals')
    return `${operatorLabel} ${paramPath}!=${formatLogicalValueText(input.value)}:`;
  if (input.comparator === 'gt')
    return `${operatorLabel} ${paramPath}>${formatLogicalValueText(input.value)}:`;
  if (input.comparator === 'gte')
    return `${operatorLabel} ${paramPath}>=${formatLogicalValueText(input.value)}:`;
  if (input.comparator === 'lt')
    return `${operatorLabel} ${paramPath}<${formatLogicalValueText(input.value)}:`;
  if (input.comparator === 'lte')
    return `${operatorLabel} ${paramPath}<=${formatLogicalValueText(input.value)}:`;
  if (input.comparator === 'contains') {
    return `${operatorLabel} ${paramPath} contains ${formatLogicalValueText(input.value)}:`;
  }
  return `${operatorLabel} ${paramPath}:`;
};
