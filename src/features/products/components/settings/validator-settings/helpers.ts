import { PRODUCT_VALIDATION_REPLACEMENT_FIELDS } from '@/features/products/constants';
import {
  encodeDynamicReplacementRecipe,
  parseDynamicReplacementRecipe,
  type DynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import type {
  ProductValidationPattern,
  ProductValidationPatternFormDataDto as PatternFormData,
  SequenceGroupView,
} from '@/shared/contracts/products';

export const EMPTY_FORM: PatternFormData = {
  label: '',
  target: 'name',
  locale: '',
  regex: '',
  flags: '',
  message: '',
  severity: 'error',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: '',
  replacementFields: [],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  postAcceptBehavior: 'revalidate',
  denyBehaviorOverride: 'inherit',
  validationDebounceMs: '0',
  replacementMode: 'static',
  sourceMode: 'current_field',
  sourceField: '',
  sourceRegex: '',
  sourceFlags: '',
  sourceMatchGroup: '',
  launchEnabled: false,
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: '',
  launchOperator: 'equals',
  launchValue: '',
  launchFlags: '',
  mathOperation: 'none',
  mathOperand: '1',
  roundMode: 'none',
  padLength: '',
  padChar: '0',
  logicOperator: 'none',
  logicOperand: '',
  logicFlags: '',
  logicWhenTrueAction: 'keep',
  logicWhenTrueValue: '',
  logicWhenFalseAction: 'keep',
  logicWhenFalseValue: '',
  resultAssembly: 'segment_only',
  targetApply: 'replace_matched_segment',
  sequenceGroupId: '',
  sequence: '',
  chainMode: 'continue',
  maxExecutions: '1',
  passOutputToNext: true,
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: '',
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
};

export const REPLACEMENT_FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  ean: 'EAN',
  gtin: 'GTIN',
  asin: 'ASIN',
  price: 'Price',
  stock: 'Stock',
  categoryId: 'Category',
  weight: 'Weight',
  sizeLength: 'Size Length',
  sizeWidth: 'Size Width',
  length: 'Height',
  name_en: 'Name (EN)',
  name_pl: 'Name (PL)',
  name_de: 'Name (DE)',
  description_en: 'Description (EN)',
  description_pl: 'Description (PL)',
  description_de: 'Description (DE)',
};

export const REPLACEMENT_FIELD_OPTIONS = PRODUCT_VALIDATION_REPLACEMENT_FIELDS.map((field) => ({
  value: field,
  label: REPLACEMENT_FIELD_LABELS[field] ?? field,
}));

const SOURCE_FIELD_OPTIONS = [
  ...REPLACEMENT_FIELD_OPTIONS,
  { value: 'primaryCatalogId', label: 'Primary Catalog ID' },
  { value: 'categoryName', label: 'Category Name' },
  { value: 'nameEnSegment4', label: 'Name EN Segment #4' },
  {
    value: 'nameEnSegment4RegexEscaped',
    label: 'Name EN Segment #4 (Regex Escaped)',
  },
];

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.normalizereplacementfields
 */
export const normalizeReplacementFields = (
  fields: string[] | null | undefined,
  _target?: string
): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.formatreplacementfields
 */
export const formatReplacementFields = (fields: string[] | null | undefined): string => {
  const normalized = normalizeReplacementFields(fields);
  if (normalized.length === 0) return 'all matching fields';
  return normalized.map((field) => REPLACEMENT_FIELD_LABELS[field] ?? field).join(', ');
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getreplacementfieldsfortarget
 */
export const getReplacementFieldsForTarget = (
  target: string
): Array<{ value: string; label: string }> => {
  let fields: string[];
  if (target === 'name') {

    fields = PRODUCT_VALIDATION_REPLACEMENT_FIELDS.filter((field) => field.startsWith('name_'));
  } else if (target === 'description') {
    fields = PRODUCT_VALIDATION_REPLACEMENT_FIELDS.filter((field) =>
      field.startsWith('description_')
    );
  } else if (target === 'price') {
    fields = ['price'];
  } else if (target === 'stock') {
    fields = ['stock'];
  } else if (target === 'category') {
    fields = ['categoryId'];
  } else if (target === 'weight') {
    fields = ['weight'];
  } else if (target === 'size_length') {
    fields = ['sizeLength'];
  } else if (target === 'size_width') {
    fields = ['sizeWidth'];
  } else if (target === 'length') {
    fields = ['length'];
  } else {
    fields = ['sku'];
  }

  return fields.map((field) => ({
    value: field,
    label: REPLACEMENT_FIELD_LABELS[field] ?? field,
  }));
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.islocaletarget
 */
export const isLocaleTarget = (target: string): boolean =>
  target === 'name' || target === 'description';

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.islatestfieldmirrorpattern
 */
export const isLatestFieldMirrorPattern = (
  pattern: ProductValidationPattern,
  field: 'price' | 'stock'
): boolean => {
  if (pattern.target !== field) return false;
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'latest_product_field' &&
    recipe.sourceField === field &&
    recipe.targetApply === 'replace_whole_field'
  );
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.isnamesecondsegmentdimensionpattern
 */
export const isNameSecondSegmentDimensionPattern = (
  pattern: ProductValidationPattern,
  target: 'size_length' | 'length'
): boolean => {
  if (pattern.target !== target) return false;
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'form_field' &&
    recipe.sourceField === 'name_en' &&
    recipe.targetApply === 'replace_whole_field'
  );
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getsourcefieldoptionsfortarget
 */
export const getSourceFieldOptionsForTarget = (
  _target: string
): Array<{ value: string; label: string }> => {
  return SOURCE_FIELD_OPTIONS;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.builddynamicrecipefromform
 */
export const buildDynamicRecipeFromForm = (
  formData: PatternFormData
): DynamicReplacementRecipe | null => {
  if (
    (formData.sourceMode === 'form_field' || formData.sourceMode === 'latest_product_field') &&
    !formData.sourceField.trim()
  ) {
    return null;
  }
  const parsedOperand = Number(formData.mathOperand);
  const parsedPadLength = Number(formData.padLength);

  return {
    version: 1,
    sourceMode: formData.sourceMode,
    sourceField: formData.sourceField.trim() || null,
    sourceRegex: formData.sourceRegex.trim() || null,
    sourceFlags: formData.sourceFlags.trim() || null,
    sourceMatchGroup:
      formData.sourceMatchGroup.trim().length > 0 &&
      Number.isFinite(Number(formData.sourceMatchGroup)) &&
      Number(formData.sourceMatchGroup) >= 0
        ? Math.floor(Number(formData.sourceMatchGroup))
        : null,
    mathOperation: formData.mathOperation,
    mathOperand: Number.isFinite(parsedOperand) ? parsedOperand : null,
    roundMode: formData.roundMode,
    padLength:
      Number.isFinite(parsedPadLength) && parsedPadLength > 0
        ? Math.floor(parsedPadLength)
        : null,
    padChar: formData.padChar || null,
    logicOperator: formData.logicOperator,
    logicOperand: formData.logicOperand,
    logicFlags: formData.logicFlags,
    logicWhenTrueAction: formData.logicWhenTrueAction,
    logicWhenTrueValue: formData.logicWhenTrueValue,
    logicWhenFalseAction: formData.logicWhenFalseAction,
    logicWhenFalseValue: formData.logicWhenFalseValue,
    resultAssembly: formData.resultAssembly,
    targetApply: formData.targetApply,
  };
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.buildlatestfieldrecipe
 */
export const buildLatestFieldRecipe = (field: 'price' | 'stock'): string =>
  encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'latest_product_field',
    sourceField: field,
    sourceRegex: null,
    sourceFlags: null,
    sourceMatchGroup: null,
    mathOperation: 'none',
    mathOperand: null,
    roundMode: 'none',
    padLength: null,
    padChar: null,
    logicOperator: 'none',
    logicOperand: null,
    logicFlags: null,
    logicWhenTrueAction: 'keep',
    logicWhenTrueValue: null,
    logicWhenFalseAction: 'keep',
    logicWhenFalseValue: null,
    resultAssembly: 'segment_only',
    targetApply: 'replace_whole_field',
  });

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.buildduplicatelabel
 */
export const buildDuplicateLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim() || 'Pattern';
  const base = `${trimmed} (copy)`;
  let candidate = base;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${base} ${counter}`;
    counter += 1;
  }
  return candidate;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.builduniquelabel
 */
export const buildUniqueLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim() || 'Pattern';
  let candidate = trimmed;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${trimmed} ${counter}`;
    counter += 1;
  }
  return candidate;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getpatternsequence
 */
export const getPatternSequence = (pattern: ProductValidationPattern, fallbackIndex: number): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getsequencegroupid
 */
export const getSequenceGroupId = (pattern: ProductValidationPattern): string | null => {
  const value = pattern.sequenceGroupId?.trim();
  return value ? value : null;
};

const getSequenceScopeKey = (pattern: ProductValidationPattern): string | null => {
  const groupId = getSequenceGroupId(pattern);
  if (!groupId) return null;
  const normalizedLocale = pattern.locale?.trim().toLowerCase() ?? '*';
  return `${groupId}::${pattern.target}::${normalizedLocale}`;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.sortpatternsbysequence
 */
export const sortPatternsBySequence = (
  patterns: ProductValidationPattern[]
): ProductValidationPattern[] =>
  patterns
    .map((pattern: ProductValidationPattern, index: number) => ({ pattern, index }))
    .sort((a, b) => {
      const aSeq = getPatternSequence(a.pattern, a.index);
      const bSeq = getPatternSequence(b.pattern, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      if (a.pattern.target !== b.pattern.target) {
        return a.pattern.target.localeCompare(b.pattern.target);
      }
      return a.pattern.label.localeCompare(b.pattern.label);
    })
    .map((entry) => entry.pattern);

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.reorderpatterns
 */
export const reorderPatterns = (
  patterns: ProductValidationPattern[],
  draggedId: string,
  targetId: string
): ProductValidationPattern[] | null => {
  if (draggedId === targetId) return null;
  const fromIndex = patterns.findIndex((pattern) => pattern.id === draggedId);
  const targetIndex = patterns.findIndex((pattern) => pattern.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return null;

  let insertIndex = targetIndex + 1;
  if (fromIndex < insertIndex) {
    insertIndex -= 1;
  }
  if (insertIndex === fromIndex) return null;

  const next = [...patterns];
  const [dragged] = next.splice(fromIndex, 1);
  if (!dragged) return null;
  next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, dragged);
  return next;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.createsequencegroupid
 */
export const createSequenceGroupId = (): string => {
  const random = Math.random().toString(36).slice(2, 8);
  return `seq_${Date.now().toString(36)}_${random}`;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.normalizesequencegroupdebouncems
 */
export const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.cancompileregex
 */
export const canCompileRegex = (pattern: string, flags: string): boolean => {
  try {
    void new RegExp(pattern, flags || undefined);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.buildsequencegroups
 */
export const buildSequenceGroups = (
  patterns: ProductValidationPattern[]
): Map<string, SequenceGroupView> => {
  const sequenceScopeCounts = new Map<string, number>();
  for (const pattern of patterns) {
    if (!pattern.enabled) continue;
    const scopeKey = getSequenceScopeKey(pattern);
    if (!scopeKey) continue;
    sequenceScopeCounts.set(scopeKey, (sequenceScopeCounts.get(scopeKey) ?? 0) + 1);
  }

  const groups = new Map<string, SequenceGroupView>();
  for (const pattern of patterns) {
    const groupId = getSequenceGroupId(pattern);
    if (!groupId) continue;
    const scopeKey = getSequenceScopeKey(pattern);
    if (!scopeKey || (sequenceScopeCounts.get(scopeKey) ?? 0) <= 1) continue;
    const current = groups.get(groupId);
    if (current) {
      current.patternIds.push(pattern.id);
      if (!current.label && pattern.sequenceGroupLabel?.trim()) {
        current.label = pattern.sequenceGroupLabel.trim();
      }
      continue;
    }
    groups.set(groupId, {
      id: groupId,
      label: pattern.sequenceGroupLabel?.trim() || 'Sequence / Group',
      debounceMs: normalizeSequenceGroupDebounceMs(pattern.sequenceGroupDebounceMs),
      patternIds: [pattern.id],
    });
  }
  return groups;
};
