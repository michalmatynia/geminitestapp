import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
  ProductValidationTarget,
} from '@/shared/contracts/products/validation';
import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/shared/lib/products/constants';
import {
  isPatternEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import {
  allowsProductValidationSemanticOperationExecutionWithoutRegexMatch,
  PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS,
} from '@/shared/lib/products/utils/validator-semantic-operations';
import { getProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);
const FIELD_VALIDATION_HIDDEN_SEMANTIC_OPERATIONS = new Set<string>([
  'parse_marketplace_listing_text',
]);
const FIELD_TARGET_BY_NAME = new Map<string, ProductValidationTarget>([
  ['sku', 'sku'],
  ['price', 'price'],
  ['stock', 'stock'],
  ['categoryId', 'category'],
  ['producerIds', 'producer'],
  ['sizeLength', 'size_length'],
  ['sizeWidth', 'size_width'],
  ['length', 'length'],
  ['weight', 'weight'],
]);

export const isPatternHiddenFromFieldValidation = (
  pattern: ProductValidationPattern
): boolean => {
  const semanticState = getProductValidationSemanticState(pattern);
  if (semanticState === null) return false;
  if (FIELD_VALIDATION_HIDDEN_SEMANTIC_OPERATIONS.has(semanticState.operation)) return true;
  return semanticState.metadata?.['fieldValidation'] === 'disabled';
};

export const normalizeValidationDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

export const normalizePostAcceptBehavior = (
  value: unknown
): ProductValidationPostAcceptBehavior =>
  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate';

export const normalizePatternSequence = (
  pattern: ProductValidationPattern,
  fallbackIndex: number
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

export const normalizePatternChainMode = (
  pattern: ProductValidationPattern
): 'continue' | 'stop_on_match' | 'stop_on_replace' => {
  if (pattern.chainMode === 'stop_on_match' || pattern.chainMode === 'stop_on_replace') {
    return pattern.chainMode;
  }
  return 'continue';
};

export const normalizePatternMaxExecutions = (pattern: ProductValidationPattern): number => {
  if (typeof pattern.maxExecutions !== 'number' || !Number.isFinite(pattern.maxExecutions)) {
    return 1;
  }
  return Math.min(20, Math.max(1, Math.floor(pattern.maxExecutions)));
};

const getSequenceScopeKey = (pattern: ProductValidationPattern): string | null => {
  const groupId = pattern.sequenceGroupId?.trim() ?? '';
  if (groupId.length === 0) return null;
  const normalizedLocale = pattern.locale?.trim().toLowerCase() ?? '*';
  return `${groupId}::${pattern.target}::${normalizedLocale}`;
};

export const buildSequenceGroupCounts = (
  patterns: ProductValidationPattern[]
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const pattern of patterns) {
    if (pattern.enabled !== true) continue;
    const scopeKey = getSequenceScopeKey(pattern);
    if (scopeKey === null) continue;
    counts.set(scopeKey, (counts.get(scopeKey) ?? 0) + 1);
  }
  return counts;
};

export const isPatternInSequenceGroup = (
  pattern: ProductValidationPattern,
  counts: Map<string, number>
): boolean => {
  const scopeKey = getSequenceScopeKey(pattern);
  if (scopeKey === null) return false;
  return (counts.get(scopeKey) ?? 0) > 1;
};

export const sortValidatorPatterns = (
  patterns: ProductValidationPattern[]
): ProductValidationPattern[] =>
  patterns
    .map((pattern: ProductValidationPattern, index: number) => ({ pattern, index }))
    .sort((a, b) => {
      const aSeq = normalizePatternSequence(a.pattern, a.index);
      const bSeq = normalizePatternSequence(b.pattern, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      if (a.pattern.target !== b.pattern.target) {
        return a.pattern.target.localeCompare(b.pattern.target);
      }
      return a.pattern.label.localeCompare(b.pattern.label);
    })
    .map((entry) => entry.pattern);

const resolveFieldTarget = (fieldName: string): ProductValidationTarget | null => {
  if (fieldName.startsWith('name_')) return 'name';
  if (fieldName.startsWith('description_')) return 'description';
  return FIELD_TARGET_BY_NAME.get(fieldName) ?? null;
};

export const resolveFieldTargetAndLocale = (
  fieldName: string
): { target: ProductValidationTarget | null; locale: string | null } => {
  const localeMatch = /_(en|pl|de)$/i.exec(fieldName);
  return {
    target: resolveFieldTarget(fieldName),
    locale: localeMatch?.[1]?.toLowerCase() ?? null,
  };
};

export const isPatternLocaleMatch = (
  patternLocale: string | null,
  fieldLocale: string | null
): boolean => {
  if (patternLocale === null || patternLocale.length === 0) return true;
  if (fieldLocale === null || fieldLocale.length === 0) return false;
  return patternLocale.toLowerCase() === fieldLocale.toLowerCase();
};

export const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (field.length === 0 || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

export const isReplacementAllowedForField = (
  pattern: ProductValidationPattern,
  fieldName: string
): boolean => {
  const replacementFields = normalizeReplacementFields(pattern.replacementFields);
  if (replacementFields.length === 0) return true;
  return replacementFields.includes(fieldName);
};

export const hasPatternReplacementValue = (pattern: ProductValidationPattern): boolean =>
  pattern.replacementEnabled === true &&
  typeof pattern.replacementValue === 'string' &&
  pattern.replacementValue.length > 0;

const hasPatternFormatterAutoApplyBaseConfig = (
  pattern: ProductValidationPattern,
  validationScope: ProductValidationInstanceScope
): boolean => {
  if (pattern.enabled !== true) return false;
  if (pattern.replacementAutoApply !== true) return false;
  if (!hasPatternReplacementValue(pattern)) return false;
  if (!isPatternEnabledForValidationScope(pattern.appliesToScopes, validationScope)) return false;
  return isPatternReplacementEnabledForValidationScope(
    pattern.replacementAppliesToScopes,
    validationScope
  );
};

const doesPatternFormatterAutoApplyMatchField = (
  pattern: ProductValidationPattern,
  fieldName: string
): boolean => {
  const { target, locale } = resolveFieldTargetAndLocale(fieldName);
  if (target === null) return false;
  if (pattern.target !== target) return false;
  if (!isPatternLocaleMatch(pattern.locale, locale)) return false;
  return isReplacementAllowedForField(pattern, fieldName);
};

export const isPatternConfiguredForFormatterAutoApply = ({
  pattern,
  fieldName,
  validationScope,
}: {
  pattern: ProductValidationPattern;
  fieldName: string;
  validationScope: ProductValidationInstanceScope;
}): boolean =>
  hasPatternFormatterAutoApplyBaseConfig(pattern, validationScope) &&
  doesPatternFormatterAutoApplyMatchField(pattern, fieldName);

const isSourceDrivenDimensionReplacementPattern = (
  pattern: ProductValidationPattern
): boolean => {
  const semanticState = getProductValidationSemanticState(pattern);
  return (
    semanticState?.operation ===
      PRODUCT_VALIDATION_SEMANTIC_OPERATION_IDS.validateNameContainsDimensionsToken &&
    (pattern.target === 'size_length' || pattern.target === 'length') &&
    hasPatternReplacementValue(pattern) &&
    pattern.launchEnabled === true &&
    pattern.launchSourceMode !== 'current_field'
  );
};

export const allowsPatternExecutionWithoutRegexMatch = (
  pattern: ProductValidationPattern
): boolean =>
  isSourceDrivenDimensionReplacementPattern(pattern) ||
  allowsProductValidationSemanticOperationExecutionWithoutRegexMatch(
    getProductValidationSemanticState(pattern)?.operation
  );

export const isLatestPriceStockMirrorPattern = (
  pattern: ProductValidationPattern
): boolean => {
  if (pattern.target !== 'price' && pattern.target !== 'stock') return false;
  const semanticState = getProductValidationSemanticState(pattern);
  return (
    allowsPatternExecutionWithoutRegexMatch(pattern) &&
    semanticState?.operation === 'mirror_latest_field' &&
    semanticState.sourceField === pattern.target &&
    semanticState.targetField === pattern.target
  );
};

export const isRuntimePatternEnabled = (pattern: ProductValidationPattern): boolean =>
  pattern.runtimeEnabled === true && pattern.runtimeType !== 'none';
