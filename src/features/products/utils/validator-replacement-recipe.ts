import type {
  DynamicReplacementSourceModeDto,
  DynamicReplacementMathOperationDto,
  DynamicReplacementRoundModeDto,
  DynamicReplacementResultAssemblyDto,
  DynamicReplacementTargetApplyDto,
  DynamicReplacementLogicOperatorDto,
  DynamicReplacementLogicActionDto,
  DynamicReplacementRecipeDto,
} from '@/shared/contracts/products';
import type { ProductValidationPattern } from '@/shared/types/domain/products';

export const DYNAMIC_REPLACEMENT_PREFIX = '__recipe__:';

export type DynamicReplacementSourceMode = DynamicReplacementSourceModeDto;

export type DynamicReplacementMathOperation = DynamicReplacementMathOperationDto;

export type DynamicReplacementRoundMode = DynamicReplacementRoundModeDto;

export type DynamicReplacementResultAssembly = DynamicReplacementResultAssemblyDto;

export type DynamicReplacementTargetApply = DynamicReplacementTargetApplyDto;

export type DynamicReplacementLogicOperator = DynamicReplacementLogicOperatorDto;

export type DynamicReplacementLogicAction = DynamicReplacementLogicActionDto;

export type DynamicReplacementRecipe = DynamicReplacementRecipeDto;

type DynamicReplacementContext = {
  pattern: Pick<ProductValidationPattern, 'regex' | 'flags'>;
  fieldValue: string;
  formValues: Record<string, unknown>;
  latestProductValues?: Record<string, unknown> | null;
};

const MATH_OPS = new Set<DynamicReplacementMathOperation>([
  'none',
  'add',
  'subtract',
  'multiply',
  'divide',
]);
const ROUND_OPS = new Set<DynamicReplacementRoundMode>(['none', 'round', 'floor', 'ceil']);
const ASSEMBLY_OPS = new Set<DynamicReplacementResultAssembly>([
  'segment_only',
  'source_replace_match',
]);
const TARGET_APPLY_OPS = new Set<DynamicReplacementTargetApply>([
  'replace_whole_field',
  'replace_matched_segment',
]);
const LOGIC_OPS = new Set<DynamicReplacementLogicOperator>([
  'none',
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
]);
const LOGIC_ACTIONS = new Set<DynamicReplacementLogicAction>([
  'keep',
  'set_value',
  'clear',
  'abort',
]);

const normalizeRecipe = (raw: unknown): DynamicReplacementRecipe | null => {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (source['version'] !== 1) return null;

  const sourceMode = source['sourceMode'] as DynamicReplacementSourceMode;
  if (
    sourceMode !== 'current_field' &&
    sourceMode !== 'form_field' &&
    sourceMode !== 'latest_product_field'
  ) {
    return null;
  }

  const sourceField =
    typeof source['sourceField'] === 'string' && source['sourceField'].trim()
      ? source['sourceField'].trim()
      : null;
  if ((sourceMode === 'form_field' || sourceMode === 'latest_product_field') && !sourceField) {
    return null;
  }

  const sourceRegex =
    typeof source['sourceRegex'] === 'string' && source['sourceRegex'].trim()
      ? source['sourceRegex'].trim()
      : null;
  const sourceFlags =
    typeof source['sourceFlags'] === 'string' && source['sourceFlags'].trim()
      ? source['sourceFlags'].trim()
      : null;
  const sourceMatchGroup =
    typeof source['sourceMatchGroup'] === 'number' &&
    Number.isFinite(source['sourceMatchGroup']) &&
    source['sourceMatchGroup'] >= 0
      ? Math.floor(source['sourceMatchGroup'])
      : null;

  const mathOperation =
    typeof source['mathOperation'] === 'string' &&
    MATH_OPS.has(source['mathOperation'] as DynamicReplacementMathOperation)
      ? (source['mathOperation'] as DynamicReplacementMathOperation)
      : 'none';
  const mathOperand =
    typeof source['mathOperand'] === 'number' && Number.isFinite(source['mathOperand'])
      ? source['mathOperand']
      : null;
  const roundMode =
    typeof source['roundMode'] === 'string' &&
    ROUND_OPS.has(source['roundMode'] as DynamicReplacementRoundMode)
      ? (source['roundMode'] as DynamicReplacementRoundMode)
      : 'none';
  const padChar =
    typeof source['padChar'] === 'string' && source['padChar'].length > 0
      ? source['padChar'].charAt(0)
      : null;
  const logicOperator =
    typeof source['logicOperator'] === 'string' &&
    LOGIC_OPS.has(source['logicOperator'] as DynamicReplacementLogicOperator)
      ? (source['logicOperator'] as DynamicReplacementLogicOperator)
      : 'none';
  const logicOperand =
    typeof source['logicOperand'] === 'string'
      ? source['logicOperand']
      : null;
  const logicFlags =
    typeof source['logicFlags'] === 'string' && source['logicFlags'].trim()
      ? source['logicFlags'].trim()
      : null;
  const logicWhenTrueAction =
    typeof source['logicWhenTrueAction'] === 'string' &&
    LOGIC_ACTIONS.has(source['logicWhenTrueAction'] as DynamicReplacementLogicAction)
      ? (source['logicWhenTrueAction'] as DynamicReplacementLogicAction)
      : 'keep';
  const logicWhenTrueValue =
    typeof source['logicWhenTrueValue'] === 'string'
      ? source['logicWhenTrueValue']
      : null;
  const logicWhenFalseAction =
    typeof source['logicWhenFalseAction'] === 'string' &&
    LOGIC_ACTIONS.has(source['logicWhenFalseAction'] as DynamicReplacementLogicAction)
      ? (source['logicWhenFalseAction'] as DynamicReplacementLogicAction)
      : 'keep';
  const logicWhenFalseValue =
    typeof source['logicWhenFalseValue'] === 'string'
      ? source['logicWhenFalseValue']
      : null;
  const resultAssembly =
    typeof source['resultAssembly'] === 'string' &&
    ASSEMBLY_OPS.has(source['resultAssembly'] as DynamicReplacementResultAssembly)
      ? (source['resultAssembly'] as DynamicReplacementResultAssembly)
      : 'segment_only';
  const targetApply =
    typeof source['targetApply'] === 'string' &&
    TARGET_APPLY_OPS.has(source['targetApply'] as DynamicReplacementTargetApply)
      ? (source['targetApply'] as DynamicReplacementTargetApply)
      : 'replace_matched_segment';

  // Correction for padLength which was incorrectly mapped to sizeLength in my head
  const actualPadLength = typeof source['padLength'] === 'number' ? source['padLength'] : null;

  return {
    version: 1,
    sourceMode,
    sourceField,
    sourceRegex,
    sourceFlags,
    sourceMatchGroup,
    mathOperation,
    mathOperand,
    roundMode,
    padLength: actualPadLength,
    padChar,
    logicOperator,
    logicOperand,
    logicFlags,
    logicWhenTrueAction,
    logicWhenTrueValue,
    logicWhenFalseAction,
    logicWhenFalseValue,
    resultAssembly,
    targetApply,
  };
};

const parseRegex = (pattern: string, flags: string | null | undefined): RegExp | null => {
  try {
    return new RegExp(pattern, flags ?? undefined);
  } catch {
    return null;
  }
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const applyMathTransform = (
  value: string,
  operation: DynamicReplacementMathOperation,
  operand: number | null | undefined,
  roundMode: DynamicReplacementRoundMode,
): string | null => {
  if (operation === 'none') return value;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const safeOperand = Number.isFinite(Number(operand)) ? Number(operand) : 0;
  let result = numericValue;
  switch (operation) {
    case 'add':
      result = numericValue + safeOperand;
      break;
    case 'subtract':
      result = numericValue - safeOperand;
      break;
    case 'multiply':
      result = numericValue * safeOperand;
      break;
    case 'divide':
      if (safeOperand === 0) return null;
      result = numericValue / safeOperand;
      break;
  }

  if (roundMode === 'round') result = Math.round(result);
  if (roundMode === 'floor') result = Math.floor(result);
  if (roundMode === 'ceil') result = Math.ceil(result);

  if (!Number.isFinite(result)) return null;
  return Number.isInteger(result) ? String(result) : String(result);
};

export const evaluateStringCondition = ({
  operator,
  value,
  operand,
  flags,
}: {
  operator: DynamicReplacementLogicOperator;
  value: string;
  operand: string | null;
  flags: string | null;
}): boolean => {
  switch (operator) {
    case 'none':
      return true;
    case 'equals':
      return value === (operand ?? '');
    case 'not_equals':
      return value !== (operand ?? '');
    case 'contains':
      return value.includes(operand ?? '');
    case 'starts_with':
      return value.startsWith(operand ?? '');
    case 'ends_with':
      return value.endsWith(operand ?? '');
    case 'regex': {
      if (!operand) return false;
      const regex = parseRegex(operand, flags);
      if (!regex) return false;
      return regex.test(value);
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = Number(value);
      const right = Number(operand);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (operator === 'gt') return left > right;
      if (operator === 'gte') return left >= right;
      if (operator === 'lt') return left < right;
      return left <= right;
    }
    case 'is_empty':
      return value.trim().length === 0;
    case 'is_not_empty':
      return value.trim().length > 0;
  }
};

const applyLogicAction = ({
  action,
  value,
  actionValue,
}: {
  action: DynamicReplacementLogicAction;
  value: string;
  actionValue: string | null;
}): string | null => {
  switch (action) {
    case 'keep':
      return value;
    case 'set_value':
      return actionValue ?? '';
    case 'clear':
      return '';
    case 'abort':
      return null;
  }
};

export const encodeDynamicReplacementRecipe = (recipe: DynamicReplacementRecipe): string =>
  `${DYNAMIC_REPLACEMENT_PREFIX}${JSON.stringify(recipe)}`;

export const parseDynamicReplacementRecipe = (
  replacementValue: string | null | undefined,
): DynamicReplacementRecipe | null => {
  if (typeof replacementValue !== 'string') return null;
  const trimmed = replacementValue.trim();
  if (!trimmed.startsWith(DYNAMIC_REPLACEMENT_PREFIX)) return null;
  const payload = trimmed.slice(DYNAMIC_REPLACEMENT_PREFIX.length);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as unknown;
    return normalizeRecipe(parsed);
  } catch {
    return null;
  }
};

export const isDynamicReplacementValue = (replacementValue: string | null | undefined): boolean =>
  parseDynamicReplacementRecipe(replacementValue) !== null;

export const getStaticReplacementValue = (
  replacementValue: string | null | undefined,
): string | null => {
  if (typeof replacementValue !== 'string') return null;
  if (isDynamicReplacementValue(replacementValue)) return null;
  return replacementValue;
};

export const describeDynamicReplacementRecipe = (
  recipe: DynamicReplacementRecipe | null,
): string => {
  if (!recipe) return 'n/a';
  const sourceBase =
    recipe.sourceMode === 'current_field'
      ? 'current field'
      : recipe.sourceField
        ? `${recipe.sourceMode}:${recipe.sourceField}`
        : recipe.sourceMode;
  const extraction = recipe.sourceRegex ? ` /${recipe.sourceRegex}/${recipe.sourceFlags ?? ''}` : '';
  const captureGroup =
    typeof recipe.sourceMatchGroup === 'number' ? ` group#${recipe.sourceMatchGroup}` : '';
  const math =
    recipe.mathOperation && recipe.mathOperation !== 'none'
      ? ` ${recipe.mathOperation} ${recipe.mathOperand ?? 0}`
      : '';
  const logic =
    recipe.logicOperator && recipe.logicOperator !== 'none'
      ? ` if ${recipe.logicOperator} ${recipe.logicOperand ?? ''} ? ${
        recipe.logicWhenTrueAction ?? 'keep'
      } : ${recipe.logicWhenFalseAction ?? 'keep'}`
      : '';
  const assembly = recipe.resultAssembly ?? 'segment_only';
  const targetApply = recipe.targetApply ?? 'replace_matched_segment';
  return `${sourceBase}${extraction}${captureGroup}${math}${logic} -> ${assembly} -> ${targetApply}`;
};

export const evaluateDynamicReplacementRecipe = (
  recipe: DynamicReplacementRecipe,
  context: DynamicReplacementContext,
): string | null => {
  const { fieldValue, formValues, latestProductValues, pattern } = context;

  let sourceValue: string | null = null;
  if (recipe.sourceMode === 'current_field') {
    sourceValue = fieldValue;
  } else if (recipe.sourceMode === 'form_field') {
    sourceValue = toStringValue(formValues[recipe.sourceField ?? '']);
  } else {
    sourceValue = toStringValue(latestProductValues?.[recipe.sourceField ?? '']);
  }
  if (!sourceValue) return null;

  let extractedValue = sourceValue;
  let sourceMatchIndex = 0;
  let sourceMatchLength = sourceValue.length;
  if (recipe.sourceRegex) {
    const sourceRegex = parseRegex(recipe.sourceRegex, recipe.sourceFlags ?? null);
    if (!sourceRegex) return null;
    const match = sourceRegex.exec(sourceValue);
    if (!match || typeof match.index !== 'number') return null;
    const requestedGroup =
      typeof recipe.sourceMatchGroup === 'number' && recipe.sourceMatchGroup >= 0
        ? Math.floor(recipe.sourceMatchGroup)
        : null;
    const selected =
      requestedGroup !== null
        ? match[requestedGroup]
        : match.length > 1
          ? match[1]
          : match[0];
    if (typeof selected !== 'string') return null;
    extractedValue = selected ?? '';
    sourceMatchIndex = match.index;
    sourceMatchLength = (match[0] ?? '').length;
    if (!extractedValue && sourceMatchLength <= 0) return null;
  }

  const transformed = applyMathTransform(
    extractedValue,
    recipe.mathOperation ?? 'none',
    recipe.mathOperand ?? null,
    recipe.roundMode ?? 'none',
  );
  if (transformed === null) return null;

  let transformedOutput = transformed;
  const padLength = recipe.padLength ?? null;
  if (typeof padLength === 'number' && padLength > 0) {
    transformedOutput = transformedOutput.padStart(padLength, recipe.padChar ?? '0');
  }

  const logicOperator = recipe.logicOperator ?? 'none';
  if (logicOperator !== 'none') {
    const conditionMet = evaluateStringCondition({
      operator: logicOperator,
      value: transformedOutput,
      operand: recipe.logicOperand ?? null,
      flags: recipe.logicFlags ?? null,
    });
    const logicValue = applyLogicAction({
      action: conditionMet
        ? recipe.logicWhenTrueAction ?? 'keep'
        : recipe.logicWhenFalseAction ?? 'keep',
      value: transformedOutput,
      actionValue: conditionMet
        ? recipe.logicWhenTrueValue ?? null
        : recipe.logicWhenFalseValue ?? null,
    });
    if (logicValue === null) return null;
    transformedOutput = logicValue;
  }

  let assembledValue = transformedOutput;
  if ((recipe.resultAssembly ?? 'segment_only') === 'source_replace_match') {
    assembledValue =
      sourceValue.slice(0, sourceMatchIndex) +
      transformedOutput +
      sourceValue.slice(sourceMatchIndex + sourceMatchLength);
  }

  const targetApply = recipe.targetApply ?? 'replace_matched_segment';
  if (targetApply === 'replace_whole_field') {
    return assembledValue;
  }

  const targetRegex = parseRegex(pattern.regex, pattern.flags ?? null);
  if (!targetRegex) return null;
  const targetMatch = targetRegex.exec(fieldValue);
  if (!targetMatch) return null;
  return fieldValue.replace(targetRegex, assembledValue);
};

export const getPatternReplacementPreview = (
  pattern: ProductValidationPattern,
  context: DynamicReplacementContext,
): string | null => {
  if (!pattern.replacementEnabled || !pattern.replacementValue) return null;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return pattern.replacementValue;
  return evaluateDynamicReplacementRecipe(recipe, context);
};
